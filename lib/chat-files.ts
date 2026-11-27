export type ChatFileKind = "image" | "pdf" | "text";

export interface ChatUploadedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: ChatFileKind;
  base64Data?: string;
  previewUrl?: string;
  textContent?: string;
}

export const MAX_CHAT_FILES = 5;
export const MAX_RAW_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PDF_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_TEXT_FILE_CHARS = 100000;

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "heic",
  "heif",
]);

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "xml",
  "html",
  "htm",
  "py",
  "js",
  "ts",
  "tsx",
  "jsx",
  "java",
  "c",
  "cpp",
  "h",
  "cs",
  "go",
  "rs",
  "sql",
  "yaml",
  "yml",
  "log",
  "tex",
]);

function getExtension(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function makeFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as data URL"));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("File read error"));
    reader.readAsDataURL(file);
  });
}

function extractBase64FromDataUrl(dataUrl: string): string {
  const commaIdx = dataUrl.indexOf(",");
  return commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
}

async function optimizeImageForChat(file: File): Promise<{
  mimeType: string;
  base64Data: string;
  previewUrl: string;
}> {
  const rawDataUrl = await readAsDataUrl(file);
  const rawMime = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";

  // Keep small images untouched to preserve crispness (unless HEIC/BMP)
  const shouldKeepOriginal =
    file.size <= 900 * 1024 &&
    (rawMime === "image/png" || rawMime === "image/jpeg" || rawMime === "image/webp");

  if (shouldKeepOriginal || typeof window === "undefined") {
    return {
      mimeType: rawMime,
      base64Data: extractBase64FromDataUrl(rawDataUrl),
      previewUrl: rawDataUrl,
    };
  }

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image decode failed"));
      el.src = rawDataUrl;
    });

    const maxDim = 1800;
    let targetW = img.naturalWidth || img.width;
    let targetH = img.naturalHeight || img.height;

    if (targetW > maxDim || targetH > maxDim) {
      const scale = Math.min(maxDim / targetW, maxDim / targetH);
      targetW = Math.max(1, Math.round(targetW * scale));
      targetH = Math.max(1, Math.round(targetH * scale));
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return {
        mimeType: rawMime,
        base64Data: extractBase64FromDataUrl(rawDataUrl),
        previewUrl: rawDataUrl,
      };
    }

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const outputMime = rawMime === "image/png" && file.size <= 1.8 * 1024 * 1024
      ? "image/png"
      : "image/jpeg";
    const compressedUrl = canvas.toDataURL(outputMime, 0.86);

    return {
      mimeType: outputMime,
      base64Data: extractBase64FromDataUrl(compressedUrl),
      previewUrl: compressedUrl,
    };
  } catch {
    return {
      mimeType: rawMime,
      base64Data: extractBase64FromDataUrl(rawDataUrl),
      previewUrl: rawDataUrl,
    };
  }
}

export async function processChatFileList(
  fileList: FileList | File[],
  language: "th" | "en",
  existingCount = 0
): Promise<{ files: ChatUploadedFile[]; errors: string[] }> {
  const inputFiles = Array.from(fileList);
  const files: ChatUploadedFile[] = [];
  const errors: string[] = [];

  const remainingSlots = Math.max(0, MAX_CHAT_FILES - existingCount);
  if (inputFiles.length > remainingSlots) {
    errors.push(
      language === "en"
        ? `You can attach up to ${MAX_CHAT_FILES} files per message.`
        : `แนบไฟล์ได้สูงสุด ${MAX_CHAT_FILES} รายการต่อข้อความ`
    );
  }

  const sliceToProcess = inputFiles.slice(0, remainingSlots);

  for (const file of sliceToProcess) {
    const ext = getExtension(file.name);
    const isImage = file.type.startsWith("image/") || IMAGE_EXTENSIONS.has(ext);
    const isPdf = file.type === "application/pdf" || ext === "pdf";
    const isText =
      file.type.startsWith("text/") ||
      file.type === "application/json" ||
      file.type === "application/xml" ||
      TEXT_EXTENSIONS.has(ext);

    if (!isImage && !isPdf && !isText) {
      errors.push(
        language === "en"
          ? `"${file.name}" is not supported yet. Please upload images, PDFs, or text files (.txt, .md, .csv, code).`
          : `ยังไม่รองรับไฟล์ "${file.name}" กรุณาอัปโหลดรูปภาพ, PDF หรือไฟล์ข้อความ (.txt, .md, .csv, โค้ด)`
      );
      continue;
    }

    if (file.size > MAX_RAW_FILE_BYTES) {
      errors.push(
        language === "en"
          ? `"${file.name}" exceeds the 10 MB size limit.`
          : `ไฟล์ "${file.name}" มีขนาดเกิน 10 MB`
      );
      continue;
    }

    if (isImage) {
      const processed = await optimizeImageForChat(file);
      files.push({
        id: makeFileId(),
        name: file.name || "image.jpg",
        mimeType: processed.mimeType,
        size: file.size,
        kind: "image",
        base64Data: processed.base64Data,
        previewUrl: processed.previewUrl,
      });
      continue;
    }

    if (isPdf) {
      if (file.size > MAX_PDF_BYTES) {
        errors.push(
          language === "en"
            ? `PDF "${file.name}" exceeds the 8 MB limit.`
            : `ไฟล์ PDF "${file.name}" มีขนาดเกิน 8 MB`
        );
        continue;
      }
      const dataUrl = await readAsDataUrl(file);
      files.push({
        id: makeFileId(),
        name: file.name || "document.pdf",
        mimeType: "application/pdf",
        size: file.size,
        kind: "pdf",
        base64Data: extractBase64FromDataUrl(dataUrl),
      });
      continue;
    }

    // Text-based files
    const rawText = await file.text();
    files.push({
      id: makeFileId(),
      name: file.name || "notes.txt",
      mimeType: file.type || "text/plain",
      size: file.size,
      kind: "text",
      textContent: rawText.slice(0, MAX_TEXT_FILE_CHARS),
    });
  }

  return { files, errors };
}
