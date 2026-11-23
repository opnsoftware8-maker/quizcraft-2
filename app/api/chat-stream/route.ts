import { NextRequest, NextResponse } from "next/server";
import {
  FunctionDeclaration,
  GenerateContentResponse,
  Type,
} from "@google/genai";
import { generateChatStreamWithFallback } from "@/lib/gemini";
import {
  evaluateFormulaWithMathJs,
  MathVariableInput,
} from "@/lib/math-evaluator";
import { normalizeTableToolArgs } from "@/lib/structured-table";

interface IncomingChatMessage {
  role: "user" | "assistant";
  content: string;
}

const EMOJI_STRIP_REGEX =
  /(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)|[\u{1F1E6}-\u{1F1FF}]|[\u2600-\u27BF]\uFE0F?|\d\uFE0F?\u20E3|\uFE0F/gu;

function stripEmojis(text: string): string {
  return text.replace(EMOJI_STRIP_REGEX, "");
}

const calculateMathDeclaration: FunctionDeclaration = {
  name: "calculate_math",
  description:
    "Evaluate a mathematical formula or expression with exact numerical/symbolic precision using Math.js. Extract variables from the problem, pass the formula and variable list, and use the returned result in your response.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      formula: {
        type: Type.STRING,
        description:
          "Math.js compatible formula or expression, e.g. '0.5 * m * v^2', '(-b + sqrt(b^2 - 4*a*c)) / (2*a)', 'P * (1 + r/n)^(n*t)', 'sqrt(x^2 + y^2)', 'derivative(\"x^3 + 2*x\", \"x\")'. Use '*' explicitly for multiplication and '^' for powers.",
      },
      variables: {
        type: Type.ARRAY,
        description:
          "Variables extracted from the user problem or formula to substitute before evaluating.",
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Variable name used in the formula (e.g. 'm', 'v', 'a', 'r').",
            },
            value: {
              type: Type.STRING,
              description:
                "Numeric or Math.js value string (e.g. '10', '9.81', '3/4', '45 deg', 'pi').",
            },
          },
          required: ["name", "value"],
        },
      },
    },
    required: ["formula"],
  },
};

const renderDataTableDeclaration: FunctionDeclaration = {
  name: "render_data_table",
  description:
    "Emit a clean interactive comparison or structured data table card directly in the chat UI from object/list data. Automatically call this tool whenever comparing items, concepts, formulas, options, specs, pros/cons, statistics, or organizing multi-item object/list data.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description:
          "Short, clear title for the table card (no emojis).",
      },
      columns: {
        type: Type.ARRAY,
        description:
          "Ordered list of column header names.",
        items: {
          type: Type.STRING,
        },
      },
      rows: {
        type: Type.ARRAY,
        description:
          "Ordered list of row objects. Each row object contains a 'values' array aligned with the 'columns' order.",
        items: {
          type: Type.OBJECT,
          properties: {
            values: {
              type: Type.ARRAY,
              description:
                "Cell text values corresponding 1-to-1 with each column header.",
              items: {
                type: Type.STRING,
              },
            },
          },
          required: ["values"],
        },
      },
      summary: {
        type: Type.STRING,
        description:
          "Optional brief 1-line note or takeaway shown below the table.",
      },
    },
    required: ["title", "columns", "rows"],
  },
};

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

    const initialContents: any[] = validMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const baseInstruction =
      language === "en"
        ? `You are OpenSolver (QuizCraft AI), an insightful, clear, and accurate academic tutor and assistant.
- Answer directly, accurately, and step-by-step when explaining problems, concepts, math, science, coding, or study questions.
- REAL MATH ENGINE (Math.js): Whenever a question involves arithmetic, algebra, formulas, physics/chemistry/finance calculations, or substituting numbers into a formula:
  1. Identify the **Formula** needed.
  2. Extract every **Variable** and its value from the user's message.
  3. ALWAYS call the \`calculate_math\` tool to perform the exact calculation with Math.js (never do mental arithmetic for non-trivial calculations).
  4. Show the formula, the extracted variables, the substitution step, and the exact verified result clearly.
- STRUCTURED TABLE CARDS (AUTOMATIC ON COMPARISON & LIST/OBJECT DATA):
  - Whenever you compare 2+ items, concepts, formulas, options, specs, pros/cons, or organize structured object/list data or pasted data blocks, AUTOMATICALLY call the \`render_data_table\` tool to emit a structured Table Card in the chat.
  - Ensure every row's \`values\` array matches the exact length and order of \`columns\`, with concise, readable cell text (never include emojis).
  - After calling \`render_data_table\`, do NOT repeat or duplicate the exact same table again as Markdown text—provide a brief, helpful explanation or key comparison insight around the card instead.
- Format responses cleanly using Markdown: headings (#, ##, ###), clear paragraphs, lists, **bold**, and fenced code blocks (\`\`\`) for code.
- STRICT RULE (NEVER VIOLATE): NEVER use any emojis, emoticons, or pictorial Unicode symbols anywhere in your output (no 😊, ✨, 🚀, ✅, 📌, 👉, 💡, 🔥, etc.). Output plain text and clean Markdown syntax only.
- Respond in the same language the user writes in (defaulting to English unless they write in Thai).`
        : `คุณคือ OpenSolver (QuizCraft AI) ผู้ช่วยด้านการเรียน การวิเคราะห์โจทย์ และติวเตอร์วิชาการที่ฉลาด ชัดเจน และแม่นยำ
- ตอบคำถามอย่างตรงประเด็น ถูกต้อง และอธิบายเป็นขั้นตอนเมื่อช่วยแก้โจทย์ คณิตศาสตร์ วิทยาศาสตร์ การเงิน การเขียนโค้ด หรือสรุปเนื้อหาบทเรียน
- การคำนวณคณิตศาสตร์จริงด้วย Math.js: ทุกครั้งที่มีการคิดเลข คำนวณสูตร (คณิต ฟิสิกส์ เคมี สถิติ การเงิน ฯลฯ) หรือผู้ใช้ส่งสูตร/โจทย์ตัวเลขมา:
  1. ระบุ **สูตรที่ใช้** ให้ชัดเจน
  2. **ดึงตัวแปรและค่าจากโจทย์** ออกมาให้ครบถ้วน
  3. **ต้องเรียกใช้เครื่องมือ \`calculate_math\` เสมอ** เพื่อนำตัวแปรไปแทนค่าในสูตรและคำนวณด้วย Math.js จริงๆ (ห้ามคิดเลขในใจเองสำหรับโจทย์ที่คำนวณได้)
  4. แสดงสูตร ตัวแปรที่ดึงมา ขั้นตอนการแทนค่าลงสูตร และคำตอบที่คำนวณได้จริงอย่างชัดเจน
- การ์ดตารางข้อมูลอัตโนมัติ (\`render_data_table\`):
  - ทุกครั้งที่มีการเปรียบเทียบข้อมูลตั้งแต่ 2 รายการขึ้นไป (เช่น เปรียบเทียบสูตร แนวคิด ข้อดี-ข้อเสีย สเปก ข้อมูลสถิติ) หรือจัดโครงสร้างข้อมูลแบบ Object/List หรือข้อมูลก้อนยาวๆ ให้ **เรียกใช้เครื่องมือ \`render_data_table\` โดยอัตโนมัติ** เพื่อส่งออกการ์ดตารางลงในแชท
  - ตรวจสอบให้ \`values\` ในทุกแถวมีจำนวนและลำดับตรงกับ \`columns\` เสมอ ข้อความในแต่ละช่องกระชับ อ่านง่าย และห้ามมีอีโมจิ
  - เมื่อเรียกใช้ \`render_data_table\` แล้ว **ห้ามเขียนตาราง Markdown ซ้ำข้อมูลชุดเดียวกันอีก** ให้สรุปประเด็นสำคัญหรือคำอธิบายประกอบสั้นๆ รอบการ์ดตารางแทน
- จัดรูปแบบคำตอบด้วย Markdown ให้อ่านง่าย: ใช้หัวข้อ (#, ##, ###) แบ่งย่อหน้า ใช้รายการ **ตัวหนา** เน้นคำตอบ และบล็อกโค้ด (\`\`\`) สำหรับโค้ด
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
    const tools = [
      {
        functionDeclarations: [
          calculateMathDeclaration,
          renderDataTableDeclaration,
        ],
      },
    ];

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const currentContents: any[] = [...initialContents];
          const MAX_TOOL_ROUNDS = 5;

          for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const { stream } = await generateChatStreamWithFallback({
              contents: currentContents,
              apiKey: customApiKey,
              config: {
                systemInstruction,
                tools,
              },
            });

            const roundModelParts: any[] = [];
            const roundFunctionCalls: any[] = [];

            for await (const chunk of stream) {
              const c = chunk as GenerateContentResponse;

              const candidateParts = c.candidates?.[0]?.content?.parts;
              if (Array.isArray(candidateParts) && candidateParts.length > 0) {
                for (const part of candidateParts) {
                  roundModelParts.push(part);
                  if (part.functionCall) {
                    roundFunctionCalls.push(part.functionCall);
                  }
                }
              } else if (
                Array.isArray(c.functionCalls) &&
                c.functionCalls.length > 0
              ) {
                for (const fc of c.functionCalls) {
                  roundModelParts.push({ functionCall: fc });
                  roundFunctionCalls.push(fc);
                }
              }

              const rawText = c.text;
              const text = rawText ? stripEmojis(rawText) : "";
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`)
                );
              }
            }

            if (roundFunctionCalls.length === 0) {
              break;
            }

            // Execute each tool call and stream table payloads immediately when generated
            const functionResponseParts = roundFunctionCalls.map((fc, fcIdx) => {
              if (fc.name === "calculate_math") {
                const args = (fc.args || {}) as {
                  formula?: string;
                  variables?: MathVariableInput[];
                };
                const evalResult = evaluateFormulaWithMathJs({
                  formula: String(args.formula || ""),
                  variables: Array.isArray(args.variables)
                    ? args.variables
                    : [],
                });

                return {
                  functionResponse: {
                    id: fc.id,
                    name: fc.name,
                    response: { result: evalResult },
                  },
                };
              }

              if (fc.name === "render_data_table") {
                const normalized = normalizeTableToolArgs(
                  fc.args,
                  `${Date.now()}-${round}-${fcIdx}`
                );
                if (normalized) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ table: normalized })}\n\n`
                    )
                  );
                  return {
                    functionResponse: {
                      id: fc.id,
                      name: fc.name,
                      response: {
                        ok: true,
                        title: normalized.title,
                        columnCount: normalized.columns.length,
                        rowCount: normalized.rows.length,
                      },
                    },
                  };
                }

                return {
                  functionResponse: {
                    id: fc.id,
                    name: fc.name,
                    response: {
                      ok: false,
                      error:
                        "Invalid table data: at least one column header and one row are required.",
                    },
                  },
                };
              }

              return {
                functionResponse: {
                  id: fc.id,
                  name: fc.name,
                  response: { error: `Unknown tool: ${fc.name}` },
                },
              };
            });

            currentContents.push({
              role: "model",
              parts: roundModelParts,
            });
            currentContents.push({
              role: "user",
              parts: functionResponseParts,
            });
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
