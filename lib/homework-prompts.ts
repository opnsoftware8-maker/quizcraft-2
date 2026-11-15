export interface PromptPreset {
  id: number;
  text: string;
  category: "step-by-step" | "exam-prep" | "summary" | "language" | "science-math" | "critical";
  tag: string;
}

export const HOMEWORK_PROMPT_PRESETS_EN: PromptPreset[] = [
  { id: 1, text: "Provide detailed solutions showing clear step-by-step calculations and principles.", category: "step-by-step", tag: "Step-by-Step" },
  { id: 2, text: "Explain simply with intuitive real-world analogies and beginner-friendly intuition.", category: "step-by-step", tag: "Intuitive" },
  { id: 3, text: "Translate and break down key technical terms, grammar patterns, and etymology.", category: "language", tag: "Vocab & Grammar" },
  { id: 4, text: "Diagnose common mistakes in this problem, explain why they occur, and show the fix.", category: "critical", tag: "Error Analysis" },
  { id: 5, text: "Summarize necessary formulas, constants, and speed-solving mnemonic shortcuts.", category: "science-math", tag: "Formulas & Shortcuts" },
  { id: 6, text: "Draft an exemplary written response scoring full marks according to standard rubrics.", category: "exam-prep", tag: "Full-Mark Rubric" },
  { id: 7, text: "Explain the underlying theory and detail why each alternative choice is invalid.", category: "critical", tag: "Distractor Analysis" },
  { id: 8, text: "Summarize as a structured outline / mind-map readable in under 2 minutes.", category: "summary", tag: "Quick Mindmap" },
  { id: 9, text: "Solve this equation while annotating the mathematical theorem used on each line.", category: "science-math", tag: "Equation Steps" },
  { id: 10, text: "Create 2 parallel practice questions mirroring this exact conceptual structure.", category: "exam-prep", tag: "Parallel Practice" },
  { id: 11, text: "Provide the solution in academic English highlighting advanced C1/B2 scientific terms.", category: "language", tag: "Academic English" },
  { id: 12, text: "Distill into 5 high-yield Question-and-Answer (Q&A) pairs for rapid review.", category: "summary", tag: "High-Yield Q&A" },
  { id: 13, text: "Highlight tricky deceptive exam traps in this topic and how to spot them.", category: "exam-prep", tag: "Exam Traps" },
  { id: 14, text: "Compare a 1-minute speed shortcut versus the standard textbook derivation.", category: "science-math", tag: "Shortcut vs Derivation" },
  { id: 15, text: "Synthesize the cause-and-effect relationships and historical/social implications.", category: "critical", tag: "Cause & Effect" },
  { id: 16, text: "Construct a side-by-side comparison table contrasting key similarities and differences.", category: "critical", tag: "Comparison Table" },
];

export const HOMEWORK_PROMPT_PRESETS_TH: PromptPreset[] = [
  { id: 1, text: "ตอบเฉลยละเอียด พร้อมแสดงวิธีทำทีละขั้นตอนอย่างชัดเจน", category: "step-by-step", tag: "วิธีทำทีละขั้น" },
  { id: 2, text: "อธิบายให้เข้าใจง่ายๆ สำหรับเด็ก ม.ปลาย พร้อมยกตัวอย่างเปรียบเทียบในชีวิตจริง", category: "step-by-step", tag: "เข้าใจง่าย" },
  { id: 3, text: "แปลเป็นภาษาไทยอย่างสละสลวย พร้อมถอดคำศัพท์ยากและโครงสร้างไวยากรณ์สำคัญ", category: "language", tag: "แปล & แกรมม่า" },
  { id: 4, text: "ตรวจหาจุดผิดพลาดในโจทย์หรือคำตอบนี้ แล้วอธิบายว่าทำไมถึงผิด พร้อมวิธีแก้ที่ถูกต้อง", category: "critical", tag: "ตรวจจุดผิด" },
  { id: 5, text: "สรุปสูตรที่ต้องใช้ และหลักการจำแบบเทคนิคลัดสำหรับทำข้อสอบเร็ว", category: "science-math", tag: "สูตรลัด" },
  { id: 6, text: "ช่วยเขียนคำตอบแบบข้อสอบอัตนัย (เขียนตอบ) ให้ได้คะแนนเต็ม 10 ตามเกณฑ์คุณครู", category: "exam-prep", tag: "เขียนตอบเต็ม 10" },
  { id: 7, text: "อธิบายทฤษฎีเบื้องหลังข้อนี้ และทำไมตัวเลือกข้ออื่นถึงเป็นคำตอบที่ผิด", category: "critical", tag: "วิเคราะห์ตัวเลือก" },
  { id: 8, text: "ช่วยเขียนสรุปแบบ Mindmap ข้อความสั้นๆ ให้อ่านทบทวนใน 2 นาที", category: "summary", tag: "สรุป Mindmap" },
  { id: 9, text: "ช่วยแก้สมการนี้ พร้อมบอกว่าแต่ละบรรทัดใช้กฎหรือทฤษฎีบทอะไร", category: "science-math", tag: "แก้สมการ" },
  { id: 10, text: "ตั้งโจทย์ข้อสอบคู่ขนานที่มีแนวทางคล้ายข้อนี้มาให้ลองฝึกทำ 2 ข้อ", category: "exam-prep", tag: "โจทย์จำลอง" },
  { id: 11, text: "เขียนอธิบายคำตอบแบบภาษาอังกฤษล้วน พร้อมคำศัพท์ระดับ C1/B2 สำหรับสอบวัดระดับ", category: "language", tag: "Eng ระดับสูง" },
  { id: 12, text: "สรุปเป็นคำถาม-คำตอบ (Q&A) 5 ข้อสำคัญจากเนื้อหานี้", category: "summary", tag: "Q&A จำแม่น" },
  { id: 13, text: "บอกจุดหลอกที่ข้อสอบชอบเอามาลวงในเนื้อหาข้อนี้ พร้อมวิธีสังเกตไม่ให้โดนหลอก", category: "exam-prep", tag: "ระวังข้อสอบหลอก" },
  { id: 14, text: "อธิบายวิธีคิดข้อนี้ด้วยวิธีลัด 1 นาที และวิธีคิดแบบมาตรฐานฉบับโรงเรียน", category: "science-math", tag: "วิธีลัด vs ทางตรง" },
  { id: 15, text: "ช่วยเรียบเรียงเป็นเรียงความสั้นๆ ภาษาทางการ สุภาพ สำหรับส่งครู", category: "language", tag: "ส่งงานครู" },
  { id: 16, text: "วิเคราะห์ข้อดี ข้อเสีย และผลกระทบที่เกี่ยวข้องกับประเด็นในโจทย์นี้", category: "critical", tag: "วิเคราะห์รอบด้าน" },
  { id: 17, text: "ช่วยแปลคำศัพท์เฉพาะทาง (Technical Terms) ทั้งหมดในนี้ พร้อมคำอธิบายสั้นๆ", category: "language", tag: "ศัพท์เทคนิค" },
  { id: 18, text: "อธิบายข้อนี้ให้คนที่ไม่เคยเรียนวิชานี้มาก่อนสามารถเข้าใจได้ใน 3 นาที", category: "step-by-step", tag: "ปูพื้นฐาน" },
  { id: 19, text: "ดึงสูตรเคมี/ฟิสิกส์ หน่วยวัด และค่าคงที่ทั้งหมดที่เกี่ยวข้องกับข้อนี้ออกมา", category: "science-math", tag: "หน่วย & ค่าคงที่" },
  { id: 20, text: "ช่วยคิดกลอน หรือคำคล้องจองช่วยจำเนื้อหานี้ให้จำขึ้นใจไม่ลืม", category: "summary", tag: "คำกลอนช่วยจำ" },
  { id: 21, text: "เก็งแนวข้อสอบเข้ามหาวิทยาลัย (TCAS/A-Level) จากหัวข้อนี้ให้หน่อย", category: "exam-prep", tag: "เก็งข้อสอบ TCAS" },
  { id: 22, text: "อธิบายขั้นตอนของปฏิกิริยา/กระบวนการนี้เป็นลำดับ 1, 2, 3 ให้เห็นภาพชัดเจน", category: "step-by-step", tag: "ขั้นตอน 1-2-3" },
  { id: 23, text: "ช่วยตรวจไวยากรณ์ (Grammar Check) และแก้ไขประโยคให้เป็นภาษาอังกฤษที่ถูกต้อง", category: "language", tag: "ตรวจแกรมม่า" },
  { id: 24, text: "ถ้าโจทย์เปลี่ยนตัวเลขหรือเงื่อนไขตรงนี้ ผลลัพธ์จะเปลี่ยนไปยังไงบ้าง", category: "critical", tag: "คิดเชิงประยุกต์" },
  { id: 25, text: "ช่วยสรุปประเด็นสำคัญของเนื้อหานี้เป็น Bullet Points ไม่เกิน 5 ข้อ", category: "summary", tag: "สรุป 5 ข้อจบ" },
  { id: 26, text: "เขียนคำตอบสำหรับการพรีเซนต์หน้าห้องเรียน ให้กระชับ น่าสนใจ และผู้ฟังเข้าใจง่าย", category: "step-by-step", tag: "บทพรีเซนต์" },
  { id: 27, text: "อธิบายความเชื่อมโยงของเนื้อหานี้กับบทเรียนก่อนหน้าและบทเรียนถัดไป", category: "summary", tag: "เชื่อมโยงบทเรียน" },
  { id: 28, text: "บอกเทคนิคการตัดช้อยส์ตัวเลือกข้อสอบข้อนี้ โดยไม่ต้องคำนวณจนจบ", category: "exam-prep", tag: "เทคนิคตัดช้อยส์" },
  { id: 29, text: "วาดโครงสร้างแผนภาพตัวหนังสือ (Text Diagram / ASCII) อธิบายการไหลของระบบนี้", category: "step-by-step", tag: "แผนภาพไดอะแกรม" },
  { id: 30, text: "ช่วยแต่งตัวอย่างบทสนทนาสถานการณ์จริงที่นำประโยค/คำศัพท์นี้ไปใช้", category: "language", tag: "บทสนทนาจริง" },
  { id: 31, text: "วิเคราะห์สาเหตุและผลลัพธ์ (Cause & Effect) ของเหตุการณ์ทางประวัติศาสตร์/สังคมนี้", category: "critical", tag: "สาเหตุ & ผลลัพธ์" },
  { id: 32, text: "ช่วยเปรียบเทียบความเหมือนและความต่างของ 2 สิ่งนี้ในรูปแบบตาราง", category: "critical", tag: "ตารางเปรียบเทียบ" },
  { id: 33, text: "ช่วยเขียนโค้ดแก้ปัญหานี้ พร้อมคอมเมนต์อธิบายแต่ละบรรทัด (หากเป็นโจทย์คอมพิวเตอร์)", category: "science-math", tag: "โค้ด & อัลกอริทึม" },
  { id: 34, text: "บอกสูตรคูณ ตัวประกอบ หรือเลขยกกำลังที่ต้องระวังเวลาคิดเลขข้อนี้", category: "science-math", tag: "ระวังเลขผิด" },
  { id: 35, text: "ช่วยทวนคำถามเพื่อยืนยันความเข้าใจก่อน แล้วค่อยให้คำตอบที่กระชับที่สุด", category: "step-by-step", tag: "คำตอบตรงจุด" },
  { id: 36, text: "สร้างเช็คลิสต์ 3 ข้อที่ต้องตรวจสอบก่อนจะกดส่งคำตอบข้อนี้", category: "critical", tag: "เช็คลิสต์ก่อนส่ง" },
  { id: 37, text: "แปลสำนวน/สุภาษิตนี้ พร้อมบอกบริบทที่ถูกต้องในการนำไปใช้", category: "language", tag: "สำนวน & บริบท" },
  { id: 38, text: "อธิบายข้อคิด คติสอนใจ หรือประโยชน์ที่ได้จากการเรียนรู้เรื่องนี้", category: "summary", tag: "ข้อคิดที่ได้" },
  { id: 39, text: "จำลองคำถามที่ครูอาจจะถามสุ่มในห้องเรียนจากเนื้อหานี้ พร้อมแนวทางตอบ", category: "exam-prep", tag: "เตรียมตอบครู" },
  { id: 40, text: "สรุปสาระสำคัญเป็นบัตรคำศัพท์ (Flashcard Concept) พร้อมคำนิยามสั้น 1 ประโยค", category: "summary", tag: "บัตรคำจำแม่น" },
  { id: 41, text: "ตอบแบบสไตล์ติวเตอร์ใจดี ให้กำลังใจ พร้อมบอกว่า 'ทำได้ดีแล้ว สู้ๆ นะ!'", category: "step-by-step", tag: "ติวเตอร์อบอุ่น" }
];

export const HOMEWORK_PROMPT_PRESETS = HOMEWORK_PROMPT_PRESETS_TH;

export function getHomeworkPromptPresets(lang?: "en" | "th"): PromptPreset[] {
  if (lang === "en") return HOMEWORK_PROMPT_PRESETS_EN;
  return HOMEWORK_PROMPT_PRESETS_TH;
}

export function getRandomPrompt(lang?: "en" | "th"): PromptPreset {
  const list = getHomeworkPromptPresets(lang);
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}
