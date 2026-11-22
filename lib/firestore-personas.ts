import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
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

export const MAX_PERSONA_NAME_LENGTH = 60;
export const MAX_PERSONA_DESCRIPTION_LENGTH = 600;
export const MAX_PERSONA_IMAGE_LENGTH = 60000;
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
  const cleaned = description.trim();
  if (!cleaned) return " ";
  return cleaned.length > MAX_PERSONA_DESCRIPTION_LENGTH
    ? cleaned.slice(0, MAX_PERSONA_DESCRIPTION_LENGTH)
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

/**
 * Compresses and center-crops a user-selected image file into a square JPEG data URL
 * safely within Firestore document size and security rule bounds (< 60 KB).
 */
export async function processPersonaAvatarFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("INVALID_IMAGE_TYPE");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
      el.src = objectUrl;
    });

    const renderSquare = (size: number, quality: number): string => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("CANVAS_UNAVAILABLE");

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, size, size);

      const minDim = Math.min(img.naturalWidth || size, img.naturalHeight || size);
      const sx = ((img.naturalWidth || size) - minDim) / 2;
      const sy = ((img.naturalHeight || size) - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
      return canvas.toDataURL("image/jpeg", quality);
    };

    const attempts: Array<[number, number]> = [
      [160, 0.82],
      [144, 0.74],
      [128, 0.65],
      [96, 0.58],
    ];

    for (const [size, quality] of attempts) {
      const dataUrl = renderSquare(size, quality);
      if (
        dataUrl.length <= MAX_PERSONA_IMAGE_LENGTH &&
        SAFE_DATA_IMAGE_PATTERN.test(dataUrl)
      ) {
        return dataUrl;
      }
    }

    throw new Error("IMAGE_COMPRESS_FAILED");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function createPersonaInFirestore(params: {
  userId: string;
  name: string;
  description: string;
  profileImage?: string;
}): Promise<string> {
  const uid = assertSafeId(params.userId);
  const pid = makeSafeFirestoreId("persona");
  const path = `users/${uid}/personas/${pid}`;

  try {
    const ref = doc(db, "users", uid, "personas", pid);
    await setDoc(ref, {
      id: pid,
      userId: uid,
      name: clampPersonaName(params.name),
      description: clampPersonaDescription(params.description),
      profileIcon: "user",
      profileImage: normalizePersonaImage(params.profileImage),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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

export async function deletePersonaInFirestore(params: {
  userId: string;
  personaId: string;
}): Promise<void> {
  const uid = assertSafeId(params.userId);
  const pid = assertSafeId(params.personaId);
  const path = `users/${uid}/personas/${pid}`;

  try {
    const ref = doc(db, "users", uid, "personas", pid);
    await deleteDoc(ref);
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
