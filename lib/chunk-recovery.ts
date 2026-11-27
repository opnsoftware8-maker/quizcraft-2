const CHUNK_RELOAD_STORAGE_KEY = "opensolver_chunk_reload_at";
const CHUNK_RELOAD_COOLDOWN_MS = 10_000;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name =
    typeof error === "object" && "name" in error
      ? String((error as { name?: unknown }).name || "")
      : "";
  const message =
    typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : String(error);

  return (
    name === "ChunkLoadError" ||
    /ChunkLoadError/i.test(message) ||
    /Loading chunk [\w.-]+ failed/i.test(message) ||
    /Loading CSS chunk [\w.-]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message)
  );
}

export function tryAutoRecoverChunkError(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const lastReloadRaw = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
    const lastReload = lastReloadRaw ? Number(lastReloadRaw) : 0;
    const now = Date.now();
    if (!Number.isFinite(lastReload) || now - lastReload > CHUNK_RELOAD_COOLDOWN_MS) {
      window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
      window.location.reload();
      return true;
    }
  } catch {
    // Ignore sessionStorage errors and skip automatic reload loop
  }
  return false;
}

export async function retryDynamicImport<T>(
  loader: () => Promise<T>,
  retries = 2,
  delayMs = 450
): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    if (isChunkLoadError(error)) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return retryDynamicImport(loader, retries - 1, Math.round(delayMs * 1.5));
      }
      if (tryAutoRecoverChunkError()) {
        return new Promise<T>(() => {});
      }
    }
    throw error;
  }
}
