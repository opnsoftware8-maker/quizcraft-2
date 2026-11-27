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

// Primary cost-efficient production model: gemini-3.1-flash-lite with resilient fallbacks
export const TEXT_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-4-hydrogen",
  "gemini-flash-latest",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorInfo(error: any): { msg: string; lower: string; code: unknown } {
  const msg = String(error?.message || error?.toString() || "");
  const code = error?.status || error?.code || error?.error?.code;
  return { msg, lower: msg.toLowerCase(), code };
}

export function isHighDemandError(error: any): boolean {
  const { lower, code } = getErrorInfo(error);
  return (
    code === 503 ||
    code === 429 ||
    lower.includes("503") ||
    lower.includes("429") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("resource_exhausted") ||
    lower.includes("resource exhausted") ||
    lower.includes("too many requests") ||
    lower.includes("overloaded") ||
    lower.includes("quota")
  );
}

function isAuthOrKeyError(error: any): boolean {
  const { lower, code } = getErrorInfo(error);
  return (
    code === 401 ||
    code === 403 ||
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid") ||
    lower.includes("permission_denied") ||
    lower.includes("unauthenticated")
  );
}

export async function generateContentWithFallback(options: {
  contents: any;
  config?: any;
  models?: string[];
  apiKey?: string;
}) {
  const models =
    options.models && options.models.length > 0 ? options.models : TEXT_MODELS;
  let lastError: any = null;
  let lastHighDemandError: any = null;
  const client = getAiClient(options.apiKey);

  const retryDelaysMs = [0, 900, 1800];

  for (let pass = 0; pass < retryDelaysMs.length; pass++) {
    if (pass > 0) {
      if (!lastHighDemandError) break;
      const jitter = Math.floor(Math.random() * 250);
      await sleep(retryDelaysMs[pass] + jitter);
    }

    const passModels =
      pass === 0
        ? models
        : Array.from(
            new Set(
              [
                models[0],
                "gemini-3.1-flash-lite",
                "gemini-flash-latest",
                "gemini-4-hydrogen",
              ].filter((m): m is string => Boolean(m) && models.includes(m))
            )
          );

    for (let m = 0; m < passModels.length; m++) {
      const model = passModels[m];
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

        if (isAuthOrKeyError(err)) {
          pass = retryDelaysMs.length;
          break;
        }

        if (isHighDemandError(err)) {
          lastHighDemandError = err;
        }
      }
    }
  }

  const finalError = lastHighDemandError || lastError;
  console.warn(
    "All Gemini models failed to generate content:",
    finalError?.message || finalError
  );

  if (finalError && isAuthOrKeyError(finalError)) {
    throw new Error(
      "Gemini API Key ไม่ถูกต้องหรือไม่มีสิทธิ์เข้าถึงโมเดล กรุณาตรวจสอบรหัส API Key ในหน้าต่างตั้งค่า"
    );
  }

  if (finalError && isHighDemandError(finalError)) {
    throw new Error(
      "โมเดล AI กำลังมีผู้ใช้งานหนาแน่นชั่วคราว (Model High Demand) กรุณากดปุ่มลองใหม่อีกครั้งในไม่กี่วินาที"
    );
  }

  const errMsg = String(finalError?.message || "");
  if (errMsg.includes("400")) {
    throw new Error(
      "Gemini API Key ไม่ถูกต้อง กรุณาตรวจสอบรหัส API Key ในหน้าต่างตั้งค่า"
    );
  }

  throw (
    finalError ||
    new Error("ไม่สามารถประมวลผลผ่านระบบ AI ได้ กรุณาลองใหม่อีกครั้ง")
  );
}

export async function generateChatStreamWithFallback(options: {
  contents: any;
  config?: any;
  models?: string[];
  apiKey?: string;
}) {
  const defaultStreamModels = TEXT_MODELS;
  const models =
    options.models && options.models.length > 0
      ? options.models
      : defaultStreamModels;
  let lastError: any = null;
  let lastHighDemandError: any = null;
  const client = getAiClient(options.apiKey);

  const retryDelaysMs = [0, 900, 1800];

  for (let pass = 0; pass < retryDelaysMs.length; pass++) {
    if (pass > 0) {
      if (!lastHighDemandError) break;
      const jitter = Math.floor(Math.random() * 250);
      await sleep(retryDelaysMs[pass] + jitter);
    }

    const passModels =
      pass === 0
        ? models
        : Array.from(
            new Set(
              [
                "gemini-3.1-flash-lite",
                "gemini-4-hydrogen",
                "gemini-flash-latest",
                models[0],
              ].filter((m): m is string => Boolean(m) && models.includes(m))
            )
          );

    for (let m = 0; m < passModels.length; m++) {
      const model = passModels[m];
      try {
        const stream = await client.models.generateContentStream({
          model,
          contents: options.contents,
          config: options.config,
        });
        return { stream, model };
      } catch (err: any) {
        lastError = err;

        if (isAuthOrKeyError(err)) {
          pass = retryDelaysMs.length;
          break;
        }

        if (isHighDemandError(err)) {
          lastHighDemandError = err;
        }
      }
    }
  }

  const finalError = lastHighDemandError || lastError;
  console.warn(
    "All Gemini models failed to stream content:",
    finalError?.message || finalError
  );

  if (finalError && isAuthOrKeyError(finalError)) {
    throw new Error(
      "Gemini API Key ไม่ถูกต้องหรือไม่มีสิทธิ์เข้าถึงโมเดล กรุณาตรวจสอบรหัส API Key ในหน้าต่างตั้งค่า"
    );
  }

  if (finalError && isHighDemandError(finalError)) {
    throw new Error(
      "โมเดล AI กำลังมีผู้ใช้งานหนาแน่นชั่วคราว (Model High Demand) กรุณากดปุ่มลองใหม่อีกครั้งในไม่กี่วินาที"
    );
  }

  const errMsg = String(finalError?.message || "");
  if (errMsg.includes("400")) {
    throw new Error(
      "Gemini API Key ไม่ถูกต้อง กรุณาตรวจสอบรหัส API Key ในหน้าต่างตั้งค่า"
    );
  }

  throw (
    finalError ||
    new Error("ไม่สามารถเชื่อมต่อระบบสนทนา AI ได้ กรุณาลองใหม่อีกครั้ง")
  );
}
