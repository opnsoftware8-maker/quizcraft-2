import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/gemini";
import { Type } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const {
      notes,
      question,
      context = "",
      idealKeyPoints = [],
      studentAnswer,
    } = await req.json();

    if (!notes || typeof notes !== "string") {
      return NextResponse.json(
        { error: "ข้อมูลเนื้อหาสรุปไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (!studentAnswer || typeof studentAnswer !== "string" || studentAnswer.trim().length === 0) {
      return NextResponse.json(
        { error: "กรุณากรอกคำตอบข้อเขียนของท่านก่อนกดส่งตรวจ" },
        { status: 400 }
      );
    }

    const prompt = `You are a strict, constructive academic grader and professor evaluating a student's subjective examination answer.
You MUST grade strictly based on the provided student notes (NotebookLM summary). Do NOT use external facts.

QUESTION:
${question}
${context ? `Context: ${context}` : ""}

EXPECTED KEY POINTS (from notes):
${JSON.stringify(idealKeyPoints, null, 2)}

SOURCE NOTES (Grounding reference):
"""
${notes.trim()}
"""

STUDENT ANSWER:
"""
${studentAnswer.trim()}
"""

EVALUATION TASK:
1. Compare student's answer word-by-word and concept-by-concept against the source notes and expected key points.
2. Score the answer from 0.0 to 10.0 based on:
   - Factual accuracy with respect to the source notes (0-4 pts)
   - Completeness of essential key points (0-3 pts)
   - Academic reasoning & clarity of terminology (0-3 pts)
3. Classify verdict:
   - "ยอดเยี่ยม (Mastery)" (9-10 pts)
   - "ดีมาก (Proficient)" (7.5-8.9 pts)
   - "ปานกลาง (Developing)" (5.0-7.4 pts)
   - "ต้องทบทวนเพิ่ม (Learning Gap)" (< 5.0 pts)
4. Strengths: What parts of the answer correctly matched the notes.
5. Missing Key Points: Important concepts or terms from the notes that were omitted.
6. Misconceptions: Any inaccurate claims or confusion in the student's answer.
7. Word-by-word / sentence-level constructive feedback explaining how to upgrade the answer.
8. Model Answer: An exemplary, complete academic answer written strictly using the source notes.
9. Grounded Quote: The exact excerpt from the source notes backing up the ideal answer.

Language: Thai.`;

    const customApiKey = req.headers.get("x-gemini-api-key") || undefined;

    const response = await generateContentWithFallback({
      contents: prompt,
      apiKey: customApiKey,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.NUMBER,
              description: "Score out of 10",
            },
            verdict: {
              type: Type.STRING,
              description:
                "ยอดเยี่ยม (Mastery), ดีมาก (Proficient), ปานกลาง (Developing), หรือ ต้องทบทวนเพิ่ม (Learning Gap)",
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of points done well",
            },
            missingKeyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of omitted concepts from notes",
            },
            misconceptions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Errors or inaccurate understandings",
            },
            wordByWordFeedback: {
              type: Type.STRING,
              description: "Detailed constructive critique",
            },
            modelAnswer: {
              type: Type.STRING,
              description: "Flawless model answer strictly from notes",
            },
            groundedQuote: {
              type: Type.STRING,
              description: "Direct excerpt from source notes",
            },
          },
          required: [
            "score",
            "verdict",
            "strengths",
            "missingKeyPoints",
            "misconceptions",
            "wordByWordFeedback",
            "modelAnswer",
            "groundedQuote",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const rawScore = Number(parsed.score) || 0;
    const clampedScore = Math.min(Math.max(Math.round(rawScore * 10) / 10, 0), 10);
    const percentage = Math.round((clampedScore / 10) * 100);

    let verdict = parsed.verdict;
    if (!verdict) {
      if (percentage >= 90) verdict = "ยอดเยี่ยม (Mastery)";
      else if (percentage >= 75) verdict = "ดีมาก (Proficient)";
      else if (percentage >= 50) verdict = "ปานกลาง (Developing)";
      else verdict = "ต้องทบทวนเพิ่ม (Learning Gap)";
    }

    return NextResponse.json({
      score: clampedScore,
      total: 10,
      percentage,
      verdict,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      missingKeyPoints: Array.isArray(parsed.missingKeyPoints)
        ? parsed.missingKeyPoints
        : [],
      misconceptions: Array.isArray(parsed.misconceptions)
        ? parsed.misconceptions
        : [],
      wordByWordFeedback:
        parsed.wordByWordFeedback || "คำตอบได้รับการประเมินตามเกณฑ์สรุปบทเรียน",
      modelAnswer: parsed.modelAnswer || "",
      groundedQuote: parsed.groundedQuote || "",
    });
  } catch (error: any) {
    console.error("Error grading subjective answer:", error);
    return NextResponse.json(
      { error: error?.message || "ไม่สามารถตรวจคำตอบข้อเขียนได้" },
      { status: 500 }
    );
  }
}
