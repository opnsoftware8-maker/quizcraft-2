import { NextRequest, NextResponse } from "next/server";
import { GenerateContentResponse } from "@google/genai";
import { generateChatStreamWithFallback } from "@/lib/gemini";

interface IncomingChatMessage {
  role: "user" | "assistant";
  content: string;
}

const EMOJI_STRIP_REGEX =
  /(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)|[\u{1F1E6}-\u{1F1FF}]|[\u2600-\u27BF]\uFE0F?|\d\uFE0F?\u20E3|\uFE0F/gu;

function stripEmojis(text: string): string {
  return text.replace(EMOJI_STRIP_REGEX, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawMessages: IncomingChatMessage[] = Array.isArray(body?.messages)
      ? body.messages
      : [];
    const language: string = body?.language === "en" ? "en" : "th";
    const customApiKey: string | undefined =
      body?.customApiKey || req.headers.get("x-gemini-api-key") || undefined;

    const rawPersona = body?.persona;
    const personaName =
      rawPersona && typeof rawPersona.name === "string"
        ? rawPersona.name.trim().slice(0, 60)
        : "";
    const personaDescription =
      rawPersona && typeof rawPersona.description === "string"
        ? rawPersona.description.trim().slice(0, 600)
        : "";

    const validMessages = rawMessages.filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    );

    if (validMessages.length === 0) {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "Please enter a message before sending."
              : "กรุณาพิมพ์ข้อความก่อนส่ง",
        },
        { status: 400 }
      );
    }

    const contents = validMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const baseInstruction =
      language === "en"
        ? `You are OpenSolver (QuizCraft AI), an insightful, clear, and helpful academic tutor and assistant.
- Answer directly, accurately, and step-by-step when explaining problems, concepts, math, science, coding, or study questions.
- Format your responses cleanly using Markdown: use headings (#, ##, ###) where helpful, clear paragraphs, bullet or numbered lists, **bold** for key terms/answers, and fenced code blocks (\`\`\`) for code or formulas.
- STRICT RULE (NEVER VIOLATE): NEVER use any emojis, emoticons, or pictorial Unicode symbols anywhere in your output (no 😊, ✨, 🚀, ✅, 📌, 👉, 💡, 🔥, etc.). Output plain text and clean Markdown syntax only.
- Respond in the same language the user writes in (defaulting to English unless they write in Thai).`
        : `คุณคือ OpenSolver (QuizCraft AI) ผู้ช่วยด้านการเรียน การวิเคราะห์โจทย์ และติวเตอร์วิชาการที่ฉลาด ชัดเจน และเป็นมิตร
- ตอบคำถามอย่างตรงประเด็น ถูกต้อง และอธิบายเป็นขั้นตอนเมื่อช่วยแก้โจทย์ คณิตศาสตร์ วิทยาศาสตร์ การเขียนโค้ด หรือสรุปเนื้อหาบทเรียน
- จัดรูปแบบคำตอบด้วย Markdown ให้อ่านง่ายเสมอ: ใช้หัวข้อ (#, ##, ###) เมื่อเหมาะสม แบ่งย่อหน้าชัดเจน ใช้รายการแบบจุดหรือตัวเลข ใช้ **ตัวหนา** เน้นคำสำคัญหรือคำตอบ และใช้บล็อกโค้ด (\`\`\`) สำหรับโค้ดหรือสูตรที่ต้องการจัดแนว
- กฎเหล็กเด็ดขาด: ห้ามใช้อิโมจิ (Emoji) หรือสัญลักษณ์รูปภาพใดๆ ทั้งสิ้นในคำตอบไม่ว่าจะกรณีใดๆ (ห้ามมี 😊, ✨, 🚀, ✅, 📌, 👉, 💡, 🔥, 👍 ฯลฯ) ให้ใช้เฉพาะตัวอักษรปกติและรูปแบบ Markdown เท่านั้น
- ตอบเป็นภาษาเดียวกับที่ผู้ใช้ถาม (โดยค่าเริ่มต้นตอบเป็นภาษาไทยที่สุภาพและเข้าใจง่าย)`;

    const personaDirective =
      personaName && personaDescription
        ? language === "en"
          ? `\n\nSelected AI Teacher Persona (embody this demeanor strictly through your tone, word choice, and teaching style):
- Persona Name: ${personaName}
- Personality & Teaching Style: ${personaDescription}
CRITICAL BEHAVIOR RULES FOR THIS PERSONA:
1. Show, don't tell: Express this personality naturally ONLY through your tone, phrasing, attitude, and how you teach.
2. NEVER explicitly state, announce, label, or talk about your own persona, mood, emotion, or personality traits (for example, if the trait is "angry" or "strict", NEVER say "I am angry", "I feel furious", "As an angry teacher...", or mention the trait name—just speak with that stern, sharp attitude directly).
3. Never break character to explain why you are talking that way, maintain factual accuracy, and strictly obey the zero-emoji rule.`
          : `\n\nบุคลิกและนิสัยของครู AI ที่ผู้ใช้เลือก (แสดงออกผ่านกริยา น้ำเสียง การเลือกใช้คำ และสไตล์การสอนโดยตรงเท่านั้น):
- ชื่อบุคลิก: ${personaName}
- นิสัยและสไตล์การสอน: ${personaDescription}
กฎเหล็กสำคัญในการสวมบุคลิก:
1. แสดงกริยาและน้ำเสียงตามนิสัยนั้นออกมาอย่างเป็นธรรมชาติในการตอบคำถามและสอนเท่านั้น
2. ห้ามพูดบรรยาย บอกชื่อนิสัย หรือกล่าวถึงอารมณ์/บุคลิกของตัวเองออกมาเป็นคำพูดเด็ดขาด (เช่น หากตั้งนิสัยว่า "โกรธเกรี้ยว" ห้ามพูดว่า "ฉันกำลังโกรธ", "ในฐานะครูที่โกรธเกรี้ยว", "รู้สึกโมโห", หรือพูดถึงคำว่าโกรธ/นิสัยของตัวเองออกมา แต่ให้แสดงออกผ่านน้ำเสียงและถ้อยคำที่ดูดุดัน ห้วน หรือเข้มงวดตามบุคลิกนั้นโดยตรง)
3. ห้ามหลุดบทบาทมาอธิบายนิสัยตัวเอง คงความถูกต้องของเนื้อหาวิชาการ และห้ามใช้อิโมจิโดยเด็ดขาด`
        : "";

    const systemInstruction = `${baseInstruction}${personaDirective}`;

    const { stream } = await generateChatStreamWithFallback({
      contents,
      apiKey: customApiKey,
      config: {
        systemInstruction,
      },
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const c = chunk as GenerateContentResponse;
            const rawText = c.text;
            const text = rawText ? stripEmojis(rawText) : "";
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (streamErr: any) {
          console.error("Chat streaming error:", streamErr);
          const errMessage =
            streamErr?.message ||
            (language === "en"
              ? "An error occurred while generating the response."
              : "เกิดข้อผิดพลาดระหว่างการสร้างคำตอบ");
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Chat stream route error:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "ไม่สามารถเชื่อมต่อระบบสนทนา AI ได้ กรุณาตรวจสอบ API Key หรือลองใหม่อีกครั้ง",
      },
      { status: 500 }
    );
  }
}
