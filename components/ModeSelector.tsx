"use client";

import React, { useState } from "react";
import {
  FileQuestion,
  Layers,
  Edit3,
  Clock,
  Sparkles,
  ArrowLeft,
  Key,
  Flame,
} from "lucide-react";
import { PromptInputWithAnimatedPlaceholder } from "@/components/PromptInputWithAnimatedPlaceholder";
import { useLanguage } from "@/lib/language-context";

export type ModeType = "quiz" | "flashcards" | "subjective";

interface ModeSelectorProps {
  onBack: () => void;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  onStartQuiz: (options: {
    questionCount: number;
    difficulty: "recall" | "analysis" | "mixed" | "olympiad";
    timerMinutes: number;
    customPrompt?: string;
  }) => void;
  onStartFlashcards: (cardCount: number, customPrompt?: string) => void;
  onStartSubjective: (questionCount: number, customPrompt?: string) => void;
  isLoading: boolean;
  hasCustomKey?: boolean;
  onOpenApiKeyModal?: () => void;
}

export function ModeSelector({
  onBack,
  customPrompt,
  setCustomPrompt,
  onStartQuiz,
  onStartFlashcards,
  onStartSubjective,
  isLoading,
  hasCustomKey = false,
  onOpenApiKeyModal = () => {},
}: ModeSelectorProps) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<ModeType>("quiz");

  // Quiz Mode Configuration State
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isCustomCount, setIsCustomCount] = useState<boolean>(false);
  const [customCountInput, setCustomCountInput] = useState<string>("30");

  const [difficulty, setDifficulty] = useState<"recall" | "analysis" | "mixed" | "olympiad">("mixed");
  const [timerMinutesPerQuestion, setTimerMinutesPerQuestion] = useState<number>(1.5);
  const [customTimerMinutes, setCustomTimerMinutes] = useState<number | null>(null);

  // Flashcards Configuration State
  const [cardCount, setCardCount] = useState<number>(8);

  // Subjective Configuration State
  const [subjectiveCount, setSubjectiveCount] = useState<number>(3);

  const effectiveQuestionCount = isCustomCount
    ? Math.min(Math.max(Number(customCountInput) || 5, 5), 200)
    : questionCount;

  const totalQuizTime = customTimerMinutes !== null
    ? customTimerMinutes
    : Math.round(effectiveQuestionCount * timerMinutesPerQuestion);

  const handleSelectCount = (cnt: number) => {
    setIsCustomCount(false);
    setQuestionCount(cnt);
  };

  const handleToggleCustomCount = () => {
    setIsCustomCount(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8">
      {/* Top Breadcrumb / Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {language === "en" ? "Back to Notes & Source" : "ย้อนกลับไปแก้ไขเนื้อหาสรุป"}
        </button>
        <span className="text-xs text-slate-500 font-medium">
          {language === "en" ? "Step 2 of 2: Configure Exam Mode" : "ขั้นตอนที่ 2 จาก 2: เลือกรูปแบบการทดสอบ"}
        </span>
      </div>

      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
          {language === "en" ? "Choose Practice & Exam Mode" : "เลือกรูปแบบการทบทวนและฝึกทำข้อสอบ"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          {language === "en"
            ? "Generate tailored examinations and recall modules grounded in your notes, with structured step-by-step explanations."
            : "สร้างแบบทดสอบตามเนื้อหาบทเรียนที่คุณนำเข้า พร้อมเฉลยและคำอธิบายอย่างเป็นระบบ"}
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Mode A */}
        <button
          id="mode-tab-quiz"
          type="button"
          onClick={() => setActiveTab("quiz")}
          className={`p-5 rounded-2xl border text-left transition-all relative cursor-pointer ${
            activeTab === "quiz"
              ? "border-slate-900 bg-slate-50 shadow-xs ring-1 ring-slate-900 text-slate-900"
              : "border-slate-200 bg-white hover:border-slate-300 text-slate-800"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3.5 shadow-xs">
            <FileQuestion className="w-5 h-5" />
          </div>
          <div className="font-bold text-sm sm:text-base text-slate-900">
            {language === "en" ? "Practice Exam (Mock Test)" : "สนามสอบจำลอง (Mock Exam)"}
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {language === "en"
              ? "4-option multiple choice, countdown timer, scoring, and analysis of exam pitfalls."
              : "ปรนัย 4 ตัวเลือก จับเวลา เกรด และวิเคราะห์จุดลวงข้อสอบอ้างอิงตรงจากสรุป"}
          </p>
        </button>

        {/* Mode B */}
        <button
          id="mode-tab-flashcards"
          type="button"
          onClick={() => setActiveTab("flashcards")}
          className={`p-5 rounded-2xl border text-left transition-all relative cursor-pointer ${
            activeTab === "flashcards"
              ? "border-slate-900 bg-slate-50 shadow-xs ring-1 ring-slate-900 text-slate-900"
              : "border-slate-200 bg-white hover:border-slate-300 text-slate-800"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3.5 shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div className="font-bold text-sm sm:text-base text-slate-900">
            {language === "en" ? "Study Flashcards" : "แฟลชการ์ดจำแม่น (Flashcards)"}
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {language === "en"
              ? "Active recall for terminology, core principles, formulas, and watchouts."
              : "ท่องจำคำศัพท์ นิยามสำคัญ และสกัดจุดลวงที่ข้อสอบชอบนำมาออกหลอก"}
          </p>
        </button>

        {/* Mode C */}
        <button
          id="mode-tab-subjective"
          type="button"
          onClick={() => setActiveTab("subjective")}
          className={`p-5 rounded-2xl border text-left transition-all relative cursor-pointer ${
            activeTab === "subjective"
              ? "border-slate-900 bg-slate-50 shadow-xs ring-1 ring-slate-900 text-slate-900"
              : "border-slate-200 bg-white hover:border-slate-300 text-slate-800"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3.5 shadow-xs">
            <Edit3 className="w-5 h-5" />
          </div>
          <div className="font-bold text-sm sm:text-base text-slate-900">
            {language === "en" ? "Subjective & Rubrics" : "ข้อสอบข้อเขียน (Subjective & Rubric)"}
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {language === "en"
              ? "Write analytical short essays evaluated by AI with transparent rubric criteria."
              : "พิมพ์อธิบายด้วยคำพูดตนเอง ส่งตรวจด้วย AI ให้คะแนนตามเกณฑ์ Rubric อย่างเป็นธรรม"}
          </p>
        </button>
      </div>

      {/* Selected Mode Detail & Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 lg:p-10 shadow-xs">
        {activeTab === "quiz" && (
          <div className="space-y-6">
            <div className="border-b border-[#E2E8F0] pb-4">
              <h3 className="text-base font-semibold text-[#0F172A] flex items-center">
                <FileQuestion className="w-4 h-4 mr-2 text-slate-800" />
                {language === "en" ? "Practice Exam Configuration" : "ตั้งค่าสนามสอบจำลอง (Mock Exam Engine)"}
              </h3>
              <p className="text-xs text-[#64748B] mt-1">
                {language === "en"
                  ? "Generate 4-choice questions with step-by-step explanations and distractor trap analysis."
                  : "สร้างแบบทดสอบ 4 ตัวเลือก พร้อมระบบเฉลยละเอียดและวิเคราะห์จุดบกพร่อง"}
              </p>
            </div>

            {/* Question Count Setting */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                  {language === "en" ? "Number of Questions" : "จำนวนข้อสอบที่ต้องการทดสอบ"}
                </label>
                <span className="text-[11px] text-[#64748B]">
                  {language === "en" ? "Select 5 - 100 questions or custom up to 200" : "เลือก 5 - 100 ข้อ หรือกำหนดเองสูงสุด 200 ข้อ"}
                </span>
              </div>

              {/* Standard Question Count Options */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3">
                {[5, 10, 15, 20, 30, 50, 100].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => handleSelectCount(cnt)}
                    className={`py-2 px-3 rounded-lg text-sm font-semibold border transition-all cursor-pointer ${
                      !isCustomCount && questionCount === cnt
                        ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                        : "border-[#CBD5E1] bg-white text-[#1E293B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {cnt} {language === "en" ? "Q" : "ข้อ"}
                  </button>
                ))}
              </div>

              {/* Custom count toggle */}
              <div className="flex items-center space-x-3 pt-1">
                <button
                  type="button"
                  onClick={handleToggleCustomCount}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    isCustomCount
                      ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                      : "border-[#CBD5E1] bg-white text-[#1E293B] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {language === "en" ? "Custom count (5 - 200 questions)" : "กำหนดจำนวนข้อเอง (5 - 200 ข้อ)"}
                </button>

                {isCustomCount && (
                  <div className="flex items-center space-x-2 text-xs">
                    <input
                      type="number"
                      min={5}
                      max={200}
                      value={customCountInput}
                      onChange={(e) => setCustomCountInput(e.target.value)}
                      className="w-24 px-2 py-1 bg-white border border-slate-900 rounded font-bold text-center text-[#0F172A] focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                    <span className="text-[#64748B]">{language === "en" ? "questions" : "ข้อ"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Difficulty Setting */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                  {language === "en" ? "Difficulty Level" : "ระดับความยากของข้อสอบ"}
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setDifficulty("recall")}
                  className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                    difficulty === "recall"
                      ? "border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900"
                      : "border-[#CBD5E1] bg-white hover:bg-[#F8FAFC]"
                  }`}
                >
                  <div className="text-xs font-bold">{language === "en" ? "Recall & Fundamentals" : "ระดับพื้นฐาน (Recall)"}</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5 leading-tight">
                    {language === "en" ? "Test definitions, core rules, and fundamental facts" : "ทดสอบการจดจำนิยาม สูตร และสาระสำคัญ"}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDifficulty("analysis")}
                  className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                    difficulty === "analysis"
                      ? "border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900"
                      : "border-[#CBD5E1] bg-white hover:bg-[#F8FAFC]"
                  }`}
                >
                  <div className="text-xs font-bold">{language === "en" ? "Applied & Analytical" : "ระดับประยุกต์ & วิเคราะห์"}</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5 leading-tight">
                    {language === "en" ? "Connect cause-and-effect, compare mechanisms & cases" : "เชื่อมโยงกลไก เปรียบเทียบ และสถานการณ์จำลอง"}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDifficulty("mixed")}
                  className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                    difficulty === "mixed"
                      ? "border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900"
                      : "border-[#CBD5E1] bg-white hover:bg-[#F8FAFC]"
                  }`}
                >
                  <div className="text-xs font-bold">{language === "en" ? "Mixed Balanced" : "คละระดับ (Mixed Balanced)"}</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5 leading-tight">
                    {language === "en" ? "Balanced ratio of recall precision and deep reasoning" : "สมดุลทั้งความจำเชิงลึกและการวิเคราะห์"}
                  </div>
                </button>

                {/* Olympiad / Competition */}
                <button
                  type="button"
                  onClick={() => setDifficulty("olympiad")}
                  className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                    difficulty === "olympiad"
                      ? "border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900"
                      : "border-[#CBD5E1] bg-white hover:bg-[#F8FAFC]"
                  }`}
                >
                  <div className="text-xs font-bold text-[#0F172A] flex items-center">
                    <Flame className="w-3.5 h-3.5 mr-1 text-red-500" />
                    <span>{language === "en" ? "Olympiad / High-Stakes" : "ระดับแข่งขัน & ดักทาง (Olympiad)"}</span>
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5 leading-tight">
                    {language === "en" ? "Competition-grade traps, subtle distractors, high rigor" : "ข้อสอบแนว สอวน./A-Level ตัวเลือกหลอกดักจุดสับสนขั้นสูง"}
                  </div>
                </button>
              </div>
            </div>

            {/* Timer Setting */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                  {language === "en" ? "Exam Duration (Countdown Timer)" : "เวลาทำข้อสอบ (นาฬิกาจับเวลาถอยหลัง)"}
                </label>
                <span className="text-[11px] text-[#64748B]">
                  {language === "en" ? "Customizable duration" : "ปรับแต่งเวลาได้อิสระ"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: language === "en" ? "Fast (1 min/Q)" : "เร็ว (1 นาที/ข้อ)", val: 1 },
                  { label: language === "en" ? "Standard (1.5 min/Q)" : "มาตรฐาน (1.5 นาที/ข้อ)", val: 1.5 },
                  { label: language === "en" ? "Thorough (2.5 min/Q)" : "เจาะลึก (2.5 นาที/ข้อ)", val: 2.5 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => {
                      setCustomTimerMinutes(null);
                      setTimerMinutesPerQuestion(item.val);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      customTimerMinutes === null && timerMinutesPerQuestion === item.val
                        ? "border-slate-900 bg-slate-900 text-white font-semibold"
                        : "border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </div>
                  </button>
                ))}

                {/* Custom Time */}
                <button
                  type="button"
                  onClick={() => {
                    const custom = prompt(
                      language === "en" ? "Enter total time in minutes:" : "ระบุเวลารวมที่ต้องการ (นาที):",
                      String(totalQuizTime)
                    );
                    if (custom && Number(custom) > 0) {
                      setCustomTimerMinutes(Math.max(1, Math.min(300, Number(custom))));
                    }
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    customTimerMinutes !== null
                      ? "border-slate-900 bg-slate-900 text-white font-semibold"
                      : "border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {customTimerMinutes
                        ? (language === "en" ? `Custom: ${customTimerMinutes} min` : `กำหนดเอง: ${customTimerMinutes} นาที`)
                        : (language === "en" ? "Custom Time" : "กำหนดเวลาเอง")}
                    </span>
                  </div>
                </button>
              </div>

              <p className="text-[11px] text-[#64748B] mt-2">
                {language === "en" ? "Total time allocated: " : "เวลารวมที่กำหนด: "}
                <strong>{totalQuizTime} {language === "en" ? "minutes" : "นาที"}</strong>
                {language === "en" ? ` for ${effectiveQuestionCount} questions` : ` สำหรับข้อสอบ ${effectiveQuestionCount} ข้อ`}
              </p>
            </div>

            {/* Custom Prompt Input */}
            <div className="pt-2 border-t border-[#E2E8F0]">
              <PromptInputWithAnimatedPlaceholder
                id="quiz-custom-prompt"
                value={customPrompt}
                onChange={setCustomPrompt}
                label={language === "en" ? "Custom Exam Prompt & Directives" : "กำหนดคำสั่งพิเศษ / พรอมต์โจทย์ปรนัย (Custom Exam Prompt)"}
                description={
                  language === "en"
                    ? "Specify question focus, Olympiad traps, calculation heavy, or real-life scenario case studies"
                    : "ระบุเงื่อนไขข้อสอบ เช่น เน้นวิเคราะห์สถานการณ์, สอวน./สอบแข่งขัน, คำนวณสูตร, หรือช้อยส์ลวงแนบเนียน"
                }
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              id="start-quiz-btn"
              type="button"
              disabled={isLoading}
              onClick={() =>
                onStartQuiz({
                  questionCount: effectiveQuestionCount,
                  difficulty,
                  timerMinutes: totalQuizTime,
                  customPrompt,
                })
              }
              className={`w-full py-4 px-8 rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center space-x-2.5 cursor-pointer shadow-xs transition-all active:scale-[0.99] ${
                isLoading
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>
                {isLoading
                  ? (language === "en" ? "Generating practice exam from notes..." : "กำลังออกข้อสอบจากเนื้อหา...")
                  : (language === "en"
                      ? `Start Practice Exam (${effectiveQuestionCount} Questions • ${totalQuizTime} Mins)`
                      : `เข้าสู่ห้องสอบจำลองทันที (${effectiveQuestionCount} ข้อ • ${totalQuizTime} นาที)`)}
              </span>
            </button>
          </div>
        )}

        {activeTab === "flashcards" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <Layers className="w-4 h-4 mr-2 text-slate-700" />
                {language === "en" ? "Extract Key Concept Flashcards" : "สกัดแฟลชการ์ดคีย์เวิร์ด (Key Term Flashcards)"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === "en"
                  ? "Extract technical vocabulary, core definitions, and high-frequency exam traps."
                  : "สกัดคำศัพท์เฉพาะ, นิยามสำคัญ, และข้อควรระวังหลุมพรางข้อสอบ"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {language === "en" ? "Number of Flashcards" : "จำนวนแฟลชการ์ดที่ต้องการสกัด"}
              </label>
              <div className="grid grid-cols-3 gap-3 max-w-sm">
                {[6, 8, 12].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setCardCount(cnt)}
                    className={`py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                      cardCount === cnt
                        ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {cnt} {language === "en" ? "Cards" : "แผ่น"}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="font-semibold text-slate-900">
                {language === "en" ? "What QuizCraft extracts into flashcards:" : "สิ่งที่ระบบจะสกัดลงในการ์ด:"}
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-500">
                <li>
                  {language === "en"
                    ? "Key terms and accurate academic definitions grounded in source notes"
                    : "คำศัพท์และนิยามสำคัญตามตัวบทเรียน"}
                </li>
                <li>
                  {language === "en"
                    ? "Exam Watchouts: pitfall warnings and easily confused concepts"
                    : "จุดระวัง (Exam Watchouts) ที่ข้อสอบมักนำมาออกหลอกให้สับสน"}
                </li>
                <li>
                  {language === "en"
                    ? "Verbatim source quotes ensuring 100% fidelity"
                    : "ข้อความอ้างอิงตรงจากสรุปเพื่อความแม่นยำ 100%"}
                </li>
              </ul>
            </div>

            {/* Custom Prompt Input */}
            <div className="pt-2 border-t border-slate-100">
              <PromptInputWithAnimatedPlaceholder
                id="flashcard-custom-prompt"
                value={customPrompt}
                onChange={setCustomPrompt}
                label={language === "en" ? "Custom Flashcard Prompt & Directives" : "กำหนดคำสั่งพิเศษ / พรอมต์สกัดแฟลชการ์ด (Custom Flashcard Prompt)"}
                description={
                  language === "en"
                    ? "Specify terms, formulas, or focus areas (e.g. emphasize biological processes, economic equations)"
                    : "ระบุคำศัพท์หรือหัวข้อที่อยากเน้นเป็นพิเศษ เช่น เน้นศัพท์เทคนิคภาษาอังกฤษ, จุดระวังหลุมพราง หรือสรุปเฉพาะทฤษฎีสำคัญ"
                }
                disabled={isLoading}
              />
            </div>

            <button
              id="start-flashcards-btn"
              type="button"
              disabled={isLoading}
              onClick={() => onStartFlashcards(cardCount, customPrompt)}
              className={`w-full py-4 px-8 rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center space-x-2.5 cursor-pointer shadow-xs transition-all active:scale-[0.99] ${
                isLoading
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>
                {isLoading
                  ? (language === "en" ? "Extracting flashcards..." : "กำลังสกัดคำศัพท์สำคัญ...")
                  : (language === "en" ? "Generate & Study Flashcards" : "สร้างและเริ่มทบทวนแฟลชการ์ด")}
              </span>
            </button>
          </div>
        )}

        {activeTab === "subjective" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <Edit3 className="w-4 h-4 mr-2 text-slate-700" />
                {language === "en" ? "Subjective Questions & AI Rubric Grader" : "ข้อสอบข้อเขียน & ตรวจคำตอบตาม Rubric (Subjective Short Answer)"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === "en"
                  ? "Simulate analytical exam questions, write your explanation, and receive instant feedback based on rubric criteria."
                  : "จำลองข้อสอบอัตนัย ให้นักศึกษาพิมพ์อธิบาย และใช้ AI ตรวจคำตอบอ้างอิงจากบทเรียน"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {language === "en" ? "Number of Questions" : "จำนวนข้อสอบข้อเขียน"}
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                {[3, 4].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setSubjectiveCount(cnt)}
                    className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                      subjectiveCount === cnt
                        ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {cnt} {language === "en" ? "Questions" : "ข้อ"}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-semibold">
                {language === "en" ? "AI Rubric Grader Engine:" : "ระบบตรวจคำตอบอัจฉริยะ (AI Rubric Grader):"}
              </div>
              <p>
                {language === "en"
                  ? "Once you submit your answer, AI analyzes your response against the original source notes, evaluating out of 10 points with specific strengths, missing keywords, and constructive suggestions."
                  : "เมื่อคุณพิมพ์ตอบเสร็จและกดส่ง ระบบจะอ่านเนื้อหาสรุปบทเรียนต้นฉบับอย่างละเอียด และประเมินคะแนนเต็ม 10 คะแนน พร้อมชี้จุดที่ตอบได้ดี, คีย์เวิร์ดที่ขาดไป และคำแนะนำปรับปรุง"}
              </p>
            </div>

            {/* Custom Prompt Input */}
            <div className="pt-2 border-t border-slate-100">
              <PromptInputWithAnimatedPlaceholder
                id="subjective-custom-prompt"
                value={customPrompt}
                onChange={setCustomPrompt}
                label={language === "en" ? "Custom Subjective Prompt & Directives" : "กำหนดคำสั่งพิเศษ / พรอมต์ข้อสอบข้อเขียน (Custom Subjective Prompt)"}
                description={
                  language === "en"
                    ? "Specify question style (e.g. compare & contrast, hypothetical scenario problem-solving, mechanism step-by-step)"
                    : "ระบุแนวคำถามข้อเขียนที่ต้องการ เช่น เน้นเปรียบเทียบความแตกต่าง, ให้แก้ปัญหาจากสถานการณ์สมมติ หรืออธิบายกลไกละเอียด"
                }
                disabled={isLoading}
              />
            </div>

            <button
              id="start-subjective-btn"
              type="button"
              disabled={isLoading}
              onClick={() => onStartSubjective(subjectiveCount, customPrompt)}
              className={`w-full py-4 px-8 rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center space-x-2.5 cursor-pointer shadow-xs transition-all active:scale-[0.99] ${
                isLoading
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>
                {isLoading
                  ? (language === "en" ? "Drafting subjective questions..." : "กำลังร่างโจทย์ข้อเขียน...")
                  : (language === "en" ? "Start Subjective Examination" : "เริ่มทำข้อสอบข้อเขียน")}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
