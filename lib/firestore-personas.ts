import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { makeSafeFirestoreId } from "@/lib/firestore-chat";

export type PersonaIconKey =
  | "user"
  | "graduation-cap"
  | "book-open"
  | "glasses"
  | "compass"
  | "feather"
  | "award";

export const PERSONA_ICON_KEYS: PersonaIconKey[] = [
  "user",
  "graduation-cap",
  "book-open",
  "glasses",
  "compass",
  "feather",
  "award",
];

export const STARTER_PERSONA_IDS = [
  "starter-patient-tutor",
  "starter-exam-mentor",
  "starter-socratic-coach",
];

export interface AiPersona {
  id: string;
  userId: string;
  name: string;
  description: string;
  profileIcon: PersonaIconKey;
  profileImage: string;
  createdAtMs: number;
}

export interface AiEmotion {
  id: string;
  userId: string;
  personaId: string;
  label: string;
  image: string;
  createdAtMs: number;
}

export interface EmotionDraft {
  id?: string;
  label: string;
  image: string;
}

export const DEFAULT_PERSONA_KEY = "default";
export const MAX_PERSONA_NAME_LENGTH = 120;
export const MAX_PERSONA_DESCRIPTION_LENGTH = 50000;
export const MAX_PERSONA_IMAGE_LENGTH = 60000;
export const MAX_EMOTION_LABEL_LENGTH = 80;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const SAFE_DATA_IMAGE_PATTERN =
  /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

function assertSafeId(id: string): string {
  if (SAFE_ID_PATTERN.test(id)) return id;
  return (
    id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128) ||
    makeSafeFirestoreId("id")
  );
}

export function clampPersonaName(name: string): string {
  const cleaned = name.replace(/\s+/g, " ").trim();
  if (!cleaned) return " ";
  return cleaned.length > MAX_PERSONA_NAME_LENGTH
    ? cleaned.slice(0, MAX_PERSONA_NAME_LENGTH)
    : cleaned;
}

export function clampPersonaDescription(description: string): string {
  const cleaned = description.replace(/\r\n?/g, "\n").trim();
  if (!cleaned) return " ";
  return cleaned.length > MAX_PERSONA_DESCRIPTION_LENGTH
    ? cleaned.slice(0, MAX_PERSONA_DESCRIPTION_LENGTH)
    : cleaned;
}

export function clampEmotionLabel(label: string): string {
  const cleaned = label.replace(/\s+/g, " ").trim();
  if (!cleaned) return " ";
  return cleaned.length > MAX_EMOTION_LABEL_LENGTH
    ? cleaned.slice(0, MAX_EMOTION_LABEL_LENGTH)
    : cleaned;
}

export function normalizePersonaIcon(icon: unknown): PersonaIconKey {
  if (
    typeof icon === "string" &&
    (PERSONA_ICON_KEYS as string[]).includes(icon)
  ) {
    return icon as PersonaIconKey;
  }
  return "user";
}

export function normalizePersonaImage(image: unknown): string {
  if (typeof image !== "string") return "";
  const trimmed = image.trim();
  if (!trimmed) return "";
  if (
    trimmed.length <= MAX_PERSONA_IMAGE_LENGTH &&
    SAFE_DATA_IMAGE_PATTERN.test(trimmed)
  ) {
    return trimmed;
  }
  return "";
}

const IMAGE_FILE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "avif",
  "svg",
  "heic",
  "heif",
  "jfif",
]);

const KNOWN_NON_IMAGE_EXTENSIONS = new Set([
  "pdf",
  "txt",
  "md",
  "csv",
  "json",
  "zip",
  "rar",
  "7z",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "mp3",
  "wav",
  "mp4",
  "mov",
  "avi",
  "mkv",
  "exe",
  "dmg",
]);

function getFileExtension(name: string): string {
  const parts = name.toLowerCase().trim().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function isLikelyImageFile(file: File): boolean {
  const mime = (file.type || "").toLowerCase().trim();
  if (mime.startsWith("image/")) return true;
  const ext = getFileExtension(file.name || "");
  if (IMAGE_FILE_EXTENSIONS.has(ext)) return true;
  if (KNOWN_NON_IMAGE_EXTENSIONS.has(ext)) return false;
  // Android/Google Drive/some mobile browsers supply empty MIME or application/octet-stream for photos
  return mime === "" || mime === "application/octet-stream";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result.length > 0) {
        resolve(reader.result);
      } else {
        reject(new Error("IMAGE_LOAD_FAILED"));
      }
    };
    reader.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    reader.readAsDataURL(file);
  });
}

function loadHtmlImageFromSrc(src: string, timeoutMs = 15000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new window.Image();
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("IMAGE_LOAD_FAILED"));
      }
    }, timeoutMs);

    el.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(el);
    };
    el.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(new Error("IMAGE_LOAD_FAILED"));
    };
    el.src = src;
  });
}

interface DecodedImageSource {
  width: number;
  height: number;
  drawToCanvas: (ctx: CanvasRenderingContext2D, sx: number, sy: number, sw: number, sh: number, dw: number, dh: number) => void;
  cleanup: () => void;
}

async function decodeImageFile(file: File): Promise<DecodedImageSource> {
  // Strategy 1: Native createImageBitmap (fastest, handles EXIF orientation natively, low memory)
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width > 0 && bitmap.height > 0) {
        return {
          width: bitmap.width,
          height: bitmap.height,
          drawToCanvas: (ctx, sx, sy, sw, sh, dw, dh) => {
            ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);
          },
          cleanup: () => {
            try {
              bitmap.close();
            } catch {
              // ignore
            }
          },
        };
      }
      bitmap.close();
    } catch {
      // Fall through to HTMLImageElement strategies
    }
  }

  // Strategy 2: ObjectURL + HTMLImageElement
  let objectUrl = "";
  try {
    objectUrl = URL.createObjectURL(file);
    const img = await loadHtmlImageFromSrc(objectUrl);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (width > 0 && height > 0) {
      return {
        width,
        height,
        drawToCanvas: (ctx, sx, sy, sw, sh, dw, dh) => {
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
        },
        cleanup: () => {
          URL.revokeObjectURL(objectUrl);
        },
      };
    }
    URL.revokeObjectURL(objectUrl);
    objectUrl = "";
  } catch {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = "";
    }
  }

  // Strategy 3: FileReader DataURL + HTMLImageElement (works on Android content:// URIs & strict WebViews)
  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadHtmlImageFromSrc(rawDataUrl);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (width <= 0 || height <= 0) {
    throw new Error("IMAGE_LOAD_FAILED");
  }
  return {
    width,
    height,
    drawToCanvas: (ctx, sx, sy, sw, sh, dw, dh) => {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    },
    cleanup: () => {},
  };
}

/**
 * Compresses and center-crops a user-selected image file into a square JPEG/WebP data URL
 * safely within Firestore document size and security rule bounds (< 60 KB).
 */
export async function processPersonaAvatarFile(file: File): Promise<string> {
  if (!file || file.size <= 0) {
    throw new Error("IMAGE_LOAD_FAILED");
  }
  if (!isLikelyImageFile(file)) {
    throw new Error("INVALID_IMAGE_TYPE");
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  let decoded: DecodedImageSource;
  try {
    decoded = await decodeImageFile(file);
  } catch {
    throw new Error(
      file.type && !file.type.startsWith("image/")
        ? "INVALID_IMAGE_TYPE"
        : "IMAGE_LOAD_FAILED"
    );
  }

  try {
    const renderSquare = (
      size: number,
      mime: "image/jpeg" | "image/webp",
      quality: number
    ): string => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("CANVAS_UNAVAILABLE");

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const minDim = Math.min(decoded.width, decoded.height);
      const sx = Math.max(0, (decoded.width - minDim) / 2);
      const sy = Math.max(0, (decoded.height - minDim) / 2);

      decoded.drawToCanvas(ctx, sx, sy, minDim, minDim, size, size);
      return canvas.toDataURL(mime, quality);
    };

    const attempts: Array<[number, "image/jpeg" | "image/webp", number]> = [
      [192, "image/jpeg", 0.85],
      [160, "image/jpeg", 0.82],
      [144, "image/jpeg", 0.76],
      [128, "image/webp", 0.74],
      [128, "image/jpeg", 0.68],
      [112, "image/webp", 0.66],
      [96, "image/jpeg", 0.62],
      [96, "image/webp", 0.56],
      [72, "image/jpeg", 0.52],
      [64, "image/jpeg", 0.45],
    ];

    for (const [size, mime, quality] of attempts) {
      const dataUrl = renderSquare(size, mime, quality);
      if (
        dataUrl.length > 32 &&
        dataUrl.length <= MAX_PERSONA_IMAGE_LENGTH &&
        SAFE_DATA_IMAGE_PATTERN.test(dataUrl)
      ) {
        return dataUrl;
      }
    }

    throw new Error("IMAGE_COMPRESS_FAILED");
  } finally {
    decoded.cleanup();
  }
}

export async function createPersonaInFirestore(params: {
  userId: string;
  name: string;
  description: string;
  profileImage?: string;
  emotions?: EmotionDraft[];
}): Promise<string> {
  const uid = assertSafeId(params.userId);
  const pid = makeSafeFirestoreId("persona");
  const path = `users/${uid}/personas/${pid}`;
  const validEmotions = (params.emotions || []).filter(
    (em) => em.label.trim().length > 0
  );

  try {
    const personaRef = doc(db, "users", uid, "personas", pid);
    const firstBatch = writeBatch(db);
    firstBatch.set(personaRef, {
      id: pid,
      userId: uid,
      name: clampPersonaName(params.name),
      description: clampPersonaDescription(params.description),
      profileIcon: "user",
      profileImage: normalizePersonaImage(params.profileImage),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const firstChunk = validEmotions.slice(0, 400);
    for (const em of firstChunk) {
      const eid = makeSafeFirestoreId("emotion");
      const emRef = doc(db, "users", uid, "emotions", eid);
      firstBatch.set(emRef, {
        id: eid,
        userId: uid,
        personaId: pid,
        label: clampEmotionLabel(em.label),
        image: normalizePersonaImage(em.image),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await firstBatch.commit();

    // Support arbitrary number of emotions beyond a single 500-op Firestore batch
    for (let i = 400; i < validEmotions.length; i += 400) {
      const extraBatch = writeBatch(db);
      const chunk = validEmotions.slice(i, i + 400);
      for (const em of chunk) {
        const eid = makeSafeFirestoreId("emotion");
        const emRef = doc(db, "users", uid, "emotions", eid);
        extraBatch.set(emRef, {
          id: eid,
          userId: uid,
          personaId: pid,
          label: clampEmotionLabel(em.label),
          image: normalizePersonaImage(em.image),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await extraBatch.commit();
    }

    return pid;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updatePersonaInFirestore(params: {
  userId: string;
  personaId: string;
  name: string;
  description: string;
  profileImage?: string;
}): Promise<void> {
  const uid = assertSafeId(params.userId);
  const pid = assertSafeId(params.personaId);
  const path = `users/${uid}/personas/${pid}`;

  try {
    const ref = doc(db, "users", uid, "personas", pid);
    await updateDoc(ref, {
      name: clampPersonaName(params.name),
      description: clampPersonaDescription(params.description),
      profileIcon: "user",
      profileImage: normalizePersonaImage(params.profileImage),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncEmotionsForPersonaInFirestore(params: {
  userId: string;
  personaId: string;
  drafts: EmotionDraft[];
  existingEmotions: AiEmotion[];
}): Promise<void> {
  const uid = assertSafeId(params.userId);
  const pid = params.personaId === DEFAULT_PERSONA_KEY
    ? DEFAULT_PERSONA_KEY
    : assertSafeId(params.personaId);
  const path = `users/${uid}/emotions`;

  const existingForPersona = params.existingEmotions.filter(
    (e) => e.personaId === pid
  );
  const existingMap = new Map(existingForPersona.map((e) => [e.id, e]));

  const cleanDrafts = params.drafts.filter((d) => d.label.trim().length > 0);
  const keptIds = new Set(
    cleanDrafts.map((d) => d.id).filter((id): id is string => Boolean(id))
  );

  type BatchOp = () => {
    kind: "create" | "update" | "delete";
    eid: string;
    label?: string;
    image?: string;
  };
  const ops: BatchOp[] = [];

  for (const existing of existingForPersona) {
    if (!keptIds.has(existing.id)) {
      ops.push(() => ({ kind: "delete", eid: existing.id }));
    }
  }

  for (const draft of cleanDrafts) {
    const nextLabel = clampEmotionLabel(draft.label);
    const nextImage = normalizePersonaImage(draft.image);
    const existing = draft.id ? existingMap.get(draft.id) : undefined;
    if (existing) {
      if (existing.label !== nextLabel || existing.image !== nextImage) {
        ops.push(() => ({
          kind: "update",
          eid: existing.id,
          label: nextLabel,
          image: nextImage,
        }));
      }
    } else {
      const newId = makeSafeFirestoreId("emotion");
      ops.push(() => ({
        kind: "create",
        eid: newId,
        label: nextLabel,
        image: nextImage,
      }));
    }
  }

  if (ops.length === 0) return;

  try {
    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = ops.slice(i, i + 400);
      for (const makeOp of chunk) {
        const op = makeOp();
        const ref = doc(db, "users", uid, "emotions", op.eid);
        if (op.kind === "delete") {
          batch.delete(ref);
        } else if (op.kind === "update") {
          batch.update(ref, {
            label: op.label,
            image: op.image,
            updatedAt: serverTimestamp(),
          });
        } else {
          batch.set(ref, {
            id: op.eid,
            userId: uid,
            personaId: pid,
            label: op.label,
            image: op.image,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePersonaInFirestore(params: {
  userId: string;
  personaId: string;
  emotionIds?: string[];
}): Promise<void> {
  const uid = assertSafeId(params.userId);
  const pid = assertSafeId(params.personaId);
  const path = `users/${uid}/personas/${pid}`;
  const emotionIds = (params.emotionIds || []).map((id) => assertSafeId(id));

  try {
    if (emotionIds.length === 0) {
      const ref = doc(db, "users", uid, "personas", pid);
      await deleteDoc(ref);
      return;
    }

    const batch = writeBatch(db);
    batch.delete(doc(db, "users", uid, "personas", pid));
    for (const eid of emotionIds.slice(0, 400)) {
      batch.delete(doc(db, "users", uid, "emotions", eid));
    }
    await batch.commit();

    for (let i = 400; i < emotionIds.length; i += 400) {
      const extraBatch = writeBatch(db);
      for (const eid of emotionIds.slice(i, i + 400)) {
        extraBatch.delete(doc(db, "users", uid, "emotions", eid));
      }
      await extraBatch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function setActivePersonaInFirestore(params: {
  userId: string;
  activePersonaId: string;
}): Promise<void> {
  const uid = assertSafeId(params.userId);
  const safePersonaId = params.activePersonaId
    ? assertSafeId(params.activePersonaId)
    : "";
  const path = `users/${uid}`;

  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      activePersonaId: safePersonaId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
