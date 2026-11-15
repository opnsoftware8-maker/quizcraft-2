import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/gemini";
import { Type } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { subject, examTitle, scorePercentage, incorrectQuestions = [] } = await req.json();

    const customApiKey = req.headers.get("x-gemini-api-key") || undefined;

    const weakPointsText = incorrectQuestions
      .map(
        (item: { question: string; keyConcept: string; explanation: string; userChoiceText?: string; correctText?: string }, i: number) =>
          `ข้อที่ ${i + 1}: ${item.question}\n- มโนทัศน์ที่ทดสอบ: ${item.keyConcept}\n- เฉลย: ${item.correctText || ""}\n- คำตอบของผู้เรียนที่ตอบผิด: ${item.userChoiceText || ""}\n- เหตุผล: ${item.explanation}`
      )
      .join("\n\n");

    const prompt = `You are a Senior Academic Diagnostic Coach and Pedagogical Specialist.
Analyze the student's exam performance and diagnose their cognitive misconceptions, knowledge gaps, and provide a high-yield 3-step mastery revision strategy.

EXAM INFORMATION:
- Subject: ${subject || "บทเรียนทั่วไป"}
- Title: ${examTitle || "แบบทดสอบ"}
- Student Score: ${scorePercentage}%

STUDENT'S MISTAKES & WEAK CONCEPTS:
"""
${weakPointsText || "นักเรียนตอบถูกทุกข้อ หรือไม่มีข้อผิดพลาดรุนแรง"}
"""

Please return a structured JSON diagnostic report with:
1. 'cognitiveDiagnosis': A precise 2-3 sentence analysis of WHY the student made these mistakes (e.g. confusing related terms, speed-reading trap, formula misapplication).
2. 'criticalKnowledgeGaps': Array of 2 to 4 core knowledge gaps with title and specific explanation of what to review.
3. 'actionPlan': Exactly 3 concrete, high-yield actionable study steps the student should execute today.
4. 'encouragement': An empowering, realistic closing note.

LANGUAGE: Thai.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      apiKey: customApiKey,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cognitiveDiagnosis: { type: Type.STRING },
            criticalKnowledgeGaps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  gapTitle: { type: Type.STRING },
                  description: { type: Type.STRING },
                  remedy: { type: Type.STRING },
                },
                required: ["gapTitle", "description", "remedy"],
              },
            },
            actionPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            encouragement: { type: Type.STRING },
          },
          required: [
            "cognitiveDiagnosis",
            "criticalKnowledgeGaps",
            "actionPlan",
            "encouragement",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Diagnostic error:", error);
    return NextResponse.json(
      { error: error?.message || "เกิดข้อผิดพลาดในการวิเคราะห์จุดอ่อนด้วย AI" },
      { status: 500 }
    );
  }
}
