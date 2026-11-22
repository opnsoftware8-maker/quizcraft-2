"use client";

import React, { useState } from "react";
import {
  FileQuestion,
  Layers,
  Edit3,
  Clock,
  Sparkles,
  ArrowLeft,
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
  const [customTimerInput, setCustomTimerInput] = useState<string>("20");

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

  const handleToggleCustomTimer = () => {
    const initial = customTimerMinutes ?? Math.max(1, Math.min(300, totalQuizTime || 15));
    setCustomTimerInput(String(initial));
    setCustomTimerMinutes(initial);
  };

  const handleCustomTimerChange = (val: string) => {
    setCustomTimerInput(val);
    const parsed = Number(val);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setCustomTimerMinutes(Math.max(1, Math.min(300, Math.round(parsed))));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Top Breadcrumb / Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center text-xs font-medium text-[#6B6A65] hover:text-[#1F1E1D] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {language === "en" ? "Back to Notes & Source" : "ย้อนกลับไปแก้ไขเนื้อหา"}
        </button>
        <span className="text-xs text-[#6B6A65] font-medium">
          {language === "en" ? "Choose Practice Mode" : "เลือกรูปแบบการทดสอบ"}
        </span>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-semibold text-[#1F1E1D] tracking-tight">
          {language === "en" ? "Practice & Exam Mode" : "เลือกรูปแบบการทบทวนและทำข้อสอบ"}
        </h2>
        <p className="text-xs sm:text-sm text-[#6B6A65]">
          {language === "en"
            ? "Generate tailored questions and recall modules grounded in your study content."
            : "สร้างแบบทดสอบตามเนื้อหาบทเรียนที่วางไว้ พร้อมเฉลยและคำอธิบายอย่างเป็นระบบ"}
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Mode A */}
        <button
          id="mode-tab-quiz"
          type="button"
          onClick={() => setActiveTab("quiz")}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "quiz"
              ? "border-[#1F1E1D] bg-[#EFECE4]/70 text-[#1F1E1D]"
              : "border-[#E5E3DC] bg-white hover:border-[#C9C6BE] text-[#1F1E1D]"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
              activeTab === "quiz" ? "bg-[#1F1E1D] text-white" : "bg-[#EFECE4] text-[#1F1E1D]"
            }`}
          >
            <FileQuestion className="w-4 h-4" />
          </div>
          <div className="font-semibold text-sm text-[#1F1E1D]">
            {language === "en" ? "Practice Exam" : "แบบทดสอบปรนัย"}
          </div>
          <p className="text-xs text-[#6B6A65] mt-1 leading-relaxed">
            {language === "en"
              ? "4-option multiple choice, countdown timer, scoring, and explanations."
              : "ปรนัย 4 ตัวเลือก จับเวลา คำนวณคะแนน และวิเคราะห์จุดที่ควรทบทวน"}
          </p>
        </button>

        {/* Mode B */}
        <button
          id="mode-tab-flashcards"
          type="button"
          onClick={() => setActiveTab("flashcards")}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "flashcards"
              ? "border-[#1F1E1D] bg-[#EFECE4]/70 text-[#1F1E1D]"
              : "border-[#E5E3DC] bg-white hover:border-[#C9C6BE] text-[#1F1E1D]"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
              activeTab === "flashcards" ? "bg-[#1F1E1D] text-white" : "bg-[#EFECE4] text-[#1F1E1D]"
            }`}
          >
            <Layers className="w-4 h-4" />
          </div>
          <div className="font-semibold text-sm text-[#1F1E1D]">
            {language === "en" ? "Study Flashcards" : "แฟลชการ์ดจำแม่น"}
          </div>
          <p className="text-xs text-[#6B6A65] mt-1 leading-relaxed">
            {language === "en"
              ? "Active recall for terminology, core principles, formulas, and watchouts."
              : "ท่องจำคำศัพท์ นิยามสำคัญ และสกัดจุดที่ข้อสอบมักออก"}
          </p>
        </button>

        {/* Mode C */}
        <button
          id="mode-tab-subjective"
          type="button"
          onClick={() => setActiveTab("subjective")}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "subjective"
              ? "border-[#1F1E1D] bg-[#EFECE4]/70 text-[#1F1E1D]"
              : "border-[#E5E3DC] bg-white hover:border-[#C9C6BE] text-[#1F1E1D]"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
              activeTab === "subjective" ? "bg-[#1F1E1D] text-white" : "bg-[#EFECE4] text-[#1F1E1D]"
            }`}
          >
            <Edit3 className="w-4 h-4" />
          </div>
          <div className="font-semibold text-sm text-[#1F1E1D]">
            {language === "en" ? "Subjective & Rubrics" : "ข้อสอบข้อเขียน"}
          </div>
          <p className="text-xs text-[#6B6A65] mt-1 leading-relaxed">
            {language === "en"
              ? "Write analytical short essays evaluated by AI with transparent rubric criteria."
              : "พิมพ์อธิบายด้วยคำพูดตนเอง ส่งตรวจและให้คะแนนตามเกณฑ์ Rubric"}
          </p>
        </button>
      </div>

      {/* Selected Mode Detail & Settings */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-5 sm:p-7">
        {activeTab === "quiz" && (
          <div className="space-y-6">
            <div className="border-b border-[#ECEAE3] pb-4">
              <h3 className="text-base font-semibold text-[#1F1E1D] flex items-center">
                <FileQuestion className="w-4 h-4 mr-2 text-[#1F1E1D]" />
                {language === "en" ? "Practice Exam Configuration" : "ตั้งค่าแบบทดสอบปรนัย"}
              </h3>
              <p className="text-xs text-[#6B6A65] mt-1">
                {language === "en"
                  ? "Generate 4-choice questions with step-by-step explanations and distractor analysis."
                  : "สร้างแบบทดสอบ 4 ตัวเลือก พร้อมเฉลยละเอียดและวิเคราะห์จุดบกพร่อง"}
              </p>
            </div>

            {/* Question Count Setting */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-[#1F1E1D] uppercase tracking-wider">
                  {language === "en" ? "Number of Questions" : "จำนวนข้อสอบ"}
                </label>
                <span className="text-[11px] text-[#6B6A65]">
                  {language === "en" ? "5 - 100 questions or custom up to 200" : "เลือก 5 - 100 ข้อ หรือกำหนดเองสูงสุด 200 ข้อ"}
                </span>
              </div>

              {/* Standard Question Count Options */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3">
                {[5, 10, 15, 20, 30, 50, 100].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => handleSelectCount(cnt)}
                    className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                      !isCustomCount && questionCount === cnt
                        ? "border-[#1F1E1D] bg-[#1F1E1D] text-white"
                        : "border-[#DFDDD6] bg-white text-[#1F1E1D] hover:bg-[#FAF9F5]"
                    }`}
                  >
                    {cnt} {language === "en" ? "Q" : "ข้อ"}
                  </button>
                ))}
              </div>

              {/* Custom count toggle */}
              <div className="flex items-center flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleToggleCustomCount}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    isCustomCount
                      ? "border-[#1F1E1D] bg-[#1F1E1D] text-white"
                      : "border-[#DFDDD6] bg-white text-[#1F1E1D] hover:bg-[#FAF9F5]"
                  }`}
                >
                  {language === "en" ? "Custom count (5 - 200)" : "กำหนดจำนวนข้อเอง (5 - 200 ข้อ)"}
                </button>

                {isCustomCount && (
                  <div className="flex items-center space-x-2 text-xs">
                    <input
                      type="number"
                      min={5}
                      max={200}
                      value={customCountInput}
                      onChange={(e) => setCustomCountInput(e.target.value)}
                      className="w-24 px-2.5 py-1.5 bg-[#FAF9F5] border border-[#DFDDD6] rounded-lg text-[16px] sm:text-sm font-semibold text-center text-[#1F1E1D] focus:outline-none focus:border-[#1F1E1D]"
                    />
                    <span className="text-[#6B6A65]">{language === "en" ? "questions" : "ข้อ"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Difficulty Setting */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-[#1F1E1D] uppercase tracking-wider">
                  {language === "en" ? "Difficulty Level" : "ระดับความยาก"}
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDifficulty("recall")}
                  className={`p-3 rounded-xl text-left border transition-colors cursor-pointer ${
                    difficulty === "recall"
                      ? "border-[#1F1E1D] bg-[#EFECE4]/70 text-[#1F1E1D]"
                      : "border-[#DFDDD6] bg-white hover:bg-[#FAF9F5]"
                  }`}
                >
                  <div className="text-xs font-semibold text-[#1F1E1D]">
                    {language === "en" ? "Recall & Fundamentals" : "ระดับพื้นฐาน (Recall)"}
                  </div>
                  <div className="text-[11px] text-[#6B6A65] mt-0.5 leading-tight">
                    {language === "en" ? "Test definitions, core rules, and fundamental facts" : "ทดสอบการจดจำนิยาม สูตร และสาระสำคัญ"}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDifficulty("analysis")}
                  className={`p-3 rounded-xl text-left border transition-colors cursor-pointer ${
                    difficulty === "analysis"
                      ? "border-[#1F1E1D] bg-[#EFECE4]/70 text-[#1F1E1D]"
                      : "border-[#DFDDD6] bg-white hover:bg-[#FAF9F5]"
                  }`}
                >
                  <div className="text-xs font-semibold text-[#1F1E1D]">
                    {language === "en" ? "Applied & Analytical" : "ระดับประยุกต์ & วิเคราะห์"}
                  </div>
                  <div className="text-[11px] text-[#6B6A65] mt-0.5 leading-tight">
                    {language === "en" ? "Connect cause-and-effect, compare mechanisms & cases" : "เชื่อมโยงกลไก เปรียบเทียบ และสถานการณ์จำลอง"}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDifficulty("mixed")}
                  className={`p-3 rounded-xl text-left border transition-colors cursor-pointer ${
                    difficulty === "mixed"
                      ? "border-[#1F1E1D] bg-[#EFECE4]/70 text-[#1F1E1D]"
                      : "border-[#DFDDD6] bg-white hover:bg-[#FAF9F5]"
                  }`}
                >
                  <div className="text-xs font-semibold text-[#1F1E1D]">
                    {language === "en" ? "Mixed Balanced" : "คละระดับ (Mixed Balanced)"}
                  </div>
                  <div className="text-[11px] text-[#6B6A65] mt-0.5 leading-tight">
                    {language === "en" ? "Balanced ratio of recall precision and deep reasoning" : "สมดุลทั้งความจำเชิงลึกและการวิเคราะห์"}
                  </div>
                </button>

                {/* Olympiad / Competition */}
                <button
                  type="button"
                  onClick={() => setDifficulty("olympiad")}
                  className={`p-3 rounded-xl text-left border transition-colors cursor-pointer ${
                    difficulty === "olympiad"
                      ? "border-[#1F1E1D] bg-[#EFECE4]/70 text-[#1F1E1D]"
                      : "border-[#DFDDD6] bg-white hover:bg-[#FAF9F5]"
                  }`}
                >
                  <div className="text-xs font-semibold text-[#1F1E1D] flex items-center">
                    <Flame className="w-3.5 h-3.5 mr-1 text-[#1F1E1D]" />
                    <span>{language === "en" ? "Olympiad / High-Stakes" : "ระดับแข่งขัน (Olympiad)"}</span>
                  </div>
                  <div className="text-[11px] text-[#6B6A65] mt-0.5 leading-tight">
                    {language === "en" ? "Competition-grade traps, subtle distractors, high rigor" : "ข้อสอบแนวแข่งขัน ตัวเลือกหลอกดักจุดสับสนขั้นสูง"}
                  </div>
                </button>
              </div>
            </div>

            {/* Timer Setting */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-[#1F1E1D] uppercase tracking-wider">
                  {language === "en" ? "Exam Duration (Countdown Timer)" : "เวลาทำข้อสอบ"}
                </label>
                <span className="text-[11px] text-[#6B6A65]">
                  {language === "en" ? "Customizable duration" : "ปรับแต่งเวลาได้อิสระ"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      customTimerMinutes === null && timerMinutesPerQuestion === item.val
                        ? "border-[#1F1E1D] bg-[#1F1E1D] text-white"
                        : "border-[#DFDDD6] bg-white text-[#1F1E1D] hover:bg-[#FAF9F5]"
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </div>
                  </button>
                ))}

                {/* Inline Custom Time Button (no window.prompt) */}
                <button
                  type="button"
                  onClick={handleToggleCustomTimer}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    customTimerMinutes !== null
                      ? "border-[#1F1E1D] bg-[#1F1E1D] text-white"
                      : "border-[#DFDDD6] bg-white text-[#1F1E1D] hover:bg-[#FAF9F5]"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {customTimerMinutes !== null
                        ? (language === "en" ? `Custom: ${customTimerMinutes} min` : `กำหนดเอง: ${customTimerMinutes} นาที`)
                        : (language === "en" ? "Custom Time" : "กำหนดเวลาเอง")}
                    </span>
                  </div>
                </button>
              </div>

              {customTimerMinutes !== null && (
                <div className="mt-3 flex items-center space-x-2 text-xs">
                  <label htmlFor="custom-timer-minutes-input" className="text-[#6B6A65]">
                    {language === "en" ? "Total minutes (1 - 300):" : "ระบุเวลารวม (1 - 300 นาที):"}
                  </label>
                  <input
                    id="custom-timer-minutes-input"
                    type="number"
                    min={1}
                    max={300}
                    value={customTimerInput}
                    onChange={(e) => handleCustomTimerChange(e.target.value)}
                    className="w-24 px-2.5 py-1.5 bg-[#FAF9F5] border border-[#DFDDD6] rounded-lg text-[16px] sm:text-sm font-semibold text-center text-[#1F1E1D] focus:outline-none focus:border-[#1F1E1D]"
                  />
                  <span className="text-[#6B6A65]">{language === "en" ? "min" : "นาที"}</span>
                </div>
              )}

              <p className="text-[11px] text-[#6B6A65] mt-2">
                {language === "en" ? "Total time allocated: " : "เวลารวมที่กำหนด: "}
                <strong className="text-[#1F1E1D]">{totalQuizTime} {language === "en" ? "minutes" : "นาที"}</strong>
                {language === "en" ? ` for ${effectiveQuestionCount} questions` : ` สำหรับข้อสอบ ${effectiveQuestionCount} ข้อ`}
              </p>
            </div>

            {/* Custom Prompt Input */}
            <div className="pt-4 border-t border-[#ECEAE3]">
              <PromptInputWithAnimatedPlaceholder
                id="quiz-custom-prompt"
                value={customPrompt}
                onChange={setCustomPrompt}
                label={language === "en" ? "Custom Exam Prompt & Directives" : "กำหนดคำสั่งพิเศษ / พรอมต์โจทย์ปรนัย"}
                description={
                  language === "en"
                    ? "Specify question focus, Olympiad traps, calculation heavy, or real-life scenario case studies"
                    : "ระบุเงื่อนไขข้อสอบ เช่น เน้นวิเคราะห์สถานการณ์, สอบแข่งขัน, คำนวณสูตร หรือตัวเลือกหลอกแนบเนียน"
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
              className={`w-full py-3.5 px-6 rounded-xl font-medium text-sm sm:text-base flex items-center justify-center space-x-2 cursor-pointer transition-colors ${
                isLoading
                  ? "bg-[#EFECE4] text-[#9A9891] border border-[#E2DFD7] cursor-not-allowed"
                  : "bg-[#1F1E1D] hover:bg-[#33322F] text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isLoading
                  ? (language === "en" ? "Generating practice exam..." : "กำลังสร้างแบบทดสอบจากเนื้อหา...")
                  : (language === "en"
                      ? `Start Practice Exam (${effectiveQuestionCount} Questions • ${totalQuizTime} Mins)`
                      : `เริ่มทำแบบทดสอบทันที (${effectiveQuestionCount} ข้อ • ${totalQuizTime} นาที)`)}
              </span>
            </button>
          </div>
        )}

        {activeTab === "flashcards" && (
          <div className="space-y-6">
            <div className="border-b border-[#ECEAE3] pb-4">
              <h3 className="text-base font-semibold text-[#1F1E1D] flex items-center">
                <Layers className="w-4 h-4 mr-2 text-[#1F1E1D]" />
                {language === "en" ? "Extract Key Concept Flashcards" : "สกัดแฟลชการ์ดคีย์เวิร์ดสำคัญ"}
              </h3>
              <p className="text-xs text-[#6B6A65] mt-1">
                {language === "en"
                  ? "Extract technical vocabulary, core definitions, and high-frequency exam traps."
                  : "สกัดคำศัพท์เฉพาะ นิยามสำคัญ และจุดระวังในข้อสอบ"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1E1D] uppercase tracking-wider mb-2">
                {language === "en" ? "Number of Flashcards" : "จำนวนแฟลชการ์ดที่ต้องการ"}
              </label>
              <div className="grid grid-cols-3 gap-2.5 max-w-sm">
                {[6, 8, 12].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setCardCount(cnt)}
                    className={`py-2.5 px-4 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                      cardCount === cnt
                        ? "border-[#1F1E1D] bg-[#1F1E1D] text-white"
                        : "border-[#DFDDD6] bg-white text-[#1F1E1D] hover:bg-[#FAF9F5]"
                    }`}
                  >
                    {cnt} {language === "en" ? "Cards" : "แผ่น"}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#FAF9F5] rounded-xl border border-[#E5E3DC] text-xs text-[#6B6A65] space-y-1.5">
              <div className="font-semibold text-[#1F1E1D]">
                {language === "en" ? "What will be extracted into flashcards:" : "สิ่งที่ระบบจะสกัดลงในการ์ด:"}
              </div>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  {language === "en"
                    ? "Key terms and accurate academic definitions grounded in source notes"
                    : "คำศัพท์และนิยามสำคัญตามเนื้อหาที่วาง"}
                </li>
                <li>
                  {language === "en"
                    ? "Exam Watchouts: pitfall warnings and easily confused concepts"
                    : "จุดระวังที่ข้อสอบมักนำมาออกหลอกให้สับสน"}
                </li>
                <li>
                  {language === "en"
                    ? "Verbatim source quotes ensuring fidelity"
                    : "ข้อความอ้างอิงตรงจากเนื้อหาเพื่อความแม่นยำ"}
                </li>
              </ul>
            </div>

            {/* Custom Prompt Input */}
            <div className="pt-4 border-t border-[#ECEAE3]">
              <PromptInputWithAnimatedPlaceholder
                id="flashcard-custom-prompt"
                value={customPrompt}
                onChange={setCustomPrompt}
                label={language === "en" ? "Custom Flashcard Prompt & Directives" : "กำหนดคำสั่งพิเศษ / พรอมต์สกัดแฟลชการ์ด"}
                description={
                  language === "en"
                    ? "Specify terms, formulas, or focus areas"
                    : "ระบุคำศัพท์หรือหัวข้อที่อยากเน้นเป็นพิเศษ เช่น ศัพท์เทคนิค จุดระวัง หรือทฤษฎีสำคัญ"
                }
                disabled={isLoading}
              />
            </div>

            <button
              id="start-flashcards-btn"
              type="button"
              disabled={isLoading}
              onClick={() => onStartFlashcards(cardCount, customPrompt)}
              className={`w-full py-3.5 px-6 rounded-xl font-medium text-sm sm:text-base flex items-center justify-center space-x-2 cursor-pointer transition-colors ${
                isLoading
                  ? "bg-[#EFECE4] text-[#9A9891] border border-[#E2DFD7] cursor-not-allowed"
                  : "bg-[#1F1E1D] hover:bg-[#33322F] text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
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
            <div className="border-b border-[#ECEAE3] pb-4">
              <h3 className="text-base font-semibold text-[#1F1E1D] flex items-center">
                <Edit3 className="w-4 h-4 mr-2 text-[#1F1E1D]" />
                {language === "en" ? "Subjective Questions & AI Rubric Grader" : "ข้อสอบข้อเขียน & ตรวจคำตอบตาม Rubric"}
              </h3>
              <p className="text-xs text-[#6B6A65] mt-1">
                {language === "en"
                  ? "Simulate analytical exam questions, write your explanation, and receive instant feedback based on rubric criteria."
                  : "จำลองข้อสอบอัตนัย พิมพ์อธิบายด้วยตนเอง และรับการประเมินคำตอบอ้างอิงจากบทเรียน"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1E1D] uppercase tracking-wider mb-2">
                {language === "en" ? "Number of Questions" : "จำนวนข้อสอบข้อเขียน"}
              </label>
              <div className="grid grid-cols-2 gap-2.5 max-w-sm">
                {[3, 4].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setSubjectiveCount(cnt)}
                    className={`py-2.5 px-4 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                      subjectiveCount === cnt
                        ? "border-[#1F1E1D] bg-[#1F1E1D] text-white"
                        : "border-[#DFDDD6] bg-white text-[#1F1E1D] hover:bg-[#FAF9F5]"
                    }`}
                  >
                    {cnt} {language === "en" ? "Questions" : "ข้อ"}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#FAF9F5] rounded-xl border border-[#E5E3DC] text-xs text-[#6B6A65] space-y-1">
              <div className="font-semibold text-[#1F1E1D]">
                {language === "en" ? "AI Rubric Evaluation:" : "ระบบตรวจคำตอบตามเกณฑ์ Rubric:"}
              </div>
              <p className="leading-relaxed">
                {language === "en"
                  ? "Once you submit your answer, AI analyzes your response against the original source notes, evaluating out of 10 points with specific strengths, missing keywords, and suggestions."
                  : "เมื่อพิมพ์ตอบและกดส่ง ระบบจะตรวจเทียบกับเนื้อหาต้นฉบับ ให้คะแนนเต็ม 10 คะแนน พร้อมระบุจุดที่ตอบได้ดี คีย์เวิร์ดที่ขาด และคำแนะนำปรับปรุง"}
              </p>
            </div>

            {/* Custom Prompt Input */}
            <div className="pt-4 border-t border-[#ECEAE3]">
              <PromptInputWithAnimatedPlaceholder
                id="subjective-custom-prompt"
                value={customPrompt}
                onChange={setCustomPrompt}
                label={language === "en" ? "Custom Subjective Prompt & Directives" : "กำหนดคำสั่งพิเศษ / พรอมต์ข้อสอบข้อเขียน"}
                description={
                  language === "en"
                    ? "Specify question style (e.g. compare & contrast, hypothetical scenario problem-solving)"
                    : "ระบุแนวคำถามข้อเขียนที่ต้องการ เช่น เน้นเปรียบเทียบ แก้ปัญหาจากสถานการณ์สมมติ หรืออธิบายกลไกละเอียด"
                }
                disabled={isLoading}
              />
            </div>

            <button
              id="start-subjective-btn"
              type="button"
              disabled={isLoading}
              onClick={() => onStartSubjective(subjectiveCount, customPrompt)}
              className={`w-full py-3.5 px-6 rounded-xl font-medium text-sm sm:text-base flex items-center justify-center space-x-2 cursor-pointer transition-colors ${
                isLoading
                  ? "bg-[#EFECE4] text-[#9A9891] border border-[#E2DFD7] cursor-not-allowed"
                  : "bg-[#1F1E1D] hover:bg-[#33322F] text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
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
