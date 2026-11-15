import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/gemini";
import { Type } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { notes, questionCount = 5, difficulty = "mixed", customPrompt = "", language = "en" } = await req.json();

    if (!notes || typeof notes !== "string" || notes.trim().length < 20) {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "Please provide notes of at least 20 characters to generate an exam."
              : "กรุณาระบุเนื้อหาหรือสรุปบทเรียนอย่างน้อย 20 ตัวอักษร",
        },
        { status: 400 }
      );
    }

    const isEn = language === "en";

    const maxAllowed = 200;
    const count = Math.min(Math.max(Number(questionCount) || 5, 3), maxAllowed);

    const difficultyDirective = difficulty === "olympiad"
      ? "ADVANCED HIGH-STAKES COMPETITION & TRAP-HEAVY (ระดับสอวน./สอบแข่งขันระดับประเทศ): ข้อสอบต้องเน้นการวิเคราะห์เชิงลึกขั้นสูง ตัวลวงแนบเนียน ดักจุดที่คนมักจำสับสนได้อย่างเฉียบคม แต่ยังคงอ้างอิงความจริงจากบทเรียน 100%"
      : difficulty === "recall"
      ? "RECALL (ระดับพื้นฐาน): เน้นนิยาม สูตร กฎเกณฑ์ และสาระสำคัญที่ชัดเจน"
      : difficulty === "analysis"
      ? "ANALYSIS (ระดับวิเคราะห์): เน้นการเปรียบเทียบ กลไก และการประยุกต์ใช้สถานการณ์"
      : "MIXED: ผสมผสานทั้งความจำแม่นยำและการคิดวิเคราะห์อย่างสมดุล";

    const userPromptSection = customPrompt && typeof customPrompt === "string" && customPrompt.trim().length > 0
      ? `
CUSTOM USER INSTRUCTIONS & EXAM CONDITIONS:
"""
${customPrompt.trim()}
"""
Apply these custom user instructions (e.g. question style, focus area, difficulty tone, specific scenario formats) strictly using only the facts and knowledge present in the SOURCE NOTES. Do not violate the strict grounding directive.
`
      : "";

    const prompt = `You are an objective, authoritative Academic Examiner and Test Creator for high-stakes academic examinations.
Your sole responsibility is to extract key knowledge strictly from the provided student summary notes and generate high-standard examination questions.

STRICT GROUNDING DIRECTIVE (ZERO HALLUCINATION):
- Extract questions, options, and explanations STRICTLY from the provided source text.
- DO NOT introduce outside facts, assumed theories, or external knowledge not found in this source text.
- If a fact is not stated in the source text, do NOT test on it.
${userPromptSection}
EXAM DIFFICULTY DIRECTIVE:
${difficultyDirective}

OPTIONS REQUIREMENT:
For each question, the 'options' array MUST contain EXACTLY 5 string values:
- options[0]: Choice A
- options[1]: Choice B
- options[2]: Choice C
- options[3]: Choice D
- options[4]: The exact correct answer text (matching one of Choice A, B, C, or D).

ADDITIONAL REQUIREMENTS:
- 'correctIndex': An integer from 0 to 3 showing which choice (0=A, 1=B, 2=C, 3=D) is the correct answer.
- 'explanation': Clear academic rationale citing why the correct answer is right and pointing out why the distractors are wrong based on the source text.
- 'sourceQuote': Exact direct quotation snippet from the source notes demonstrating where this answer is grounded.
- 'keyConcept': The core term or concept tested.
- 'difficulty': '${difficulty === "recall" ? "recall" : difficulty === "analysis" ? "analysis" : "analysis"}'.

Number of questions to generate: ${count}.
${
  isEn
    ? "LANGUAGE DIRECTIVE: Output the entire test (title, summarySubject, question text, choices A-D, answer text, explanations, and keyConcept) in natural, academic English."
    : "Language: Same language as the source text (Thai if the notes are in Thai)."
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
            title: {
              type: Type.STRING,
              description: "Short academic title of this test based on notes",
            },
            summarySubject: {
              type: Type.STRING,
              description: "Subject area or topic name",
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: {
                    type: Type.STRING,
                    description: "Question prompt",
                  },
                  options: {
                    type: Type.ARRAY,
                    description:
                      "Array of 5 items: first 4 are choices A, B, C, D; 5th item is the correct answer text",
                    items: {
                      type: Type.STRING,
                    },
                  },
                  correctIndex: {
                    type: Type.INTEGER,
                    description: "Index (0 to 3) of the correct choice",
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "Detailed explanation grounded in the text",
                  },
                  sourceQuote: {
                    type: Type.STRING,
                    description: "Direct quote snippet from source text",
                  },
                  difficulty: {
                    type: Type.STRING,
                    description: "recall or analysis",
                  },
                  keyConcept: {
                    type: Type.STRING,
                    description: "Key academic concept or keyword",
                  },
                },
                required: [
                  "question",
                  "options",
                  "correctIndex",
                  "explanation",
                  "sourceQuote",
                  "difficulty",
                  "keyConcept",
                ],
              },
            },
          },
          required: ["title", "summarySubject", "questions"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const rawQuestions = parsed.questions || [];

    // Ensure id and exact 5 options format
    const questions = rawQuestions.map((q: any, idx: number) => {
      let opts = Array.isArray(q.options) ? [...q.options] : [];
      let cIdx = typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0;
      
      // Make sure we have 4 choices + 1 answer string (total 5 elements)
      if (opts.length < 4) {
        while (opts.length < 4) {
          opts.push(`ตัวเลือกเพิ่มเติม ${opts.length + 1}`);
        }
      }
      const choiceA = opts[0] || "ก.";
      const choiceB = opts[1] || "ข.";
      const choiceC = opts[2] || "ค.";
      const choiceD = opts[3] || "ง.";
      const correctChoice = opts[cIdx] || choiceA;
      const answerVal = opts[4] || correctChoice;

      return {
        id: `q-${idx + 1}-${Date.now().toString(36)}`,
        question: q.question,
        options: [choiceA, choiceB, choiceC, choiceD, answerVal],
        correctIndex: cIdx,
        explanation: q.explanation || "อ้างอิงตามเนื้อหาที่กำหนด",
        sourceQuote: q.sourceQuote || "",
        difficulty: q.difficulty === "analysis" ? "analysis" : "recall",
        keyConcept: q.keyConcept || "ประเด็นสำคัญ",
      };
    });

    return NextResponse.json({
      title: parsed.title || "ชุดข้อสอบจำลองเสมือนจริง",
      summarySubject: parsed.summarySubject || "สรุปบทเรียน",
      questions,
    });
  } catch (error: any) {
    console.error("Error generating exam:", error);
    return NextResponse.json(
      { error: error?.message || "ไม่สามารถสร้างข้อสอบได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
