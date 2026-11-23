import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/gemini";

const EMOJI_STRIP_REGEX =
  /(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)|[\u{1F1E6}-\u{1F1FF}]|[\u2600-\u27BF]\uFE0F?|\d\uFE0F?\u20E3|\uFE0F/gu;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessage =
      typeof body?.userMessage === "string"
        ? body.userMessage.trim().slice(0, 1500)
        : "";
    const assistantReply =
      typeof body?.assistantReply === "string"
        ? body.assistantReply.trim().slice(0, 800)
        : "";
    const language = body?.language === "en" ? "en" : "th";
    const customApiKey: string | undefined =
      body?.customApiKey || req.headers.get("x-gemini-api-key") || undefined;

    if (!userMessage) {
      return NextResponse.json({ title: "" }, { status: 400 });
    }

    const prompt =
      language === "en"
        ? `Summarize the user's opening message below into a short, clear chat title (3 to 7 words, maximum 50 characters).
Rules:
- Output ONLY the plain title text.
- No quotes, no markdown, no bullets, no trailing period, and NO emojis.
- Match the language used in the user's message (Thai or English).

User opening message:
${userMessage}

First AI reply snippet (for topic context):
${assistantReply}`
        : `สรุปข้อความแรกที่ผู้ใช้ทักมาด้านล่างให้เป็นหัวข้อแชทสั้นๆ ชัดเจน (ความยาวประมาณ 3-7 คำ ไม่เกิน 50 ตัวอักษร)
กฎ:
- ตอบกลับเป็นข้อความหัวข้ออย่างเดียวเท่านั้น
- ห้ามใส่เครื่องหมายคำพูด ห้ามใช้ Markdown ห้ามใส่จุดต่อท้าย และห้ามใช้อิโมจิเด็ดขาด
- ใช้ภาษาเดียวกับข้อความที่ผู้ใช้พิมพ์ (ไทยหรืออังกฤษ)

ข้อความแรกของผู้ใช้:
${userMessage}

ข้อความตอบกลับแรกของ AI (เพื่อให้เข้าใจบริบทหัวข้อ):
${assistantReply}`;

    const response = await generateContentWithFallback({
      contents: prompt,
      apiKey: customApiKey,
      config: {
        temperature: 0.2,
      },
    });

    const rawTitle = (response.text || "")
      .replace(EMOJI_STRIP_REGEX, "")
      .replace(/^["'`“”‘’*#\-\s]+|["'`“”‘’.\s]+$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 70);

    return NextResponse.json({ title: rawTitle });
  } catch (err) {
    console.error("Chat title generation error:", err);
    return NextResponse.json({ title: "" }, { status: 200 });
  }
}
