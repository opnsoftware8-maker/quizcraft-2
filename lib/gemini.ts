import { GoogleGenAI } from "@google/genai";

let defaultAiClient: GoogleGenAI | null = null;

export function getAiClient(customApiKey?: string): GoogleGenAI {
  const key = customApiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("ไม่พบ Gemini API Key กรุณาระบุในหน้าต่างตั้งค่าหรือในระบบ");
  }

  // If a custom key is provided, create a client for that specific request
  if (customApiKey && customApiKey.trim()) {
    return new GoogleGenAI({
      apiKey: customApiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Otherwise reuse cached default system client
  if (!defaultAiClient) {
    defaultAiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return defaultAiClient;
}

export const ai = {
  get models() {
    return getAiClient().models;
  },
};

// Resilient model list: gemini-3.8-flash, gemini-3.6-flash, and gemini-flash-latest
export const TEXT_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

function isHighDemandError(error: any): boolean {
  const errStr = String(error?.message || error?.toString() || "");
  const code = error?.status || error?.code || error?.error?.code;
  return (
    code === 503 ||
    code === 429 ||
    errStr.includes("503") ||
    errStr.includes("429") ||
    errStr.includes("UNAVAILABLE") ||
    errStr.includes("high demand") ||
    errStr.includes("resource exhausted") ||
    errStr.includes("overloaded")
  );
}

export async function generateContentWithFallback(options: {
  contents: any;
  config?: any;
  models?: string[];
  apiKey?: string;
}) {
  const models = options.models && options.models.length > 0 ? options.models : TEXT_MODELS;
  let lastError: any = null;
  const client = getAiClient(options.apiKey);

  for (let m = 0; m < models.length; m++) {
    const model = models[m];
    try {
      const response = await client.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });

      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      lastError = err;

      // If high demand or unavailable on this model, immediately try next model without delay
      if (isHighDemandError(err)) {
        continue;
      }

      // If non-transient, continue to next model as fallback
      continue;
    }
  }

  // If all models failed, log error and throw user-friendly error
  console.error("All Gemini models failed to generate content:", lastError?.message || lastError);

  if (lastError && isHighDemandError(lastError)) {
    throw new Error(
      "โมเดล AI กำลังมีผู้ใช้งานหนาแน่นชั่วคราว (Model High Demand) กรุณากดปุ่มลองใหม่อีกครั้งในไม่กี่วินาที"
    );
  }

  // Provide helpful feedback if custom key is invalid
  const errMsg = String(lastError?.message || "");
  if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid") || errMsg.includes("400")) {
    throw new Error("Gemini API Key ไม่ถูกต้อง กรุณาตรวจสอบรหัส API Key ในหน้าต่างตั้งค่า");
  }

  throw lastError || new Error("ไม่สามารถประมวลผลผ่านระบบ AI ได้ กรุณาลองใหม่อีกครั้ง");
}
