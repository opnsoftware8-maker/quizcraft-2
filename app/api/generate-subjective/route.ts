import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/gemini";
import { Type } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { notes, count = 3, customPrompt = "", language = "en" } = await req.json();

    if (!notes || typeof notes !== "string" || notes.trim().length < 20) {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "Please provide notes of at least 20 characters to generate questions."
              : "กรุณาระบุเนื้อหาหรือสรุปบทเรียนอย่างน้อย 20 ตัวอักษร",
        },
        { status: 400 }
      );
    }

    const isEn = language === "en";
    const qCount = Math.min(Math.max(Number(count) || 3, 2), 6);

    const userPromptSection = customPrompt && typeof customPrompt === "string" && customPrompt.trim().length > 0
      ? `
CUSTOM USER INSTRUCTIONS & SUBJECTIVE QUESTION STYLE:
"""
${customPrompt.trim()}
"""
Incorporate these specific focus topics or analytical styles strictly grounded in the SOURCE NOTES.
`
      : "";

    const prompt = `You are an Academic Examiner creating subjective short-answer/analytical essay exam questions based strictly on the provided student lecture notes.

STRICT GROUNDING DIRECTIVE:
- Only ask questions about concepts explicitly explained in the source text.
- Do NOT bring in external knowledge.
${userPromptSection}
For each subjective question:
- 'question': Clear analytical/conceptual question asking the student to explain mechanisms, comparisons, causes, or key principles.
- 'context': Brief academic context or premise.
- 'idealKeyPoints': 3 to 5 vital points/keywords that must appear in a complete answer.
- 'rubricGuide': Specific grading rubric criteria for 10 full marks (e.g. 4 pts core definition, 4 pts explanation of mechanism, 2 pts correct terminology).
- 'sourceQuote': Exact text excerpt from notes where the answer is found.

Generate ${qCount} high-quality subjective questions.
${
  isEn
    ? "LANGUAGE DIRECTIVE: Output title, question, context, idealKeyPoints, and rubricGuide in natural, academic English."
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
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  context: { type: Type.STRING },
                  idealKeyPoints: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  rubricGuide: { type: Type.STRING },
                  sourceQuote: { type: Type.STRING },
                },
                required: [
                  "question",
                  "context",
                  "idealKeyPoints",
                  "rubricGuide",
                  "sourceQuote",
                ],
              },
            },
          },
          required: ["title", "questions"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const rawQuestions = parsed.questions || [];

    const questions = rawQuestions.map((q: any, idx: number) => ({
      id: `sq-${idx + 1}-${Date.now().toString(36)}`,
      question: q.question,
      context: q.context || "",
      idealKeyPoints: Array.isArray(q.idealKeyPoints) ? q.idealKeyPoints : [],
      rubricGuide: q.rubricGuide || "เกณฑ์การให้คะแนนอิงความครบถ้วนของแนวคิด",
      sourceQuote: q.sourceQuote || "",
    }));

    return NextResponse.json({
      title: parsed.title || "แบบทดสอบข้อเขียนและประเมิน Rubrics",
      questions,
    });
  } catch (error: any) {
    console.error("Error generating subjective questions:", error);
    return NextResponse.json(
      { error: error?.message || "ไม่สามารถสร้างข้อสอบข้อเขียนได้" },
      { status: 500 }
    );
  }
}
