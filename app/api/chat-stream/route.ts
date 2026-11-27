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
import { normalizeMathCanvasToolArgs } from "@/lib/math-canvas";

export const dynamic = "force-dynamic";

type StreamThinkingStage =
  | "thinking"
  | "calculating"
  | "building_table"
  | "drawing_graph"
  | "composing";

interface IncomingChatFile {
  name?: string;
  mimeType?: string;
  kind?: "image" | "pdf" | "text";
  base64Data?: string;
  textContent?: string;
}

interface IncomingChatMessage {
  role: "user" | "assistant";
  content: string;
  files?: IncomingChatFile[];
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

const renderMathCanvasDeclaration: FunctionDeclaration = {
  name: "render_math_canvas",
  description:
    "Render an interactive, zoomable blank-paper 2D coordinate sheet / math graph / vector & matrix diagram in the chat UI. Call ONLY when the user asks about mathematics, calculation sciences, physics, chemistry, statistics, geometry, vectors, matrices, fractions layout, or quantitative topics needing a visual graph or spatial diagram.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "Clear concise title for the graph or math sheet (no emojis).",
      },
      subject: {
        type: Type.STRING,
        description: "Academic subject (e.g. 'Mathematics', 'Algebra', 'Calculus', 'Linear Algebra', 'Physics', 'Geometry', 'Economics').",
      },
      gridMode: {
        type: Type.STRING,
        description:
          "'invisible' for blank paper with hidden X-Y coordinate positioning (ideal for fractions, matrices, arithmetic steps, pure geometry), 'faint' for subtle dotted coordinate lines, or 'axes' for a full Cartesian X-Y coordinate plane with ticks and arrows.",
      },
      canvasHeight: {
        type: Type.STRING,
        description: "'compact', 'standard', or 'tall' depending on vertical space needed.",
      },
      xMin: {
        type: Type.NUMBER,
        description: "Left bound of X coordinate space (e.g. -10 or 0).",
      },
      xMax: {
        type: Type.NUMBER,
        description: "Right bound of X coordinate space (e.g. 10).",
      },
      yMin: {
        type: Type.NUMBER,
        description: "Bottom bound of Y coordinate space (e.g. -10 or 0).",
      },
      yMax: {
        type: Type.NUMBER,
        description: "Top bound of Y coordinate space (e.g. 10).",
      },
      xStep: {
        type: Type.NUMBER,
        description: "Optional grid/tick interval along X axis.",
      },
      yStep: {
        type: Type.NUMBER,
        description: "Optional grid/tick interval along Y axis.",
      },
      xLabel: {
        type: Type.STRING,
        description: "Optional X axis label (e.g. 'x', 't (s)').",
      },
      yLabel: {
        type: Type.STRING,
        description: "Optional Y axis label (e.g. 'y', 'f(x)').",
      },
      functions: {
        type: Type.ARRAY,
        description: "Mathematical functions y = f(x) to plot smoothly via Math.js.",
        items: {
          type: Type.OBJECT,
          properties: {
            expr: {
              type: Type.STRING,
              description: "Math.js expression in x, e.g. 'x^2 - 4', '2*x + 1', 'sin(x)', '1/x'.",
            },
            xMin: { type: Type.NUMBER, description: "Optional start x." },
            xMax: { type: Type.NUMBER, description: "Optional end x." },
            color: { type: Type.STRING, description: "Hex color e.g. '#0284C7', '#DC2626', '#059669'." },
            dashed: { type: Type.BOOLEAN, description: "Optional dashed stroke." },
            label: { type: Type.STRING, description: "Optional equation label." },
          },
          required: ["expr", "color"],
        },
      },
      curves: {
        type: Type.ARRAY,
        description: "Smooth spline curves or closed polygons defined by (x, y) control points.",
        items: {
          type: Type.OBJECT,
          properties: {
            points: {
              type: Type.ARRAY,
              description: "Ordered (x, y) points along the curve.",
              items: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                },
                required: ["x", "y"],
              },
            },
            smooth: { type: Type.BOOLEAN, description: "True for smooth curve, false for straight polyline." },
            closed: { type: Type.BOOLEAN, description: "True to close polygon/shape." },
            color: { type: Type.STRING, description: "Stroke hex color." },
            fill: { type: Type.STRING, description: "Optional translucent fill e.g. 'rgba(2, 132, 199, 0.12)'." },
            dashed: { type: Type.BOOLEAN },
            arrowEnd: { type: Type.BOOLEAN },
            label: { type: Type.STRING },
          },
          required: ["points", "color"],
        },
      },
      lines: {
        type: Type.ARRAY,
        description: "Straight line segments, rays, vectors (arrowEnd: true), division bars, or geometric edges.",
        items: {
          type: Type.OBJECT,
          properties: {
            x1: { type: Type.NUMBER },
            y1: { type: Type.NUMBER },
            x2: { type: Type.NUMBER },
            y2: { type: Type.NUMBER },
            color: { type: Type.STRING },
            strokeWidth: { type: Type.NUMBER },
            dashed: { type: Type.BOOLEAN },
            arrowStart: { type: Type.BOOLEAN },
            arrowEnd: { type: Type.BOOLEAN },
            label: { type: Type.STRING },
          },
          required: ["x1", "y1", "x2", "y2", "color"],
        },
      },
      shapes: {
        type: Type.ARRAY,
        description: "Circles or rectangles on the X-Y coordinate sheet.",
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "'circle' or 'rect'." },
            x: { type: Type.NUMBER, description: "Center x for circle, or bottom-left x for rect." },
            y: { type: Type.NUMBER, description: "Center y for circle, or bottom-left y for rect." },
            r: { type: Type.NUMBER, description: "Radius in math units (for circle)." },
            width: { type: Type.NUMBER, description: "Width in math units (for rect)." },
            height: { type: Type.NUMBER, description: "Height in math units (for rect)." },
            color: { type: Type.STRING },
            fill: { type: Type.STRING },
            dashed: { type: Type.BOOLEAN },
          },
          required: ["type", "x", "y", "color"],
        },
      },
      points: {
        type: Type.ARRAY,
        description: "Key coordinate markers (vertices, roots, intersections).",
        items: {
          type: Type.OBJECT,
          properties: {
            x: { type: Type.NUMBER },
            y: { type: Type.NUMBER },
            color: { type: Type.STRING },
            style: { type: Type.STRING, description: "'filled' or 'hollow'." },
            label: { type: Type.STRING },
          },
          required: ["x", "y", "color"],
        },
      },
      annotations: {
        type: Type.ARRAY,
        description:
          "Text, numbers, fractions, matrices, or equations placed at exact (x, y) positions. Use isLatex: true for KaTeX formatting like '\\\\frac{3}{4}' or '\\\\begin{bmatrix} 1 & 2 \\\\\\\\ 3 & 4 \\\\end{bmatrix}'.",
        items: {
          type: Type.OBJECT,
          properties: {
            x: { type: Type.NUMBER },
            y: { type: Type.NUMBER },
            content: { type: Type.STRING },
            isLatex: { type: Type.BOOLEAN },
            color: { type: Type.STRING },
            fontSize: { type: Type.STRING, description: "'sm', 'md', or 'lg'." },
            align: { type: Type.STRING, description: "'center', 'left', or 'right'." },
            background: { type: Type.BOOLEAN },
          },
          required: ["x", "y", "content", "color"],
        },
      },
      summary: {
        type: Type.STRING,
        description: "Optional brief 1-line note shown below the graph card.",
      },
    },
    required: ["title", "gridMode", "xMin", "xMax", "yMin", "yMax"],
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawMessages: IncomingChatMessage[] = Array.isArray(body?.messages)
      ? body.messages
      : [];
    const language: string = body?.language === "en" ? "en" : "th";
    const chatMode: "casual" | "tutor" =
      body?.chatMode === "casual" ? "casual" : "tutor";
    const customApiKey: string | undefined =
      body?.customApiKey || req.headers.get("x-gemini-api-key") || undefined;

    const rawPersona = body?.persona;
    const personaName =
      rawPersona && typeof rawPersona.name === "string"
        ? rawPersona.name.trim().slice(0, 120)
        : "";
    const personaDescription =
      rawPersona && typeof rawPersona.description === "string"
        ? rawPersona.description.trim().slice(0, 50000)
        : "";

    const validMessages = rawMessages.filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        ((typeof m.content === "string" && m.content.trim().length > 0) ||
          (Array.isArray(m.files) && m.files.length > 0))
    );

    if (validMessages.length === 0) {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "Please enter a message or attach a file before sending."
              : "กรุณาพิมพ์ข้อความหรือแนบไฟล์ก่อนส่ง",
        },
        { status: 400 }
      );
    }

    const buildUserParts = (m: IncomingChatMessage) => {
      const parts: any[] = [];
      const files = Array.isArray(m.files) ? m.files.slice(0, 5) : [];

      for (const f of files) {
        if (!f || typeof f !== "object") continue;
        const safeName =
          typeof f.name === "string" && f.name.trim()
            ? f.name.trim().slice(0, 120)
            : "attachment";

        if (
          (f.kind === "image" || f.kind === "pdf") &&
          typeof f.base64Data === "string" &&
          f.base64Data.length > 0
        ) {
          const cleanBase64 = f.base64Data.replace(/^data:[^;]+;base64,/, "");
          const safeMime =
            f.kind === "pdf"
              ? "application/pdf"
              : typeof f.mimeType === "string" && f.mimeType.startsWith("image/")
                ? f.mimeType
                : "image/jpeg";
          parts.push({
            inlineData: {
              mimeType: safeMime,
              data: cleanBase64,
            },
          });
        } else if (
          f.kind === "text" &&
          typeof f.textContent === "string" &&
          f.textContent.trim().length > 0
        ) {
          parts.push({
            text: `[Attached File: ${safeName}]\n${f.textContent.slice(0, 100000)}`,
          });
        } else {
          parts.push({
            text: `[Previously attached file: ${safeName}]`,
          });
        }
      }

      const trimmedText = typeof m.content === "string" ? m.content.trim() : "";
      if (trimmedText.length > 0) {
        parts.push({ text: trimmedText });
      } else if (parts.length > 0) {
        parts.push({
          text:
            language === "en"
              ? "Please read the attached homework image or file carefully and solve it, clearly showing both the final answer and step-by-step reasoning."
              : "โปรดอ่านรูปภาพหรือไฟล์การบ้านที่แนบมานี้อย่างละเอียด แล้วช่วยทำพร้อมแสดงทั้งคำตอบและวิธีคิดทีละขั้นตอนให้ชัดเจน",
        });
      }

      return parts;
    };

    const initialContents: any[] = validMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts:
        m.role === "assistant"
          ? [{ text: m.content }]
          : buildUserParts(m),
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
- INTERACTIVE COORDINATE CANVAS / MATH SHEET (\`render_math_canvas\`):
  - ONLY call \`render_math_canvas\` when the question involves **mathematics, calculation sciences, physics, chemistry, statistics, geometry, vectors, matrices, fractions layout, or quantitative sciences** that genuinely benefit from a visual graph or coordinate diagram. NEVER call it for casual chat, greetings, history, language, or general Q&A.
  - Choose \`gridMode\` deliberately:
    - Use \`"axes"\` for Cartesian graphs, plotted curves (\`functions\` using Math.js expressions like \`x^2 - 4\`), vectors (\`lines\` with \`arrowEnd: true\`), or physics/economics curves.
    - Use \`"invisible"\` for blank-paper spatial layouts controlled by hidden X-Y coordinates (e.g. stacked fractions, long division, matrix operations, vector components, geometric proofs without axes).
  - Use \`annotations\` with \`isLatex: true\` to place fractions (\`\\\\frac{a}{b}\`), matrices (\`\\\\begin{bmatrix} ... \\\\end{bmatrix}\`), vectors (\`\\\\vec{v}\`), and labeled numbers cleanly at exact \`(x, y)\` coordinates. Use distinct clear colors (\`#0284C7\`, \`#DC2626\`, \`#059669\`, \`#D97706\`, \`#7C3AED\`, \`#1F1E1D\`) and adjust \`xMin\`, \`xMax\`, \`yMin\`, \`yMax\`, \`xStep\`, \`yStep\`, and \`canvasHeight\` (\`"compact"\` / \`"standard"\` / \`"tall"\`) so every element has comfortable spacing without overlapping.
- NATURAL READABILITY & FORMATTING:
  - Write in clear, natural, human-friendly language. Avoid cluttering responses with horizontal divider lines (\`---\`), excessive nested \`###\`/\`####\` symbols, or raw computer-code syntax in normal explanations.
  - Only use fenced code blocks (\`\`\`) when the user specifically asks for programming code.
  - When writing fractions or formulas in text, either use simple readable notation (like \`2/3\`, \`×\`, \`÷\`) or wrap mathematical expressions cleanly in \`$...$\` / \`$$...$$\` so they render properly—never leave raw unescaped LaTeX commands like \`\\frac\` outside math delimiters.
- HOMEWORK IMAGES & ATTACHED FILES:
  - Whenever the user attaches homework photos, PDFs, or text/document files, carefully read every problem, number, diagram, or question shown inside them.
  - Solve each question thoroughly and clearly organize your response to show both the **Answer (คำตอบ)** and the **Step-by-Step Method / Reasoning (วิธีคิดทีละขั้นตอน)** so the student can follow and understand every step.
  - Still use \`calculate_math\`, \`render_data_table\`, and \`render_math_canvas\` whenever calculations, comparisons, or coordinate diagrams help explain the uploaded homework.
- STRICT RULE (NEVER VIOLATE): NEVER use any emojis, emoticons, or pictorial Unicode symbols anywhere in your output (no 😊, ✨, 🚀, ✅, 📌, 👉, 💡, 🔥, etc.). Output plain text and clean Markdown syntax only.
- Respond in the same language the user writes in (defaulting to English unless they write in Thai).`
        : `คุณคือ OpenSolver (QuizCraft AI) ผู้ช่วยด้านการเรียน การวิเคราะห์โจทย์ และติวเตอร์วิชาการที่ฉลาด ชัดเจน และแม่นยำ
- ตอบคำถามอย่างตรงประเด็น ถูกต้อง และอธิบายเป็นขั้นตอนเมื่อช่วยแก้โจทย์ คณิตศาสตร์ วิทยาศาสตร์ การเงิน การเขียนโค้ด หรือสรุปเนื้อหาบทเรียน
- การอ่านรูปภาพและไฟล์การบ้านที่แนบมา:
  - ทุกครั้งที่ผู้ใช้ส่งรูปภาพ PDF หรือไฟล์เอกสารการบ้านเข้ามา ให้อ่านโจทย์ ตัวเลข รูปภาพ หรือคำถามทุกข้อในไฟล์นั้นอย่างละเอียดรอบคอบ
  - แสดงผลลัพธ์อย่างเป็นระบบโดยระบุให้เห็นชัดเจนทั้ง **คำตอบ** และ **วิธีคิด / วิธีทำทีละขั้นตอน** เพื่อให้ผู้เรียนเข้าใจที่มาและการคำนวณทุกจุด
  - เรียกใช้ \`calculate_math\`, \`render_data_table\`, และ \`render_math_canvas\` ร่วมด้วยเมื่อโจทย์ในไฟล์มีสมการ การคำนวณ หรือกราฟที่ควรจำลอง
- การคำนวณคณิตศาสตร์จริงด้วย Math.js: ทุกครั้งที่มีการคิดเลข คำนวณสูตร (คณิต ฟิสิกส์ เคมี สถิติ การเงิน ฯลฯ) หรือผู้ใช้ส่งสูตร/โจทย์ตัวเลขมา:
  1. ระบุ **สูตรที่ใช้** ให้ชัดเจน
  2. **ดึงตัวแปรและค่าจากโจทย์** ออกมาให้ครบถ้วน
  3. **ต้องเรียกใช้เครื่องมือ \`calculate_math\` เสมอ** เพื่อนำตัวแปรไปแทนค่าในสูตรและคำนวณด้วย Math.js จริงๆ (ห้ามคิดเลขในใจเองสำหรับโจทย์ที่คำนวณได้)
  4. แสดงสูตร ตัวแปรที่ดึงมา ขั้นตอนการแทนค่าลงสูตร และคำตอบที่คำนวณได้จริงอย่างชัดเจน
- การ์ดตารางข้อมูลอัตโนมัติ (\`render_data_table\`):
  - ทุกครั้งที่มีการเปรียบเทียบข้อมูลตั้งแต่ 2 รายการขึ้นไป (เช่น เปรียบเทียบสูตร แนวคิด ข้อดี-ข้อเสีย สเปก ข้อมูลสถิติ) หรือจัดโครงสร้างข้อมูลแบบ Object/List หรือข้อมูลก้อนยาวๆ ให้ **เรียกใช้เครื่องมือ \`render_data_table\` โดยอัตโนมัติ** เพื่อส่งออกการ์ดตารางลงในแชท
  - ตรวจสอบให้ \`values\` ในทุกแถวมีจำนวนและลำดับตรงกับ \`columns\` เสมอ ข้อความในแต่ละช่องกระชับ อ่านง่าย และห้ามมีอีโมจิ
  - เมื่อเรียกใช้ \`render_data_table\` แล้ว **ห้ามเขียนตาราง Markdown ซ้ำข้อมูลชุดเดียวกันอีก** ให้สรุปประเด็นสำคัญหรือคำอธิบายประกอบสั้นๆ รอบการ์ดตารางแทน
- การ์ดกระดาษพิกัด X-Y และจำลองกราฟ/สมการ (\`render_math_canvas\`):
  - **เรียกใช้เฉพาะเมื่อเป็นวิชาคณิตศาสตร์ ฟิสิกส์ เคมี สถิติ วิศวกรรม เศรษฐศาสตร์ หรือศาสตร์การคำนวณที่ต้องใช้กราฟ เส้นโค้ง เวกเตอร์ เมทริกซ์ เศษส่วน หรือภาพจำลองเชิงพิกัดเท่านั้น** (ห้ามเรียกใช้ในการสนทนาทั่วไป ภาษา ประวัติศาสตร์ หรือคำถามที่ไม่ใช่สายคำนวณ/จำลองค่า)
  - เลือก \`gridMode\` ให้เหมาะกับเนื้อหา:
    - \`"axes"\`: มีแกน X-Y พร้อมตัวเลขและเส้นกริด สำหรับพล็อตกราฟสมการ (\`functions\` เช่น \`x^2 - 4\`, \`sin(x)\`), เส้นโค้ง (\`curves\`), เวกเตอร์ (\`lines\` ที่มี \`arrowEnd: true\`), หรือกราฟฟิกส์/จุดตัด
    - \`"invisible"\`: กระดาษขาวว่างที่มีพิกัด X-Y ล่องหนคอยจัดวางตำแหน่งตัวอักษร ตัวเลข เศษส่วน เมทริกซ์ และเส้นลากเชื่อมต่างๆ (เหมาะกับการแสดงวิธีทำเศษส่วน เมทริกซ์ การแยกตัวประกอบ หรือเรขาคณิตที่ไม่ต้องโชว์แกน)
  - วางข้อความ เลข เศษส่วน หรือเมทริกซ์ผ่าน \`annotations\` โดยตั้ง \`isLatex: true\` เมื่อเป็นนิพจน์คณิต (เช่น \`\\\\frac{3}{4}\`, \`\\\\begin{bmatrix} 1 & 2 \\\\\\\\ 3 & 4 \\\\end{bmatrix}\`, \`\\\\vec{v}\`) เลือกใช้สีที่อ่านง่ายชัดเจน (\`#0284C7\`, \`#DC2626\`, \`#059669\`, \`#D97706\`, \`#7C3AED\`, \`#1F1E1D\`) และกำหนดขอบเขต \`xMin\`, \`xMax\`, \`yMin\`, \`yMax\`, \`xStep\`, \`yStep\` รวมถึง \`canvasHeight\` (\`"compact"\` / \`"standard"\` / \`"tall"\`) ให้พอดีไม่ซ้อนทับกัน
- การเขียนข้อความให้อ่านเป็นธรรมชาติ (ห้ามใช้สัญลักษณ์รกรุงรัง):
  - เขียนคำอธิบายเป็นภาษาคนอ่านง่าย เป็นธรรมชาติ หลีกเลี่ยงการใช้เส้นคั่น \`---\` หรือหัวข้อ \`###\` / \`####\` พร่ำเพรื่อ และห้ามใส่บล็อกโค้ด (\`\`\`) ในคำอธิบายทั่วไปที่ไม่ใช่โค้ดโปรแกรม
  - สำหรับเศษส่วนหรือสูตรคณิตในข้อความ ให้เขียนแบบอ่านง่าย (เช่น \`2/3\`, \`×\`, \`÷\`) หรือครอบสมการให้ถูกต้องด้วย \`$...$\` / \`$$...$$\` เสมอ ห้ามปล่อยคำสั่งดิบอย่าง \`\\frac\` หลุดออกมานอกเครื่องหมายสมการเด็ดขาด
- กฎเหล็กเด็ดขาด: ห้ามใช้อิโมจิ (Emoji) หรือสัญลักษณ์รูปภาพใดๆ ทั้งสิ้นในคำตอบไม่ว่าจะกรณีใดๆ (ห้ามมี 😊, ✨, 🚀, ✅, 📌, 👉, 💡, 🔥, 👍 ฯลฯ) ให้ใช้เฉพาะตัวอักษรปกติที่อ่านง่ายเท่านั้น
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

    const modeDirective =
      chatMode === "casual"
        ? language === "en"
          ? `\n\nACTIVE CONVERSATION MODE: CASUAL CHAT + STUDY HELPER
1. You are in free-flowing Casual Chat mode: converse warmly, naturally, and genuinely like a real person talking with the user.
2. Open Role & Relationship Adoption: The user may ask you in chat to be anyone or adopt any role/relationship (for example, a partner, girlfriend/boyfriend, best friend, older sibling, or mentor). Step into that role naturally and directly through your tone, pronouns, affection/care, and personality.
3. STRICT ANTI-META RULE (NEVER VIOLATE): NEVER break immersion or use meta-labels such as "virtual girlfriend/boyfriend", "simulated partner", "AI partner", "roleplay", "simulated", "pretending", "in character", or "as an AI". Never mention or explain that a role is simulated—just talk naturally as that person.
4. Study & Homework Still Supported: Whenever the user asks a study question, math problem, science question, or homework in this mode, still help teach clearly and solve it accurately (using calculate_math, render_data_table, and render_math_canvas when relevant) while keeping your natural conversational vibe.`
          : `\n\nโหมดการสนทนาที่เลือกอยู่: คุยเล่น (คุยได้จริงเป็นธรรมชาติ + ยังช่วยสอนและทำการบ้านได้)
1. คุณอยู่ในโหมดคุยเล่น: พูดคุยโต้ตอบกับผู้ใช้ได้อย่างเป็นธรรมชาติ อบอุ่น เป็นกันเอง เหมือนคนคุยกันจริงๆ
2. เปิดรับทุกบทบาทที่ผู้ใช้ขอในแชท: ผู้ใช้สามารถขอให้คุณเป็นอะไรหรือใครก็ได้ในบทสนทนา (เช่น ขอให้เป็นแฟน คนรัก เพื่อนสนิท พี่ชาย/พี่สาว รุ่นพี่ หรือที่ปรึกษา) ให้สวมบทบาทนั้นทันทีอย่างเป็นธรรมชาติผ่านน้ำเสียง สรรพนาม ความใส่ใจ และคำพูดโดยตรง
3. กฎเหล็กห้ามหลุดบทบาทและห้ามพูดคำว่าจำลองเด็ดขาด: ห้ามพูดคำว่า "แฟนจำลอง", "คู่สนทนาจำลอง", "บทบาทสมมติ", "สวมบทบาท", "จำลองเป็น", "ในฐานะ AI", "ฉันเป็นเอไอ", "สมมติว่า" หรืออธิบายว่ากำลังจำลองบทบาทอยู่เด็ดขาด ให้พูดคุยตอบรับเหมือนเป็นคนๆ นั้นจริงๆ ตามธรรมชาติ
4. ยังสอนและช่วยทำการบ้านได้ตามปกติ: หากผู้ใช้ถามเรื่องเรียน โจทย์คณิตศาสตร์ วิทยาศาสตร์ หรือการบ้านในโหมดนี้ ให้ช่วยสอน อธิบาย และแก้โจทย์ให้ถูกต้องครบถ้วน (รวมถึงเรียกใช้ calculate_math, render_data_table, render_math_canvas ตามความเหมาะสม) โดยคงน้ำเสียงที่เป็นกันเองหรือสอดคล้องกับบทบาทที่คุยกันอยู่`
        : language === "en"
          ? `\n\nACTIVE CONVERSATION MODE: STRICT TUTOR MODE
1. You are in strict academic Tutor mode: focus 100% on teaching, explaining concepts, and solving problems or homework accurately and seriously.
2. NO casual chit-chat, banter, flirting, or playful roleplay. If the user tries to start casual small talk or asks you to act as a romantic partner/friend/character for fun, decline politely in one brief sentence and steer straight back to studying, questions, or homework.`
          : `\n\nโหมดการสนทนาที่เลือกอยู่: โหมดสอน (สอนและทำโจทย์อย่างจริงจัง ไม่คุยเล่น)
1. คุณอยู่ในโหมดสอนอย่างจริงจัง: มุ่งเน้นการสอน อธิบายเนื้อหา และช่วยทำโจทย์หรือการบ้านอย่างถูกต้อง แม่นยำ และเป็นวิชาการเท่านั้น
2. ห้ามคุยเล่นนอกเรื่อง ห้ามหยอกล้อ ห้ามสวมบทบาทเชิงชู้สาวหรือบทบาทบันเทิงใดๆ หากผู้ใช้ชวนคุยเล่นนอกเรื่อง หรือขอให้เป็นแฟน/เพื่อนคุยเล่น ให้ปฏิเสธอย่างสุภาพสั้นๆ 1 ประโยค แล้วชวนกลับมาที่เรื่องเรียน คำถาม หรือโจทย์การบ้านทันที`;

    const systemInstruction = `${baseInstruction}${personaDirective}${modeDirective}`;
    const tools = [
      {
        functionDeclarations: [
          calculateMathDeclaration,
          renderDataTableDeclaration,
          renderMathCanvasDeclaration,
        ],
      },
    ];

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        let lastEmittedStatus: StreamThinkingStage | null = null;
        const emitStatus = (status: StreamThinkingStage) => {
          if (lastEmittedStatus === status) return;
          lastEmittedStatus = status;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ status })}\n\n`)
          );
        };

        const mapToolToStatus = (
          toolName?: string
        ): StreamThinkingStage | null => {
          if (toolName === "calculate_math") return "calculating";
          if (toolName === "render_data_table") return "building_table";
          if (toolName === "render_math_canvas") return "drawing_graph";
          return null;
        };

        try {
          const currentContents: any[] = [...initialContents];
          const MAX_TOOL_ROUNDS = 5;

          emitStatus("thinking");

          for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            if (round > 0) {
              emitStatus("composing");
            }

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
                    const nextStatus = mapToolToStatus(part.functionCall.name);
                    if (nextStatus) emitStatus(nextStatus);
                  }
                }
              } else if (
                Array.isArray(c.functionCalls) &&
                c.functionCalls.length > 0
              ) {
                for (const fc of c.functionCalls) {
                  roundModelParts.push({ functionCall: fc });
                  roundFunctionCalls.push(fc);
                  const nextStatus = mapToolToStatus(fc.name);
                  if (nextStatus) emitStatus(nextStatus);
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

              if (fc.name === "render_math_canvas") {
                const normalizedCanvas = normalizeMathCanvasToolArgs(
                  fc.args,
                  `${Date.now()}-${round}-${fcIdx}`
                );
                if (normalizedCanvas) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ canvas: normalizedCanvas })}\n\n`
                    )
                  );
                  return {
                    functionResponse: {
                      id: fc.id,
                      name: fc.name,
                      response: {
                        ok: true,
                        title: normalizedCanvas.title,
                        gridMode: normalizedCanvas.gridMode,
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
                        "Invalid canvas data: include at least one function, curve, line, shape, point, or annotation.",
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
        "X-Accel-Buffering": "no",
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
