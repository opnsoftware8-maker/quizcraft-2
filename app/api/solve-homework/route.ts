import { NextRequest, NextResponse } from "next/server";
import { Type } from "@google/genai";
import { generateContentWithFallback } from "@/lib/gemini";
import { StructuredHomeworkSolution } from "@/types/exam";

const homeworkSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "ชื่อวิชาและหัวข้อโจทย์ปัญหา เช่น เฉลยวิธีทำ: ฟิสิกส์ เรื่องการเคลื่อนที่แนวตรง หรือ เฉลยและวิเคราะห์โจทย์คณิตศาสตร์",
    },
    subject: {
      type: Type.STRING,
      description: "วิชา เช่น คณิตศาสตร์, ฟิสิกส์, เคมี, ชีววิทยา, ภาษาอังกฤษ, ภาษาไทย, สังคมศึกษา",
    },
    difficultyLevel: {
      type: Type.STRING,
      description: "ระดับความยาก เช่น ระดับมัธยมศึกษาตอนต้น, ระดับมัธยมปลาย, ระดับมหาวิทยาลัย, หรือ ระดับประถม",
    },
    overview: {
      type: Type.STRING,
      description: "สรุปภาพรวมและกลยุทธ์การแก้โจทย์ใน 2-3 ประโยค อธิบายว่าโจทย์ข้อนี้วัดความรู้อะไร และมีแนวทางในการคิดอย่างไร",
    },
    solutions: {
      type: Type.ARRAY,
      description: "รายการเฉลยวิธีทำทีละข้อ (หากมีหลายข้อในรูป/ชีท ให้แยกเป็นรายข้อตามลำดับ)",
      items: {
        type: Type.OBJECT,
        properties: {
          problemNumber: {
            type: Type.STRING,
            description: "หมายเลขข้อ เช่น ข้อที่ 1, ข้อ 2, คำถามที่ 1",
          },
          problemStatement: {
            type: Type.STRING,
            description: "โจทย์คำถามหรือสิ่งที่ต้องการหาอย่างชัดเจน",
          },
          givenInfo: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "สิ่งที่โจทย์กำหนดให้ หรือตัวแปรที่ทราบค่า เช่น ['ความเร็วต้น u = 0 m/s', 'มวล m = 2 kg']",
          },
          toFind: {
            type: Type.STRING,
            description: "สิ่งที่โจทย์ต้องการหา เช่น 'ระยะทาง (s)' หรือ 'ใจความสำคัญของบทความ'",
          },
          mainFormulaOrConcept: {
            type: Type.STRING,
            description: "สูตรหลัก กฎ หรือทฤษฎีที่นำมาใช้ เช่น 's = ut + 1/2at²' หรือ 'กฎข้อที่ 2 ของนิวตัน F = ma'",
          },
          steps: {
            type: Type.ARRAY,
            description: "ขั้นตอนแสดงวิธีทำทีละสเต็ปอย่างละเอียด ลอกตามเข้าใจง่ายที่สุด",
            items: {
              type: Type.OBJECT,
              properties: {
                stepNumber: {
                  type: Type.INTEGER,
                  description: "ลำดับขั้นตอน เช่น 1, 2, 3",
                },
                title: {
                  type: Type.STRING,
                  description: "ชื่อขั้นตอน เช่น 'สเต็ป 1: แปลงหน่วยและตั้งสมการหลัก', 'สเต็ป 2: แทนค่าลงในสูตร'",
                },
                explanation: {
                  type: Type.STRING,
                  description: "คำอธิบายวิธีคิด บรรยายกระบวนการให้เข้าใจง่าย ลอกตามได้ทันที",
                },
                calculation: {
                  type: Type.STRING,
                  description: "การคำนวณ หรือการแทนค่าสมการแบบชัดเจน บรรทัดต่อบรรทัด (ถ้ามี)",
                },
              },
              required: ["stepNumber", "title", "explanation"],
            },
          },
          finalAnswer: {
            type: Type.STRING,
            description: "คำตอบสุดท้ายแบบชัดเจน สรุปตรงประเด็น มองเห็นได้ทันที เช่น 'ตอบ 25 เมตร' หรือ 'ตอบ ข้อ ค. ...'",
          },
          verification: {
            type: Type.STRING,
            description: "การตรวจทานคำตอบสั้นๆ หรือการเช็คความสมเหตุสมผลของผลลัพธ์",
          },
          tipsOrTraps: {
            type: Type.STRING,
            description: "ข้อควรระวัง หรือจุดที่คนมักผิดพลาด (Common traps/mistakes) หรือเทคนิคลัด",
          },
        },
        required: ["problemStatement", "steps", "finalAnswer"],
      },
    },
    overallKeyTakeaway: {
      type: Type.STRING,
      description: "สรุปแก่นความรู้ที่ได้จากแบบฝึกหัดนี้ 2-3 ข้อ เพื่อใช้จำไปทำข้อสอบ",
    },
    rawMarkdownExport: {
      type: Type.STRING,
      description: "ข้อความเฉลยทั้งหมดในรูปแบบ Markdown ที่จัดหัวข้อ ลำดับข้อ สเต็ปวิธีทำ และคำตอบไว้อย่างเป็นระเบียบสวยงาม สำหรับคัดลอก",
    },
  },
  required: ["title", "subject", "overview", "solutions", "overallKeyTakeaway"],
};

function buildMarkdownFromSolution(sol: StructuredHomeworkSolution, lang: string = "th"): string {
  const isEn = lang === "en";
  let md = `# ${sol.title || (isEn ? "Problem Solution & Analysis" : "เฉลยวิธีทำและวิเคราะห์โจทย์ปัญหา")}\n\n`;
  md += `**${isEn ? "Subject:" : "วิชา:"}** ${sol.subject || (isEn ? "General" : "ทั่วไป")} | **${isEn ? "Difficulty Level:" : "ระดับ:"}** ${sol.difficultyLevel || (isEn ? "Standard" : "ทั่วไป")}\n\n`;
  md += `## ${isEn ? "Overview & Strategy" : "ภาพรวม & กลยุทธ์การทำโจทย์"}\n${sol.overview}\n\n`;

  sol.solutions.forEach((item, idx) => {
    md += `### ${item.problemNumber || (isEn ? `Problem ${idx + 1}` : `ข้อที่ ${idx + 1}`)}: ${item.problemStatement}\n\n`;
    if (item.givenInfo && item.givenInfo.length > 0) {
      md += `**${isEn ? "Given Information:" : "สิ่งที่โจทย์กำหนดให้:"}**\n`;
      item.givenInfo.forEach((g) => {
        md += `- ${g}\n`;
      });
      md += `\n`;
    }
    if (item.toFind) {
      md += `**${isEn ? "To Find:" : "สิ่งที่ต้องหา:"}** ${item.toFind}\n\n`;
    }
    if (item.mainFormulaOrConcept) {
      md += `**${isEn ? "Formula / Principle Used:" : "สูตร/หลักการที่ใช้:"}** ${item.mainFormulaOrConcept}\n\n`;
    }
    md += `#### ${isEn ? "Step-by-Step Method:" : "วิธีทำทีละสเต็ป (Step-by-Step):"}\n`;
    item.steps.forEach((st) => {
      md += `**${st.title || (isEn ? `Step ${st.stepNumber}` : `สเต็ป ${st.stepNumber}`)}**\n`;
      md += `${st.explanation}\n`;
      if (st.calculation) {
        md += `\`\`\`text\n${st.calculation}\n\`\`\`\n`;
      }
      md += `\n`;
    });
    md += `**👉 ${isEn ? "Final Answer:" : "คำตอบสุดท้าย:"}** ${item.finalAnswer}\n\n`;
    if (item.tipsOrTraps) {
      md += `*⚠️ ${isEn ? "Pitfalls & Traps:" : "ข้อควรระวัง:"}* ${item.tipsOrTraps}\n\n`;
    }
    if (item.verification) {
      md += `*${isEn ? "Verification:" : "การตรวจทานคำตอบ:"}* ${item.verification}\n\n`;
    }
    md += `---\n\n`;
  });

  md += `## ${isEn ? "Key Takeaways" : "สรุปแก่นความรู้สำคัญ (Key Takeaways)"}\n${sol.overallKeyTakeaway}\n`;
  return md;
}

export async function POST(req: NextRequest) {
  try {
    const { problemText, promptInstruction, imageBase64, imageMimeType, images, customApiKey, language = "th" } = await req.json();
    const isEn = language === "en";

    // Gather all images (supports both multi-image array and legacy single image)
    const allImages: Array<{ base64: string; mimeType: string }> = [];

    if (Array.isArray(images) && images.length > 0) {
      for (const img of images) {
        const rawData = img.dataUrl || img.base64 || "";
        if (rawData) {
          const cleanBase64 = rawData.replace(/^data:image\/\w+;base64,/, "");
          allImages.push({
            base64: cleanBase64,
            mimeType: img.mimeType || img.type || "image/jpeg",
          });
        }
      }
    } else if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      allImages.push({
        base64: cleanBase64,
        mimeType: imageMimeType || "image/jpeg",
      });
    }

    if (!problemText && allImages.length === 0) {
      return NextResponse.json(
        { error: "กรุณาระบุข้อความโจทย์หรืออัปโหลดรูปภาพโจทย์ปัญหา" },
        { status: 400 }
      );
    }

    const headerApiKey = req.headers.get("x-gemini-api-key") || undefined;
    const effectiveApiKey = customApiKey || headerApiKey;

    const userInstruction = promptInstruction?.trim() || "ตอบเฉลยละเอียด พร้อมแสดงวิธีทำทีละขั้นตอนอย่างชัดเจน";

    const systemPrompt = `คุณคือ "QuizCraft Problem Solver & Academic Specialist" ผู้เชี่ยวชาญด้านการวิเคราะห์และแก้โจทย์ปัญหาทางวิชาการ
เป้าหมายสำคัญที่สุด: จัดระเบียบเนื้อหาให้เป็นระบบ แยกหัวข้ออย่างชัดเจน อ่านง่าย เป็นขั้นตอน 1, 2, 3... เพื่อให้ผู้เรียนและผู้ใช้งานทำความเข้าใจโครงสร้างวิธีทำได้อย่างถูกต้อง แม่นยำ และเป็นลำดับขั้นตอน

แนวทางการทำงานอย่างเคร่งครัด:
1. วิเคราะห์โจทย์จากรูปภาพเอกสาร/โจทย์ปัญหา (ซึ่งอาจมีหลายรูป/หลายหน้า) หรือจากข้อความคำถามที่ได้รับ
2. หากในโจทย์มีหลายข้อ (เช่น ข้อ 1, ข้อ 2 หรือ ข้อย่อย ก, ข) ให้แยกแสดงวิธีทำเป็นแต่ละข้อใน 'solutions' อย่างเป็นสัดส่วน
3. ในแต่ละข้อ ต้องระบุ:
   - 'problemStatement': คำถามหรือสิ่งที่โจทย์ถาม
   - 'givenInfo': สิ่งที่โจทย์กำหนดมาให้ (ตัวแปรและหน่วย)
   - 'toFind': สิ่งที่ต้องการหา
   - 'mainFormulaOrConcept': สูตร กฎ หรือทฤษฎีที่ใช้แก้โจทย์
   - 'steps': ขั้นตอนวิธีทำทีละขั้นตอนอย่างละเอียด ชัดเจน พร้อมคำอธิบายและการคำนวณแทนค่า
   - 'finalAnswer': คำตอบสุดท้ายที่ชัดเจน เด่นชัด ไม่คลุมเครือ
   - 'tipsOrTraps': ข้อควรระวัง จุดที่มักสับสน หรือเทคนิคลัด
4. ให้ความสำคัญกับคำสั่งพิเศษของผู้ใช้ข้อนี้: "${userInstruction}"
${isEn 
  ? "5. LANGUAGE DIRECTIVE: Output the entire solution (title, subject, overview, steps, explanations, formulas, final answers, traps, and takeaways) in natural, fluent, academically rigorous English."
  : "5. ภาษาที่ใช้: ภาษาไทยที่ถูกต้อง ชัดเจน เป็นทางการ สุภาพ อธิบายเป็นลำดับขั้น"
}`;

    const contents: any[] = [systemPrompt];

    // Add all uploaded images to contents
    for (const img of allImages) {
      contents.push({
        inlineData: {
          data: img.base64,
          mimeType: img.mimeType,
        },
      });
    }

    // Add problem text if provided
    if (problemText) {
      contents.push(`\n[โจทย์ / ข้อมูลคำถาม]:\n${problemText}`);
    } else {
      if (allImages.length > 1) {
        contents.push(`\n[โจทย์ปัญหาจากเอกสาร ${allImages.length} รูป/หน้า]: โปรดอ่านโจทย์และเนื้อหาคำถามจากรูปภาพทั้งหมดที่แนบมานี้ วิเคราะห์โจทย์และเฉลยวิธีทำทีละขั้นตอนอย่างเป็นระเบียบและครบถ้วนทุกข้อ`);
      } else {
        contents.push(`\n[โจทย์ปัญหาจากเอกสาร]: โปรดอ่านโจทย์และคำถามจากรูปภาพที่แนบมานี้ แล้วเฉลยวิธีทำอย่างละเอียดเป็นระบบตามลำดับขั้นตอน`);
      }
    }

    const response = await generateContentWithFallback({
      contents: contents,
      apiKey: effectiveApiKey,
      config: {
        responseMimeType: "application/json",
        responseSchema: homeworkSchema,
      },
    });

    const responseText = response.text || "";
    let solutionData: StructuredHomeworkSolution;

    try {
      solutionData = JSON.parse(responseText);
    } catch {
      // In case of non-JSON response, create structured fallback
      solutionData = {
        title: "เฉลยวิธีทำและวิเคราะห์โจทย์ปัญหา",
        subject: "ทั่วไป",
        difficultyLevel: "ระดับทั่วไป",
        overview: "คำอธิบายวิธีทำและเฉลยคำตอบอย่างละเอียดตามลำดับขั้นตอน",
        solutions: [
          {
            problemNumber: "ข้อที่ 1",
            problemStatement: problemText || "โจทย์ปัญหาจากภาพหรือเอกสารที่แนบมา",
            steps: [
              {
                stepNumber: 1,
                title: "วิธีทำและคำอธิบายอย่างละเอียด",
                explanation: responseText || "ไม่พบเนื้อหาคำตอบ",
              },
            ],
            finalAnswer: "ดูรายละเอียดวิธีทำข้างต้น",
          },
        ],
        overallKeyTakeaway: "ทบทวนขั้นตอนและแนวคิดเพื่อความเข้าใจที่แม่นยำยิ่งขึ้น",
      };
    }

    if (!solutionData.rawMarkdownExport) {
      solutionData.rawMarkdownExport = buildMarkdownFromSolution(solutionData, language);
    }

    return NextResponse.json({
      solution: solutionData,
      answer: solutionData.rawMarkdownExport,
      usedPrompt: userInstruction,
    });
  } catch (error: any) {
    console.error("Error solving homework:", error);
    return NextResponse.json(
      { error: error?.message || "เกิดข้อผิดพลาดในการประมวลผลคำตอบ" },
      { status: 500 }
    );
  }
}
