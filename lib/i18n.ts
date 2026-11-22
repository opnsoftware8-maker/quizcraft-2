export type Language = "en" | "th";

export function detectIsThailandRegion(): boolean {
  if (typeof window === "undefined") return false;

  try {
    // 1. Timezone detection (Thailand is 'Asia/Bangkok')
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (timeZone === "Asia/Bangkok" || timeZone.toLowerCase().includes("bangkok")) {
      return true;
    }

    // 2. Browser language / locale detection
    const navLangs = navigator.languages || [navigator.language || ""];
    const isThaiLocale = navLangs.some(
      (lang) =>
        lang.toLowerCase().startsWith("th") ||
        lang.toLowerCase().includes("-th") ||
        lang.toLowerCase() === "th"
    );
    if (isThaiLocale) {
      return true;
    }

    // 3. Formatter locale check
    const resolvedLocale = Intl.DateTimeFormat().resolvedOptions().locale || "";
    if (resolvedLocale.toLowerCase().startsWith("th")) {
      return true;
    }
  } catch (e) {
    // ignore
  }

  return false;
}

export function detectInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";

  try {
    const saved = localStorage.getItem("quizcraft_lang_v1");
    if (saved === "en" || saved === "th") {
      return saved;
    }
  } catch (e) {
    // ignore
  }

  // If user is located in Thailand or has Thai system locale -> 'th'
  // Otherwise default to English -> 'en' (as instructed: "หากไม่ใช่ก็เป็นภาษาอังกฤษ")
  if (detectIsThailandRegion()) {
    return "th";
  }

  return "en";
}

export const DICTIONARY = {
  en: {
    // App Branding
    appName: "QuizCraft",

    // Navigation & Header
    navSolve: "Problem Solver",
    navQuiz: "Exam Studio",
    navAnalytics: "Analytics",
    navApiKey: "API Key",
    navReset: "New Session",
    navLangTh: "ไทย",
    navLangEn: "EN",
    navLangTitle: "Switch Language / เปลี่ยนภาษา",

    // Hub Tabs
    hubTabSolveTitle: "Problem Solver & Step Analysis",
    hubTabSolveDesc: "Enter equations, science questions, or photos to get verified step-by-step methods",
    hubTabExamTitle: "Exam Generator & Study Summary",
    hubTabExamDesc: "Turn notes into timed mock exams, flashcards, or executive summaries",

    // Hero Carousel
    hero1Badge: "AI Problem Solver Studio",
    hero1Title: "Step-by-step problem solver with clear formulas & logic",
    hero1Desc: "Type equations or upload photos of worksheets. Get step-by-step breakdowns, formulas, and verified solutions in seconds.",
    hero1Btn: "Start Solving Now",

    hero2Badge: "Mock Exam Generator",
    hero2Title: "Generate timed practice exams with deceptive distractors",
    hero2Desc: "Turn study notes into timed multi-choice tests, complete with detailed answer keys and diagnostic performance analytics.",
    hero2Btn: "Create Practice Exam",

    hero3Badge: "Active Recall Flashcards",
    hero3Title: "Master key concepts with spaced-repetition flashcards",
    hero3Desc: "Interactive flip cards with exam traps, keyboard navigation shortcuts, and one-click Anki TSV export.",
    hero3Btn: "Practice Flashcards",

    hero4Badge: "Executive Study Summary",
    hero4Title: "1-minute executive summary & high-yield exam traps",
    hero4Desc: "Condense long chapters into high-yield study sheets highlighting core formulas, traps, and rapid-recall Q&A.",
    hero4Btn: "Read Study Summaries",

    // Homework Solver Section
    solverTitle: "Structured Problem Solver & Analysis",
    solverSubtitle: "Enter equations, science questions, or upload worksheet photos to generate structured, step-by-step solutions with verified formulas and final answers.",
    solverClearBtn: "Clear",
    solverDropTitle: "Upload worksheet photos (multi-image supported)",
    solverDropHint: "Drag and drop photos here, or click to browse files (PNG, JPG, WebP)",
    solverUploadedCount: "Uploaded {count} file(s)",
    solverRemoveAll: "Remove all",
    solverProblemLabel: "Problem Statement / Additional Details:",
    solverProblemPlaceholder: "Enter math equations, physics or chemistry problems, or paste assignment text here...",
    solverPresetsLabel: "Explanation Style & Prompt Presets:",
    solverCustomPromptLabel: "Additional Custom Prompt / Rules:",
    solverCustomPromptPlaceholder: "e.g. Show 1-minute shortcut method, explain for beginners, check grammar...",
    solverSubmitBtn: "Solve Problem & Show Steps",
    solverLoadingText: "Analyzing problem & computing step-by-step solution...",
    solverCharCount: "characters",
    solverEmptyError: "Please enter a problem or upload at least one image.",

    // Solution View
    solutionHeaderBadge: "Step-by-Step Problem Solution",
    solutionHeaderDesc: "Structured breakdown displaying principles, step-by-step calculations, and verified answers for comprehensive learning.",
    solutionViewStructured: "Structured",
    solutionViewMarkdown: "Markdown",
    solutionCopyAll: "Copy All",
    solutionCopied: "Copied!",
    solutionPrint: "Print / PDF",
    solutionOverview: "Overview & Strategy",
    solutionProblemNum: "Problem {num}",
    solutionTarget: "Target:",
    solutionGiven: "Given Information:",
    solutionFormula: "Core Formula / Principle:",
    solutionSteps: "Step-by-Step Method:",
    solutionStepNum: "Step {num}",
    solutionFinalAnswer: "Final Answer:",
    solutionWatchout: "Exam Pitfalls & Traps:",
    solutionVerification: "Answer Verification:",
    solutionKeyTakeaway: "Key Takeaways:",
    solutionNextStepsTitle: "Continue Learning Flow:",
    solutionConvertToSummary: "Summarize as Lesson Notes",
    solutionConvertToSummaryDesc: "Turn this solution into an organized study sheet with core principles and key facts",
    solutionConvertToQuiz: "Convert into Practice Quiz",
    solutionConvertToQuizDesc: "Generate 4-choice questions or flashcards from this problem to test your recall",

    // Input Section (Exams & Summaries)
    inputBadge: "Exam & Summary Studio",
    inputTitle: "Paste Study Notes or Upload Lesson Materials",
    inputSubtitle: "QuizCraft extracts core concepts and turns them into 4-choice practice exams, flashcards, or high-yield summaries.",
    inputSamplesLabel: "Or try curated lesson samples:",
    inputSamplesDesc: "Select a topic below to auto-fill high-yield notes and test the studio immediately",
    inputLabel: "Lesson Content (min 20 characters):",
    inputDropTitle: "Drop text, PDF, or image files to extract content",
    inputDropHint: "Supports .txt, .md, .pdf, or images",
    inputBtnQuiz: "Create Practice Exam",
    inputBtnSummary: "Read Study Summary",
    inputLoadingSummary: "Generating executive lesson summary...",
    inputLoadingQuiz: "Analyzing notes and generating questions...",

    // Mode Selector
    modeSelectTitle: "Choose Practice Mode",
    modeSelectSubtitle: "Evaluate and reinforce your understanding through 3 modes tailored for academic excellence.",
    modeBackBtn: "Back to Content",
    modeQuizTitle: "Timed Mock Exam",
    modeQuizDesc: "4-choice questions with deceptive distractors, real-time timer, and diagnostic scorecard",
    modeFlashcardsTitle: "Smart Flashcards",
    modeFlashcardsDesc: "Active-recall flip cards highlighting definitions, formulas, and common exam traps",
    modeSubjectiveTitle: "Written Subjective Exam",
    modeSubjectiveDesc: "Practice written answers with rubric breakdown and AI evaluation",
    modeConfigTitle: "Exam Settings & Options",
    modeQuestionCount: "Number of Questions:",
    modeTimer: "Time Limit (minutes):",
    modeDifficulty: "Difficulty Level:",
    modeDiffMixed: "Mixed (Standard & Application)",
    modeDiffRecall: "Recall (Definitions & Core Concepts)",
    modeDiffAnalysis: "Analysis (Mechanisms & Application)",
    modeDiffOlympiad: "Competition / Olympiad (Advanced)",
    modeCustomPromptLabel: "Custom Exam Instructions (Optional):",
    modeCustomPromptPlaceholder: "e.g. Focus on case studies, include calculation steps, avoid direct recall...",
    modeStartQuiz: "Start Timed Exam",
    modeStartFlashcards: "Start Flashcards",
    modeStartSubjective: "Start Written Exam",

    // Mock Exam View
    examTimeRemaining: "Time Remaining",
    examQuestionCount: "Question {current} of {total}",
    examAnsweredStatus: "{answered} of {total} answered",
    examShortcutsHint: "Press 1-4 or A-D on keyboard to select choices",
    examPrevBtn: "Previous",
    examNextBtn: "Next",
    examSubmitBtn: "Submit Exam",
    examQuestionMap: "Question Map",
    examAnsweredLegend: "Answered",
    examUnansweredLegend: "Unanswered",
    examCurrentLegend: "Current",
    examConfirmSubmitTitle: "Submit Exam?",
    examConfirmSubmitDesc: "You have answered {answered} out of {total} questions. Are you sure you want to finish?",
    examConfirmBtn: "Confirm & View Score",
    examCancelBtn: "Continue Answering",

    // Exam Result View
    resultTitle: "Exam Performance Report",
    resultScoreLabel: "Total Score",
    resultPercentage: "Percentage",
    resultTimeSpent: "Time Spent",
    resultSpeed: "Avg. Speed",
    resultDiagnosticTitle: "AI Diagnostic Analysis & Recommendations",
    resultFilterAll: "All Questions ({count})",
    resultFilterWrong: "Incorrect ({count})",
    resultFilterCorrect: "Correct ({count})",
    resultYourAnswer: "Your Answer:",
    resultCorrectAnswer: "Correct Answer:",
    resultExplanation: "Academic Explanation:",
    resultSourceQuote: "Source Grounding:",
    resultRetryBtn: "Retake Exam",
    resultNewExamBtn: "Create New Exam",
    resultPrintBtn: "Print / PDF Report",

    // Flashcards View
    fcCardCount: "Card {current} of {total}",
    fcFlipHint: "Click card or press Spacebar to flip",
    fcFrontLabel: "Concept / Term",
    fcBackLabel: "Definition & Key Insights",
    fcTrapLabel: "Common Exam Pitfalls:",
    fcMasteredBtn: "Mastered (Press 2)",
    fcReviewBtn: "Review Again (Press 1)",
    fcShuffleBtn: "Shuffle",
    fcExportAnkiBtn: "Export Anki TSV",
    fcExitBtn: "Exit Flashcards",

    // Subjective Exam View
    subjTitle: "Written Exam Practice",
    subjQuestionLabel: "Question {num}",
    subjPlaceholder: "Write your complete, structured explanation here...",
    subjRubricTitle: "Scoring Rubric & Criteria",
    subjModelAnswer: "Model Answer",
    subjGradeBtn: "Evaluate Answer with AI",
    subjGrading: "Evaluating your answer...",
    subjScore: "Score:",
    subjFeedback: "Detailed Feedback:",

    // Summary View
    summaryBadge: "Executive Lesson Summary",
    summaryReadingTime: "~{min} min read",
    summary1MinTitle: "1-Minute Executive Summary",
    summaryTakeawaysTitle: "Core Key Takeaways",
    summaryDeepDiveTitle: "Topic Deep-Dive",
    summaryTrapsTitle: "High-Yield Exam Focus & Traps",
    summaryQaTitle: "Rapid Recall Q&A",
    summaryRevealAnswer: "Reveal Answer",
    summaryHideAnswer: "Hide Answer",
    summaryReadyPrompt: "Finished Reading? Test Your Knowledge!",
    summaryReadyDesc: "You have reviewed key principles and traps. Put your skills to the test in the interactive exam studio.",
    summaryStartQuizBtn: "Start Practice Quiz",

    // Modals
    apiKeyTitle: "Gemini API Key Settings",
    apiKeyDesc: "Provide your own Gemini API key for higher rate limits and uninterrupted access.",
    apiKeyPlaceholder: "Paste your AI Studio API key (AIza...)",
    apiKeySaveBtn: "Save Key",
    apiKeyRemoveBtn: "Use Default Key",
    apiKeyStatusCustom: "Using Custom Key",
    apiKeyStatusDefault: "Using Default System Key",
  },

  th: {
    // App Branding
    appName: "QuizCraft",

    // Navigation & Header
    navSolve: "แก้โจทย์ปัญหา",
    navQuiz: "สร้างแบบทดสอบ",
    navAnalytics: "สถิติ",
    navApiKey: "API Key",
    navReset: "เริ่มใหม่",
    navLangTh: "ไทย",
    navLangEn: "EN",
    navLangTitle: "เปลี่ยนภาษา / Switch Language",

    // Hub Tabs
    hubTabSolveTitle: "แก้โจทย์ปัญหา & แสดงวิธีทำ",
    hubTabSolveDesc: "พิมพ์หรือแนบรูปโจทย์ แสดงสูตรและวิธีคิดทีละขั้นตอนอย่างเป็นระบบ",
    hubTabExamTitle: "สร้างแบบทดสอบ & สรุปบทเรียน",
    hubTabExamDesc: "แปลงเนื้อหาเป็นห้องสอบจำลอง แฟลชการ์ด และชีทสรุปบทเรียน",

    // Hero Carousel
    hero1Badge: "สตูดิโอวิเคราะห์และแก้โจทย์",
    hero1Title: "วิเคราะห์และเฉลยโจทย์ปัญหาเป็นขั้นตอน ละเอียด เข้าใจง่าย",
    hero1Desc: "พิมพ์โจทย์หรืออัปโหลดภาพชีท แสดงวิธีทำทีละขั้น สูตรที่ใช้ และการตรวจทานคำตอบอย่างเป็นระบบในไม่กี่วินาที",
    hero1Btn: "เริ่มแก้โจทย์ทันที",

    hero2Badge: "ห้องสอบจำลอง 4 ตัวเลือก",
    hero2Title: "สร้างห้องสอบจำลอง 4 ตัวเลือก พร้อมช้อยส์ดักจุดพลาด",
    hero2Desc: "แปลงเนื้อหาบทเรียนเป็นข้อสอบจับเวลา วิเคราะห์ความพร้อม พร้อมเฉลยละเอียดและสถิติคะแนน",
    hero2Btn: "สร้างแบบทดสอบ",

    hero3Badge: "แฟลชการ์ดจำแม่น",
    hero3Title: "ทบทวนคำศัพท์และสูตรสำคัญด้วยแฟลชการ์ดจำแม่น",
    hero3Desc: "พลิกการ์ดทบทวน มีจุดดักข้อสอบ รองรับปุ่มคีย์บอร์ด และส่งออกไฟล์ Anki ได้ทันที",
    hero3Btn: "เปิดแฟลชการ์ด",

    hero4Badge: "ชีทสรุปบทเรียนเข้มข้น",
    hero4Title: "อ่านสรุปบทเรียนแก่นสำคัญ 1 นาที พร้อมจุดเน้นข้อสอบ",
    hero4Desc: "คัดเฉพาะเนื้อหาเข้มข้น จัดระเบียบหัวข้อ เตือนจุดที่มักออกสอบ พร้อมคำถาม-คำตอบทบทวน",
    hero4Btn: "อ่านสรุปบทเรียน",

    // Homework Solver Section
    solverTitle: "ระบบวิเคราะห์และแก้โจทย์ปัญหาอย่างเป็นระบบ",
    solverSubtitle: "พิมพ์โจทย์ปัญหา หรืออัปโหลดรูปภาพชีทข้อสอบ เพื่อสร้างเฉลยละเอียดแสดงวิธีคิดทีละขั้นตอน พร้อมสูตร และคำตอบที่ถูกต้อง",
    solverClearBtn: "ล้างข้อมูล",
    solverDropTitle: "อัปโหลดภาพโจทย์ (รองรับหลายรูปพร้อมกัน)",
    solverDropHint: "ลากและวางรูปภาพที่นี่ หรือคลิกเพื่อเลือกไฟล์ (PNG, JPG, WebP)",
    solverUploadedCount: "แนบรูปแล้ว {count} รูป",
    solverRemoveAll: "ลบรูปทั้งหมด",
    solverProblemLabel: "ข้อความโจทย์ปัญหา / รายละเอียดเพิ่มเติม:",
    solverProblemPlaceholder: "พิมพ์โจทย์ปัญหาคณิตศาสตร์ วิทยาศาสตร์ ฟิสิกส์ เคมี หรือข้อความที่ต้องการให้อธิบาย...",
    solverPresetsLabel: "เลือกแนวทางการอธิบาย (Prompt Presets):",
    solverCustomPromptLabel: "ระบุเงื่อนไขหรือสไตล์คำตอบเพิ่มเติม (ไม่บังคับ):",
    solverCustomPromptPlaceholder: "เช่น ขอวิธีลัด 1 นาที, อธิบายสำหรับเด็ก ม.ปลาย, แปลงหน่วยละเอียด...",
    solverSubmitBtn: "วิเคราะห์โจทย์และแสดงวิธีทำ",
    solverLoadingText: "ระบบกำลังวิเคราะห์โจทย์และคำนวณวิธีทำ...",
    solverCharCount: "ตัวอักษร",
    solverEmptyError: "กรุณาระบุข้อความโจทย์หรืออัปโหลดรูปภาพโจทย์ปัญหาอย่างน้อย 1 ภาพ",

    // Solution View
    solutionHeaderBadge: "เฉลยวิธีทำและวิเคราะห์โจทย์ปัญหาอย่างเป็นระบบ",
    solutionHeaderDesc: "จัดระเบียบข้อมูลเป็นหัวข้อชัดเจน แสดงวิธีทำทีละขั้นตอน พร้อมสูตร หลักการ และคำตอบที่ถูกต้อง เพื่อการศึกษาอย่างเป็นระบบ",
    solutionViewStructured: "จัดหัวข้อ",
    solutionViewMarkdown: "Markdown",
    solutionCopyAll: "คัดลอกทั้งหมด",
    solutionCopied: "คัดลอกแล้ว",
    solutionPrint: "พิมพ์ / PDF",
    solutionOverview: "ภาพรวม & กลยุทธ์การแก้โจทย์",
    solutionProblemNum: "ข้อที่ {num}",
    solutionTarget: "สิ่งที่ต้องหา:",
    solutionGiven: "สิ่งที่โจทย์กำหนดให้ (Given Info):",
    solutionFormula: "สูตรหลัก / กฎที่นำมาใช้:",
    solutionSteps: "วิธีทำทีละสเต็ป (Step-by-Step):",
    solutionStepNum: "สเต็ป {num}",
    solutionFinalAnswer: "คำตอบสุดท้าย (Final Answer):",
    solutionWatchout: "ข้อควรระวัง / หลุมพรางที่ต้องระวัง:",
    solutionVerification: "การตรวจทานคำตอบ:",
    solutionKeyTakeaway: "สรุปแก่นความรู้สำคัญ (Key Takeaways):",
    solutionNextStepsTitle: "ไปต่อยอดความรู้ทันที:",
    solutionConvertToSummary: "สรุปเป็นเนื้อหาบทเรียนต่อ",
    solutionConvertToSummaryDesc: "นำคำตอบและวิธีทำนี้ไปจัดระเบียบเป็นชีทสรุปบทเรียนและจุดสำคัญที่ต้องจำ",
    solutionConvertToQuiz: "แปลงเป็นแบบทดสอบข้อสอบทันที",
    solutionConvertToQuizDesc: "สร้างชุดข้อสอบ 4 ตัวเลือก หรือแฟลชการ์ดจำแม่นจากข้อนี้ เพื่อทดสอบความจำ",

    // Input Section (Exams & Summaries)
    inputBadge: "สตูดิโอสร้างแบบทดสอบ & สรุปบทเรียน",
    inputTitle: "วางเนื้อหาบทเรียน หรืออัปโหลดเอกสารเพื่อเริ่มฝึกฝน",
    inputSubtitle: "ระบบจะวิเคราะห์เนื้อหาและเปลี่ยนเป็นห้องสอบจำลอง แฟลชการ์ด หรือชีทสรุปบทเรียนได้อย่างแม่นยำ",
    inputSamplesLabel: "หรือทดลองด้วยบทเรียนตัวอย่าง:",
    inputSamplesDesc: "คลิกเลือกหัวข้อด้านล่างเพื่อโหลดเนื้อหาตัวอย่างและทดสอบระบบได้ทันที",
    inputLabel: "เนื้อหาบทเรียน (ขั้นต่ำ 20 ตัวอักษร):",
    inputDropTitle: "ลากและวางไฟล์ หรือคลิกเพื่ออัปโหลด",
    inputDropHint: "รองรับไฟล์ .txt, .md, .pdf หรือรูปภาพเอกสาร",
    inputBtnQuiz: "สร้างแบบทดสอบทันที",
    inputBtnSummary: "อ่านสรุปบทเรียน",
    inputLoadingSummary: "กำลังสังเคราะห์สรุปเนื้อหาบทเรียน...",
    inputLoadingQuiz: "กำลังประมวลผลและสร้างข้อสอบ...",

    // Mode Selector
    modeSelectTitle: "เลือกรูปแบบการฝึกฝนและทดสอบ",
    modeSelectSubtitle: "ประเมินและทบทวนความรู้ผ่าน 3 โหมดที่ออกแบบมาเพื่อการเรียนรู้อย่างมีประสิทธิภาพ",
    modeBackBtn: "กลับไปหน้าเนื้อหา",
    modeQuizTitle: "ห้องสอบจำลองจับเวลา",
    modeQuizDesc: "ข้อสอบ 4 ตัวเลือก พร้อมช้อยส์ดักและวิเคราะห์คะแนนละเอียด",
    modeFlashcardsTitle: "แฟลชการ์ดช่วยจำ",
    modeFlashcardsDesc: "การ์ดคำศัพท์และสูตรสำคัญ พลิกหน้า-หลัง จำแม่น ไม่ลืม",
    modeSubjectiveTitle: "ข้อสอบอัตนัย (เขียนตอบ)",
    modeSubjectiveDesc: "ฝึกเขียนตอบแบบบรรยาย พร้อมประเมินเกณฑ์การให้คะแนน",
    modeConfigTitle: "ตั้งค่าตัวเลือกการสอบ",
    modeQuestionCount: "จำนวนข้อสอบ:",
    modeTimer: "เวลาจำลองสอบ (นาที):",
    modeDifficulty: "ระดับความยากของข้อสอบ:",
    modeDiffMixed: "คละระดับความยาก (ผสมผสาน)",
    modeDiffRecall: "ระดับพื้นฐาน (เน้นความจำ & นิยาม)",
    modeDiffAnalysis: "ระดับวิเคราะห์ (เน้นกลไก & ประยุกต์)",
    modeDiffOlympiad: "ระดับสอวน./แข่งขัน (ขั้นสูง ดักจุดพลาด)",
    modeCustomPromptLabel: "เงื่อนไขหรือสไตล์ข้อสอบเพิ่มเติม (ไม่บังคับ):",
    modeCustomPromptPlaceholder: "เช่น เน้นสถานการณ์ชีวิตจริง, ช้อยส์ลวงแนบเนียน, คำนวณสูตร...",
    modeStartQuiz: "เริ่มทำข้อสอบจำลอง",
    modeStartFlashcards: "เปิดแฟลชการ์ด",
    modeStartSubjective: "เริ่มทำข้อสอบเขียนตอบ",

    // Mock Exam View
    examTimeRemaining: "เวลาที่เหลือ",
    examQuestionCount: "ข้อที่ {current} จาก {total}",
    examAnsweredStatus: "ตอบแล้ว {answered} จาก {total} ข้อ",
    examShortcutsHint: "กดคีย์บอร์ด 1-4 หรือ A-D เพื่อเลือกคำตอบ",
    examPrevBtn: "ข้อก่อนหน้า",
    examNextBtn: "ข้อถัดไป",
    examSubmitBtn: "ส่งข้อสอบ",
    examQuestionMap: "แผนผังข้อสอบ",
    examAnsweredLegend: "ตอบแล้ว",
    examUnansweredLegend: "ยังไม่ตอบ",
    examCurrentLegend: "ข้อปัจจุบัน",
    examConfirmSubmitTitle: "ยืนยันการส่งข้อสอบ?",
    examConfirmSubmitDesc: "คุณตอบไปแล้ว {answered} จากทั้งหมด {total} ข้อ แน่ใจหรือไม่ว่าต้องการส่งข้อสอบ?",
    examConfirmBtn: "ยืนยันส่งข้อสอบและดูผลลัพธ์",
    examCancelBtn: "กลับไปทำข้อสอบต่อ",

    // Exam Result View
    resultTitle: "รายงานผลการประเมินการสอบ",
    resultScoreLabel: "คะแนนรวม",
    resultPercentage: "คิดเป็น",
    resultTimeSpent: "เวลาที่ใช้",
    resultSpeed: "ความเร็วเฉลี่ย",
    resultDiagnosticTitle: "บทวิเคราะห์จุดแข็งและจุดที่ต้องทบทวนจาก AI",
    resultFilterAll: "ทั้งหมด ({count})",
    resultFilterWrong: "ข้อที่ตอบผิด ({count})",
    resultFilterCorrect: "ข้อที่ตอบถูก ({count})",
    resultYourAnswer: "คำตอบของคุณ:",
    resultCorrectAnswer: "คำตอบที่ถูกต้อง:",
    resultExplanation: "คำอธิบายเหตุผลทางวิชาการ:",
    resultSourceQuote: "จุดอ้างอิงในบทเรียน:",
    resultRetryBtn: "สอบใหม่อีกครั้ง",
    resultNewExamBtn: "สร้างชุดข้อสอบใหม่",
    resultPrintBtn: "พิมพ์ผลสอบ / PDF",

    // Flashcards View
    fcCardCount: "การ์ดใบที่ {current} จาก {total}",
    fcFlipHint: "คลิกการ์ดหรือกด Spacebar เพื่อพลิกดูคำอธิบาย",
    fcFrontLabel: "คำศัพท์ / หัวข้อ",
    fcBackLabel: "คำอธิบาย & จุดสำคัญ",
    fcTrapLabel: "ข้อควรระวังในข้อสอบ:",
    fcMasteredBtn: "จำได้แม่นแล้ว (กด 2)",
    fcReviewBtn: "ยังจำไม่ได้ (กด 1)",
    fcShuffleBtn: "สลับการ์ด",
    fcExportAnkiBtn: "ส่งออกไฟล์ Anki",
    fcExitBtn: "ออกจากแฟลชการ์ด",

    // Subjective Exam View
    subjTitle: "ห้องสอบอัตนัย (ฝึกเขียนตอบ)",
    subjQuestionLabel: "คำถามข้อที่ {num}",
    subjPlaceholder: "พิมพ์คำตอบและคำอธิบายของคุณที่นี่...",
    subjRubricTitle: "เกณฑ์การให้คะแนน (Scoring Rubric)",
    subjModelAnswer: "แนวทางคำตอบที่สมบูรณ์",
    subjGradeBtn: "ให้ AI ตรวจและให้คะแนนคำตอบ",
    subjGrading: "กำลังประเมินและให้คะแนน...",
    subjScore: "คะแนนที่ได้:",
    subjFeedback: "คำวิจารณ์และข้อเสนอแนะ:",

    // Summary View
    summaryBadge: "สรุปบทเรียนและแก่นสำคัญ",
    summaryReadingTime: "เวลาอ่านโดยประมาณ {min} นาที",
    summary1MinTitle: "ภาพรวม 1 นาที (Executive Summary)",
    summaryTakeawaysTitle: "แก่นสำคัญที่ต้องรู้ (Core Takeaways)",
    summaryDeepDiveTitle: "หัวข้อเจาะลึก",
    summaryTrapsTitle: "จุดเน้นข้อสอบ & ข้อควรระวัง (Exam Traps)",
    summaryQaTitle: "คำถาม-คำตอบทบทวนความเข้าใจเร็ว",
    summaryRevealAnswer: "ดูเฉลย",
    summaryHideAnswer: "ซ่อนเฉลย",
    summaryReadyPrompt: "ทบทวนสรุปเนื้อหาจบแล้ว พร้อมทดสอบความเข้าใจ!",
    summaryReadyDesc: "คุณได้อ่านประเด็นสำคัญและจุดดักข้อสอบครบถ้วนแล้ว ตอนนี้ถึงเวลาประเมินความพร้อมจริงผ่านห้องสอบจำลอง",
    summaryStartQuizBtn: "เริ่มทำข้อสอบทดสอบ",

    // Modals
    apiKeyTitle: "ตั้งค่า Gemini API Key ส่วนตัว",
    apiKeyDesc: "ระบุ API Key ของคุณเพื่อโควตาการใช้งานที่สูงขึ้นและทำงานได้ต่อเนื่องไม่มีสะดุด",
    apiKeyPlaceholder: "วาง AI Studio API Key ของคุณ (AIza...)",
    apiKeySaveBtn: "บันทึก API Key",
    apiKeyRemoveBtn: "ใช้ระบบมาตรฐาน",
    apiKeyStatusCustom: "กำลังใช้ Custom Key ส่วนตัว",
    apiKeyStatusDefault: "กำลังใช้ Standard Key ของระบบ",
  },
} as const;

export type TranslationKey = keyof typeof DICTIONARY.en;
