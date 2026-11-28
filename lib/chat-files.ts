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
export const MAX_RAW_FILE_BYTES = 10 * 1024 * 1024; // 10 MB for docs/text
export const MAX_RAW_IMAGE_BYTES = 25 * 1024 * 1024; // 25 MB for phone photos (compressed before send)
export const MAX_PDF_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_TEXT_FILE_CHARS = 100000;

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "avif",
  "heic",
  "heif",
  "jfif",
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
  const parts = name.toLowerCase().trim().split(".");
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
      if (typeof reader.result === "string" && reader.result.length > 0) {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as data URL"));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("File read error"));
    reader.readAsDataURL(file);
  });
}

function readAsTextSafe(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => reject(reader.error || new Error("Text read error"));
    reader.readAsText(file);
  });
}

function extractBase64FromDataUrl(dataUrl: string): string {
  const commaIdx = dataUrl.indexOf(",");
  return commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
}

function loadHtmlImageFromSrc(
  src: string,
  timeoutMs = 15000
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new window.Image();
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Image load timeout"));
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
      reject(new Error("Image decode failed"));
    };
    el.src = src;
  });
}

async function optimizeImageForChat(file: File): Promise<{
  mimeType: string;
  base64Data: string;
  previewUrl: string;
}> {
  const ext = getExtension(file.name || "");
  const fallbackMime =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "gif"
          ? "image/gif"
          : ext === "heic"
            ? "image/heic"
            : ext === "heif"
              ? "image/heif"
              : "image/jpeg";
  const rawMime =
    file.type && file.type.startsWith("image/") ? file.type : fallbackMime;

  // Keep reasonably sized standard images untouched to preserve crispness & respond instantaneously
  const shouldKeepOriginal =
    file.size <= 1.2 * 1024 * 1024 &&
    (rawMime === "image/png" ||
      rawMime === "image/jpeg" ||
      rawMime === "image/webp" ||
      rawMime === "image/gif");

  if (shouldKeepOriginal || typeof window === "undefined") {
    const rawDataUrl = await readAsDataUrl(file);
    return {
      mimeType: rawMime,
      base64Data: extractBase64FromDataUrl(rawDataUrl),
      previewUrl: rawDataUrl,
    };
  }

  // Decode via createImageBitmap first (handles EXIF orientation & avoids multi-MB base64 intermediate)
  let bitmap: ImageBitmap | null = null;
  let objectUrl = "";
  let imgEl: HTMLImageElement | null = null;

  try {
    if (typeof createImageBitmap === "function") {
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        bitmap = null;
      }
    }

    if (!bitmap) {
      try {
        objectUrl = URL.createObjectURL(file);
        imgEl = await loadHtmlImageFromSrc(objectUrl);
      } catch {
        imgEl = null;
      }
    }

    const sourceW = bitmap
      ? bitmap.width
      : imgEl
        ? imgEl.naturalWidth || imgEl.width
        : 0;
    const sourceH = bitmap
      ? bitmap.height
      : imgEl
        ? imgEl.naturalHeight || imgEl.height
        : 0;

    if (sourceW > 0 && sourceH > 0) {
      const maxDim = 1800;
      let targetW = sourceW;
      let targetH = sourceH;

      if (targetW > maxDim || targetH > maxDim) {
        const scale = Math.min(maxDim / targetW, maxDim / targetH);
        targetW = Math.max(1, Math.round(targetW * scale));
        targetH = Math.max(1, Math.round(targetH * scale));
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        if (bitmap) {
          ctx.drawImage(bitmap, 0, 0, targetW, targetH);
        } else if (imgEl) {
          ctx.drawImage(imgEl, 0, 0, targetW, targetH);
        }

        const outputMime =
          rawMime === "image/png" && file.size <= 2 * 1024 * 1024
            ? "image/png"
            : "image/jpeg";
        const compressedUrl = canvas.toDataURL(outputMime, 0.86);

        if (
          compressedUrl.startsWith("data:image/") &&
          compressedUrl.length > 32
        ) {
          return {
            mimeType: outputMime,
            base64Data: extractBase64FromDataUrl(compressedUrl),
            previewUrl: compressedUrl,
          };
        }
      }
    }
  } finally {
    if (bitmap) {
      try {
        bitmap.close();
      } catch {
        // ignore
      }
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }

  // Last-resort fallback: send original image bytes directly
  const rawDataUrl = await readAsDataUrl(file);
  return {
    mimeType: rawMime,
    base64Data: extractBase64FromDataUrl(rawDataUrl),
    previewUrl: rawDataUrl,
  };
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
  if (remainingSlots === 0) {
    errors.push(
      language === "en"
        ? `You can attach up to ${MAX_CHAT_FILES} files per message.`
        : `แนบไฟล์ได้สูงสุด ${MAX_CHAT_FILES} รายการต่อข้อความ`
    );
    return { files, errors };
  }

  if (inputFiles.length > remainingSlots) {
    errors.push(
      language === "en"
        ? `You can attach up to ${MAX_CHAT_FILES} files per message.`
        : `แนบไฟล์ได้สูงสุด ${MAX_CHAT_FILES} รายการต่อข้อความ`
    );
  }

  const sliceToProcess = inputFiles.slice(0, remainingSlots);

  const results = await Promise.all(
    sliceToProcess.map(
      async (
        file
      ): Promise<
        | { ok: true; file: ChatUploadedFile }
        | { ok: false; error: string }
      > => {
        const fileName = file.name || "attachment";
        const ext = getExtension(fileName);
        const mime = (file.type || "").toLowerCase().trim();
        const isImage = mime.startsWith("image/") || IMAGE_EXTENSIONS.has(ext);
        const isPdf = mime === "application/pdf" || ext === "pdf";
        const isText =
          mime.startsWith("text/") ||
          mime === "application/json" ||
          mime === "application/xml" ||
          TEXT_EXTENSIONS.has(ext);

        if (!isImage && !isPdf && !isText) {
          return {
            ok: false,
            error:
              language === "en"
                ? `"${fileName}" is not supported yet. Please upload images, PDFs, or text files (.txt, .md, .csv, code).`
                : `ยังไม่รองรับไฟล์ "${fileName}" กรุณาอัปโหลดรูปภาพ, PDF หรือไฟล์ข้อความ (.txt, .md, .csv, โค้ด)`,
          };
        }

        if (file.size <= 0) {
          return {
            ok: false,
            error:
              language === "en"
                ? `"${fileName}" appears to be empty or unreadable.`
                : `ไฟล์ "${fileName}" ไม่มีข้อมูลหรือไม่สามารถอ่านได้`,
          };
        }

        const maxBytes = isImage ? MAX_RAW_IMAGE_BYTES : MAX_RAW_FILE_BYTES;
        if (file.size > maxBytes) {
          const limitMb = Math.round(maxBytes / (1024 * 1024));
          return {
            ok: false,
            error:
              language === "en"
                ? `"${fileName}" exceeds the ${limitMb} MB size limit.`
                : `ไฟล์ "${fileName}" มีขนาดเกิน ${limitMb} MB`,
          };
        }

        try {
          if (isImage) {
            const processed = await optimizeImageForChat(file);
            return {
              ok: true,
              file: {
                id: makeFileId(),
                name: fileName || "image.jpg",
                mimeType: processed.mimeType,
                size: file.size,
                kind: "image",
                base64Data: processed.base64Data,
                previewUrl: processed.previewUrl,
              },
            };
          }

          if (isPdf) {
            if (file.size > MAX_PDF_BYTES) {
              return {
                ok: false,
                error:
                  language === "en"
                    ? `PDF "${fileName}" exceeds the 8 MB limit.`
                    : `ไฟล์ PDF "${fileName}" มีขนาดเกิน 8 MB`,
              };
            }
            const dataUrl = await readAsDataUrl(file);
            return {
              ok: true,
              file: {
                id: makeFileId(),
                name: fileName || "document.pdf",
                mimeType: "application/pdf",
                size: file.size,
                kind: "pdf",
                base64Data: extractBase64FromDataUrl(dataUrl),
              },
            };
          }

          // Text-based files
          const rawText = await readAsTextSafe(file);
          return {
            ok: true,
            file: {
              id: makeFileId(),
              name: fileName || "notes.txt",
              mimeType: file.type || "text/plain",
              size: file.size,
              kind: "text",
              textContent: rawText.slice(0, MAX_TEXT_FILE_CHARS),
            },
          };
        } catch {
          return {
            ok: false,
            error:
              language === "en"
                ? `Could not read "${fileName}". Please try again.`
                : `ไม่สามารถอ่านไฟล์ "${fileName}" ได้ กรุณาลองใหม่อีกครั้ง`,
          };
        }
      }
    )
  );

  for (const res of results) {
    if (res.ok) {
      files.push(res.file);
    } else {
      errors.push(res.error);
    }
  }

  return { files, errors };
}
