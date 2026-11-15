import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

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

    // Verify key with a minimal fast call
    const client = new GoogleGenAI({
      apiKey: trimmedKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Test with gemini-3.1-flash-lite
    const testResponse = await client.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: "Respond with only one word: OK",
    });

    if (testResponse && testResponse.text) {
      return NextResponse.json({
        valid: true,
        message: "API Key ใช้งานได้สมบูรณ์!",
      });
    }

    return NextResponse.json(
      { valid: false, error: "ไม่สามารถรับการตอบกลับจาก Gemini ได้" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("API Key verification error:", error);
    const msg = String(error?.message || "");
    let userMsg = "การตรวจสอบล้มเหลว กรุณาตรวจสอบว่า API Key ถูกต้อง";

    if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid") || msg.includes("400")) {
      userMsg = "API Key ไม่ถูกต้อง หรือถูกระงับการใช้งาน กรุณาตรวจสอบรหัสใหม่อีกครั้ง";
    } else if (msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
      userMsg = "API Key นี้โควตาเต็มชั่วคราว แต่คีย์ถูกต้อง";
    }

    return NextResponse.json(
      { valid: false, error: userMsg },
      { status: 400 }
    );
  }
}
