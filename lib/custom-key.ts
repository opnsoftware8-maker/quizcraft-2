export const CUSTOM_KEY_STORAGE_KEY = "quizcraft_custom_gemini_key";

export function getStoredCustomApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const val = localStorage.getItem(CUSTOM_KEY_STORAGE_KEY);
    return val && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
}

export function setStoredCustomApiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(CUSTOM_KEY_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(CUSTOM_KEY_STORAGE_KEY);
    }
  } catch {}
}

export function removeStoredCustomApiKey(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CUSTOM_KEY_STORAGE_KEY);
  } catch {}
}

export const GEMINI_API_KEY_FORMAT_REGEX =
  /^(?:AIza[A-Za-z0-9._+/-]{10,}|AQ\.[A-Za-z0-9._+/-]{10,})$/;

export function isValidGeminiApiKeyFormat(key: string): boolean {
  const trimmed = key.trim();
  if (!trimmed || trimmed.length > 512 || /\s/.test(trimmed)) {
    return false;
  }
  return GEMINI_API_KEY_FORMAT_REGEX.test(trimmed);
}

export function getCustomApiHeaders(explicitKey?: string | null): Record<string, string> {
  const key = explicitKey !== undefined ? explicitKey : getStoredCustomApiKey();
  if (key && key.trim()) {
    return { "x-gemini-api-key": key.trim() };
  }
  return {};
}
