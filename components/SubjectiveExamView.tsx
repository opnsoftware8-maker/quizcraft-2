"use client";

import React, { useState } from "react";
import {
  Edit3,
  Send,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Award,
  RotateCcw,
  Quote,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { SubjectiveQuestion, SubjectiveGradingResult } from "@/types/exam";
import { getCustomApiHeaders } from "@/lib/custom-key";
import { useLanguage } from "@/lib/language-context";
import { SaveToHistoryButton } from "@/components/SaveToHistoryButton";

interface SubjectiveExamViewProps {
  title: string;
  notes: string;
  questions: SubjectiveQuestion[];
  onExit: () => void;
  onSaveToHistory?: () => Promise<void>;
  isSavedToHistory?: boolean;
}

export function SubjectiveExamView({
  title,
  notes,
  questions,
  onExit,
  onSaveToHistory,
  isSavedToHistory = false,
}: SubjectiveExamViewProps) {
  const { language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [gradingResults, setGradingResults] = useState<
    Record<number, SubjectiveGradingResult>
  >({});
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentQ = questions[currentIndex];
  if (!currentQ) return null;

  const currentAnswer = answers[currentIndex] || "";
  const currentResult = gradingResults[currentIndex];
  const isAnswered = currentAnswer.trim().length > 0;

  const handleGradeCurrent = async () => {
    if (!currentAnswer.trim()) {
      setErrorMsg(
        language === "en"
          ? "Please type your written answer before submitting for evaluation."
          : "กรุณาพิมพ์คำตอบข้อเขียนของคุณก่อนส่งตรวจ"
      );
      return;
    }

    setIsGrading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/grade-subjective", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCustomApiHeaders(),
        },
        body: JSON.stringify({
          notes,
          question: currentQ.question,
          context: currentQ.context,
          idealKeyPoints: currentQ.idealKeyPoints,
          studentAnswer: currentAnswer,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            (language === "en"
              ? "Unable to evaluate written response"
              : "ไม่สามารถตรวจคำตอบได้")
        );
      }

      setGradingResults((prev) => ({
        ...prev,
        [currentIndex]: data,
      }));
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          (language === "en"
            ? "An error occurred while evaluating response"
            : "เกิดข้อผิดพลาดในการประเมินคำตอบ")
      );
    } finally {
      setIsGrading(false);
    }
  };

  const wordCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Top Bar */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#6B6A65] uppercase tracking-wider">
            {language === "en" ? "Free-Response Exam & Rubric" : "ข้อสอบข้อเขียน & Rubric"}
          </span>
          <h2 className="text-base sm:text-lg font-semibold text-[#1F1E1D] mt-0.5 line-clamp-1">
            {title}
          </h2>
          <div className="text-xs text-[#6B6A65] mt-1">
            {language === "en"
              ? `Question ${currentIndex + 1} of ${questions.length}`
              : `ข้อที่ ${currentIndex + 1} จาก ${questions.length} ข้อ`}
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 self-start sm:self-center">
          {onSaveToHistory && (
            <SaveToHistoryButton
              isSaved={isSavedToHistory}
              onSave={onSaveToHistory}
            />
          )}

          <button
            onClick={onExit}
            type="button"
            className="text-xs sm:text-sm font-medium text-[#1F1E1D] px-4 py-2 rounded-xl border border-[#DFDDD6] bg-white hover:bg-[#FAF9F5] transition-colors cursor-pointer"
          >
            {language === "en" ? "Back to Mode Selector" : "กลับหน้าเลือกโหมด"}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left / Main Question & Answering Area */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E3DC] p-5 sm:p-7 space-y-5">
            {/* Question Header */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-lg bg-[#1F1E1D] text-white text-xs font-semibold flex items-center justify-center">
                  {currentIndex + 1}
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-[#6B6A65]">
                  {language === "en" ? "Analytical Free-Response Prompt" : "โจทย์ข้อสอบอัตนัย"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-[#1F1E1D] leading-relaxed pt-1">
                {currentQ.question}
              </h3>
              {currentQ.context && (
                <p className="text-xs sm:text-sm text-[#4A4945] bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E5E3DC] leading-relaxed">
                  {currentQ.context}
                </p>
              )}
            </div>

            {/* Rubric Criteria Guide Hint */}
            <div className="p-4 bg-[#FAF9F5] rounded-xl border border-[#E5E3DC] text-xs sm:text-sm space-y-1">
              <div className="font-semibold text-[#1F1E1D] flex items-center space-x-1.5">
                <BookOpen className="w-4 h-4 text-[#1F1E1D]" />
                <span>{language === "en" ? "Rubrics & Grading Criteria:" : "เกณฑ์การให้คะแนน (Rubrics):"}</span>
              </div>
              <p className="text-[#4A4945] leading-relaxed">{currentQ.rubricGuide}</p>
            </div>

            {/* Answer Input Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm text-[#6B6A65]">
                <label
                  htmlFor="subjective-textarea"
                  className="font-medium text-[#1F1E1D]"
                >
                  {language === "en" ? "Type your answer in your own words:" : "พิมพ์คำอธิบายของคุณ:"}
                </label>
                <span>{wordCount} {language === "en" ? "words" : "คำ"}</span>
              </div>

              <textarea
                id="subjective-textarea"
                rows={7}
                value={currentAnswer}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [currentIndex]: e.target.value,
                  }))
                }
                placeholder={
                  language === "en"
                    ? "Explain the mechanism, definition, key concepts, and causal relationships based on the source material..."
                    : "เขียนอธิบายกลไก นิยาม สาระสำคัญ และความเชื่อมโยงตามเนื้อหา..."
                }
                className="w-full p-4 text-[16px] sm:text-base text-[#1F1E1D] placeholder:text-[#9A9891] bg-[#FAF9F5] focus:bg-white rounded-xl border border-[#DFDDD6] focus:border-[#1F1E1D] outline-none transition-colors leading-relaxed min-h-[180px]"
              />
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-[#EFECE4] border border-[#DFDDD6] rounded-xl text-xs sm:text-sm text-[#1F1E1D] flex items-center space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-[#1F1E1D] shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-[#ECEAE3]">
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                  className="px-4 py-2 rounded-xl border border-[#DFDDD6] bg-white text-xs sm:text-sm font-medium text-[#1F1E1D] hover:bg-[#FAF9F5] disabled:opacity-30 disabled:pointer-events-none inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-[#6B6A65]" />
                  <span>{language === "en" ? "Previous" : "ข้อก่อนหน้า"}</span>
                </button>
                <button
                  type="button"
                  disabled={currentIndex === questions.length - 1}
                  onClick={() =>
                    setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))
                  }
                  className="px-4 py-2 rounded-xl border border-[#DFDDD6] bg-white text-xs sm:text-sm font-medium text-[#1F1E1D] hover:bg-[#FAF9F5] disabled:opacity-30 disabled:pointer-events-none inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>{language === "en" ? "Next" : "ข้อถัดไป"}</span>
                  <ChevronRight className="w-4 h-4 text-[#6B6A65]" />
                </button>
              </div>

              <button
                id="grade-subjective-btn"
                type="button"
                disabled={!isAnswered || isGrading}
                onClick={handleGradeCurrent}
                className="px-5 py-2.5 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] text-white text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>
                  {isGrading
                    ? language === "en"
                      ? "Grading response..."
                      : "กำลังตรวจเทียบเกณฑ์ Rubric..."
                    : language === "en"
                    ? "Evaluate Answer"
                    : "ส่งตรวจคำตอบ"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right / Rubric Assessment Results Panel */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">
          <div className="bg-white rounded-2xl border border-[#E5E3DC] p-5 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1F1E1D] flex items-center">
              <Award className="w-4 h-4 mr-1.5 text-[#1F1E1D]" />
              {language === "en" ? "Rubric Evaluation" : "ผลการประเมิน"}
            </h4>

            {!currentResult ? (
              <div className="text-center py-8 text-xs text-[#6B6A65] space-y-2">
                <Edit3 className="w-7 h-7 mx-auto text-[#9A9891]" />
                <p>
                  {language === "en"
                    ? 'Write your response and click "Evaluate Answer" to grade against criteria.'
                    : 'พิมพ์คำอธิบายแล้วกด "ส่งตรวจคำตอบ" เพื่อให้ระบบตรวจตามเกณฑ์'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Score badge */}
                <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] text-center space-y-1">
                  <div className="text-3xl font-bold text-[#1F1E1D] font-mono">
                    {currentResult.score} / {currentResult.total}
                  </div>
                  <div className="text-xs font-semibold text-[#1F1E1D]">
                    {currentResult.verdict} ({currentResult.percentage}%)
                  </div>
                </div>

                {/* Strengths */}
                {currentResult.strengths.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[#1F1E1D] flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#1F1E1D]" />
                      {language === "en" ? "Demonstrated Strengths:" : "จุดที่อธิบายได้ถูกต้อง:"}
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-xs text-[#4A4945]">
                      {currentResult.strengths.map((str, idx) => (
                        <li key={idx}>{str}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing key points */}
                {currentResult.missingKeyPoints.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[#1F1E1D] flex items-center">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-[#1F1E1D]" />
                      {language === "en" ? "Missing Key Points:" : "คีย์เวิร์ดที่ยังขาด:"}
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-xs text-[#4A4945]">
                      {currentResult.missingKeyPoints.map((mis, idx) => (
                        <li key={idx}>{mis}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Constructive critique */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-[#1F1E1D] flex items-center">
                    <Lightbulb className="w-3.5 h-3.5 mr-1 text-[#1F1E1D]" />
                    {language === "en" ? "Feedback for Mastery:" : "คำแนะนำเพิ่มเติม:"}
                  </span>
                  <p className="text-xs text-[#4A4945] leading-relaxed bg-[#FAF9F5] p-2.5 rounded-lg border border-[#E5E3DC]">
                    {currentResult.wordByWordFeedback}
                  </p>
                </div>

                {/* Model Answer */}
                {currentResult.modelAnswer && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-[#1F1E1D]">
                      {language === "en" ? "Exemplar Answer:" : "แนวทางคำตอบสมบูรณ์:"}
                    </span>
                    <div className="p-2.5 bg-[#FAF9F5] border border-[#E5E3DC] rounded-lg text-xs text-[#1F1E1D] leading-relaxed font-mono">
                      {currentResult.modelAnswer}
                    </div>
                  </div>
                )}

                {/* Grounded Quote */}
                {currentResult.groundedQuote && (
                  <div className="text-xs text-[#6B6A65] italic flex items-start space-x-1 pt-1">
                    <Quote className="w-3 h-3 text-[#9A9891] shrink-0 mt-0.5" />
                    <span>&ldquo;{currentResult.groundedQuote}&rdquo;</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
