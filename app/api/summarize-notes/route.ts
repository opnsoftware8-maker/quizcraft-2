import { NextRequest, NextResponse } from "next/server";
import { Type } from "@google/genai";
import { generateContentWithFallback } from "@/lib/gemini";
import { StudySummaryData } from "@/types/exam";

export async function POST(req: NextRequest) {
  try {
    const { notes, customPrompt = "", language = "en" } = await req.json();

    if (!notes || typeof notes !== "string" || notes.trim().length < 20) {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "Please provide notes of at least 20 characters to summarize."
              : "กรุณาระบุเนื้อหาหรือสรุปบทเรียนอย่างน้อย 20 ตัวอักษรเพื่อสรุปเนื้อหา",
        },
        { status: 400 }
      );
    }

    const isEn = language === "en";

    const userPromptSection =
      customPrompt && typeof customPrompt === "string" && customPrompt.trim().length > 0
        ? `
CUSTOM USER FOCUS & STYLE PREFERENCES:
"""
${customPrompt.trim()}
"""
Incorporate these specific emphasis areas while strictly adhering to the "Strict Substance, Zero Fluff" directive.
`
        : "";

    const prompt = `You are an Elite Academic Synthesizer and Master Educator.
Your task is to transform raw student lecture notes into an Executive Study Guide:
"Strict Substance, Zero Fluff" — high-yield, structured, crystal-clear, and far more intuitive to read and retain than the raw notes.

STRICT GROUNDING DIRECTIVE (ZERO HALLUCINATION):
- Synthesize ONLY concepts, facts, mechanisms, and relationships explicitly present in the source notes.
- Do NOT bring in unmentioned outside theories or fabrications.
- Maintain academic precision and fidelity to the source.
${userPromptSection}
YOUR SUMMARY MUST INCLUDE:
1. 'title': Engaging, professional academic title for this study guide.
2. 'subject': The broader academic field/subject.
3. 'readingTimeMinutes': Estimated focused reading time (typically 2 to 5 minutes).
4. 'oneMinuteElevatorPitch': A 2-3 sentence executive synopsis capturing the core essence of the topic.
5. 'coreKeyTakeaways': 4 to 5 high-impact bullet points summarizing the fundamental truths of the notes.
6. 'sections': 2 to 4 major structured conceptual sections. Each with:
   - 'heading': Clear section heading
   - 'subheading': Brief framing phrase
   - 'keyPoints': 3 to 5 clear, bulleted core points
   - 'deepDive': 1 to 2 crisp, high-density paragraphs explaining principles, cause-and-effect, and rationale (avoid conversational filler words)
   - 'formulaOrRule': (Optional) Key rule, formula, step-by-step logic, or principle if applicable
7. 'examFocusPoints': 2 to 4 high-yield points that examiners frequently test:
   - 'concept': Name of the concept
   - 'whyItAppearsInExam': Why this is a favorite exam topic
   - 'trapWarning': Common trick, misconception, or distractor students fall for
   - 'sourceExcerpt': Exact or near-exact quote from source notes
8. 'keyTermsTable': 4 to 8 critical technical terms:
   - 'term': Term / keyword
   - 'definition': Precise academic definition
   - 'contextOrExample': Practical context or key distinction
9. 'selfCheckQuestions': 3 short, thought-provoking self-test questions with instant crisp answers to verify reading comprehension.
10. 'rawMarkdownExport': A complete, formatted Markdown representation of this entire study guide (with headings, bold terms, bullet points, and tables) so the student can easily copy or save.

${
  isEn
    ? "LANGUAGE DIRECTIVE: Output the entire summary (title, subject, overview, takeaways, sections, deep dive, exam focus points, terminology table, questions, and rawMarkdownExport) in natural, academic English."
    : "LANGUAGE DIRECTIVE: Output in natural, fluent Thai (unless the source notes are in another specific language)."
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
              description: "Short academic title",
            },
            subject: {
              type: Type.STRING,
              description: "Subject area or topic name",
            },
            readingTimeMinutes: {
              type: Type.INTEGER,
              description: "Estimated reading time in minutes (2 to 5)",
            },
            oneMinuteElevatorPitch: {
              type: Type.STRING,
              description: "2-3 sentence executive summary of the entire topic",
            },
            coreKeyTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "4-5 high-yield bullet takeaways",
            },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING },
                  subheading: { type: Type.STRING },
                  keyPoints: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  deepDive: { type: Type.STRING },
                  formulaOrRule: { type: Type.STRING },
                },
                required: ["heading", "keyPoints", "deepDive"],
              },
            },
            examFocusPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  concept: { type: Type.STRING },
                  whyItAppearsInExam: { type: Type.STRING },
                  trapWarning: { type: Type.STRING },
                  sourceExcerpt: { type: Type.STRING },
                },
                required: ["concept", "whyItAppearsInExam", "trapWarning", "sourceExcerpt"],
              },
            },
            keyTermsTable: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  contextOrExample: { type: Type.STRING },
                },
                required: ["term", "definition", "contextOrExample"],
              },
            },
            selfCheckQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  quickAnswer: { type: Type.STRING },
                },
                required: ["question", "quickAnswer"],
              },
            },
            rawMarkdownExport: {
              type: Type.STRING,
              description: "Complete formatted Markdown document of the summary",
            },
          },
          required: [
            "title",
            "subject",
            "readingTimeMinutes",
            "oneMinuteElevatorPitch",
            "coreKeyTakeaways",
            "sections",
            "examFocusPoints",
            "keyTermsTable",
            "selfCheckQuestions",
          ],
        },
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("ระบบ AI ไม่สามารถสังเคราะห์สรุปเนื้อหาได้");
    }

    let parsed: StudySummaryData;
    try {
      parsed = JSON.parse(text) as StudySummaryData;
    } catch {
      // Clean possible markdown code fences
      const cleaned = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      parsed = JSON.parse(cleaned) as StudySummaryData;
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Error summarizing notes:", error);
    return NextResponse.json(
      { error: error?.message || "เกิดข้อผิดพลาดในการสังเคราะห์สรุปเนื้อหา" },
      { status: 500 }
    );
  }
}
