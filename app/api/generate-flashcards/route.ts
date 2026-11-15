import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/gemini";
import { Type } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { notes, count = 8, customPrompt = "", language = "en" } = await req.json();

    if (!notes || typeof notes !== "string" || notes.trim().length < 20) {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "Please provide notes of at least 20 characters to generate flashcards."
              : "กรุณาระบุเนื้อหาหรือสรุปบทเรียนอย่างน้อย 20 ตัวอักษร",
        },
        { status: 400 }
      );
    }

    const isEn = language === "en";
    const cardCount = Math.min(Math.max(Number(count) || 8, 4), 16);

    const userPromptSection = customPrompt && typeof customPrompt === "string" && customPrompt.trim().length > 0
      ? `
CUSTOM USER INSTRUCTIONS & FLASHCARD FOCUS:
"""
${customPrompt.trim()}
"""
Incorporate these specific focus topics or keyword preferences strictly based on the provided SOURCE NOTES.
`
      : "";

    const prompt = `You are an academic flashcard creator. Extract key keywords, essential concepts, definitions, and high-frequency exam points strictly from the provided student lecture summary notes.

STRICT GROUNDING:
- Zero hallucination. Every flashcard must be grounded 100% in the provided text.
- Do NOT bring in outside facts.
${userPromptSection}
For each flashcard:
- 'term': The technical term, formula, or concept name.
- 'definition': Accurate concise definition/explanation based on the text.
- 'keyFormulaOrFact': Core fact, principle, equation, or vital characteristic mentioned in the text.
- 'examWatchout': High-stakes test caution point (e.g. traps, easily confused terms).
- 'sourceQuote': Exact snippet quote from the notes.

Generate ${cardCount} high-value academic flashcards.
${
  isEn
    ? "LANGUAGE DIRECTIVE: Output topic, terms, definitions, key formulas, and exam watchouts in natural, academic English."
    : "Language: Match source notes language (Thai if notes are Thai)."
}

SOURCE NOTES:
"""
${notes.trim()}
"""`;

    const customApiKey = req.headers.get("x-gemini-api-key") || undefined;

    const response = await generateContentWithFallback({
      contents: prompt,
      apiKey: customApiKey,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            cards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  keyFormulaOrFact: { type: Type.STRING },
                  examWatchout: { type: Type.STRING },
                  sourceQuote: { type: Type.STRING },
                },
                required: [
                  "term",
                  "definition",
                  "keyFormulaOrFact",
                  "examWatchout",
                  "sourceQuote",
                ],
              },
            },
          },
          required: ["topic", "cards"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const rawCards = parsed.cards || [];

    const cards = rawCards.map((c: any, idx: number) => ({
      id: `fc-${idx + 1}-${Date.now().toString(36)}`,
      term: c.term || `คีย์เวิร์ด ${idx + 1}`,
      definition: c.definition || "",
      keyFormulaOrFact: c.keyFormulaOrFact || "",
      examWatchout: c.examWatchout || "ระวังการสับสนนิยามที่มีความใกล้เคียงกัน",
      sourceQuote: c.sourceQuote || "",
    }));

    return NextResponse.json({
      topic: parsed.topic || "แฟลชการ์ดคำศัพท์สำคัญ",
      cards,
    });
  } catch (error: any) {
    console.error("Error generating flashcards:", error);
    return NextResponse.json(
      { error: error?.message || "ไม่สามารถสร้างแฟลชการ์ดได้" },
      { status: 500 }
    );
  }
}
