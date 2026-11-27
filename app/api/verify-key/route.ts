import { NextRequest, NextResponse } from "next/server";
import { getAiClient, TEXT_MODELS } from "@/lib/gemini";
import { isValidGeminiApiKeyFormat } from "@/lib/custom-key";

const VERIFY_MODELS = Array.from(
  new Set(["gemini-4-hydrogen", "gemini-3.1-flash-lite", ...TEXT_MODELS])
);

function isInvalidKeyError(msg: string, code?: unknown): boolean {
  return (
    code === 401 ||
    code === 403 ||
    msg.includes("API_KEY_INVALID") ||
    msg.includes("API key not valid") ||
    msg.includes("PERMISSION_DENIED") ||
    msg.includes("UNAUTHENTICATED")
  );
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return NextResponse.json(
        { valid: false, error: "กรุณาระบุ Gemini API Key" },
        { status: 400 }
      );
    }

    const trimmedKey = apiKey.trim();

    if (!isValidGeminiApiKeyFormat(trimmedKey)) {
      return NextResponse.json(
        {
          valid: false,
          error:
            "รูปแบบไม่ถูกต้อง: Gemini API Key มักเริ่มต้นด้วย 'AQ.' หรือ 'AIza...'",
        },
        { status: 400 }
      );
    }

    const client = getAiClient(trimmedKey);
    let lastError: any = null;

    for (const model of VERIFY_MODELS) {
      try {
        const testResponse = await client.models.generateContent({
          model,
          contents: "Respond with only one word: OK",
        });

        if (testResponse && testResponse.text) {
          return NextResponse.json({
            valid: true,
            message: "API Key ใช้งานได้สมบูรณ์!",
          });
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || "");
        const code = err?.status || err?.code || err?.error?.code;
        if (isInvalidKeyError(msg, code)) {
          break;
        }
      }
    }

    const msg = String(lastError?.message || "");
    const code = lastError?.status || lastError?.code || lastError?.error?.code;
    let userMsg = "การตรวจสอบล้มเหลว กรุณาตรวจสอบว่า API Key ถูกต้อง";

    if (isInvalidKeyError(msg, code) || msg.includes("400")) {
      userMsg = "API Key ไม่ถูกต้อง หรือถูกระงับการใช้งาน กรุณาตรวจสอบรหัสใหม่อีกครั้ง";
    } else if (
      code === 429 ||
      msg.includes("quota") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("429")
    ) {
      userMsg = "API Key นี้โควตาเต็มชั่วคราว แต่คีย์ถูกต้อง";
    }

    return NextResponse.json({ valid: false, error: userMsg }, { status: 400 });
  } catch (error: any) {
    console.error("API Key verification error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "การตรวจสอบล้มเหลว กรุณาตรวจสอบว่า API Key ถูกต้อง",
      },
      { status: 400 }
    );
  }
}
