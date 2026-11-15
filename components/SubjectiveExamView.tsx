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

interface SubjectiveExamViewProps {
  title: string;
  notes: string;
  questions: SubjectiveQuestion[];
  onExit: () => void;
  onRecordHistory: (score: number, total: number) => void;
}

export function SubjectiveExamView({
  title,
  notes,
  questions,
  onExit,
  onRecordHistory,
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

      // Record to history
      onRecordHistory(data.score, 10);
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
    <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8">
      {/* Top Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {language === "en" ? "Free-Response Exam & Rubric" : "ข้อสอบข้อเขียน & Rubric"}
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 line-clamp-1">
            {title}
          </h2>
          <div className="text-xs text-slate-500 mt-1">
            {language === "en"
              ? `Question ${currentIndex + 1} of ${questions.length}`
              : `ข้อที่ ${currentIndex + 1} จาก ${questions.length} ข้อ`}
          </div>
        </div>

        <button
          onClick={onExit}
          type="button"
          className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs self-start sm:self-center"
        >
          {language === "en" ? "Back to Mode Selector" : "กลับหน้าเลือกโหมด"}
        </button>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left / Main Question & Answering Area */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 lg:p-10 shadow-xs space-y-6">
            {/* Question Header */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-8 h-8 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                  {currentIndex + 1}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {language === "en" ? "Analytical Free-Response Prompt" : "โจทย์ข้อสอบอัตนัยเชิงวิเคราะห์"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 leading-relaxed pt-1">
                {currentQ.question}
              </h3>
              {currentQ.context && (
                <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                  {currentQ.context}
                </p>
              )}
            </div>

            {/* Rubric Criteria Guide Hint */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 text-xs sm:text-sm space-y-1">
              <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                <BookOpen className="w-4 h-4 text-slate-700" />
                <span>{language === "en" ? "Rubrics & Grading Criteria:" : "เกณฑ์การให้คะแนน (Rubrics Guide):"}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">{currentQ.rubricGuide}</p>
            </div>

            {/* Answer Input Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
                <label
                  htmlFor="subjective-textarea"
                  className="font-semibold text-slate-800"
                >
                  {language === "en" ? "Type your answer in your own words:" : "พิมพ์คำอธิบายของคุณด้วยสำนวนของตนเอง:"}
                </label>
                <span>{wordCount} {language === "en" ? "words" : "คำ"}</span>
              </div>

              <textarea
                id="subjective-textarea"
                rows={8}
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
                    : "เขียนอธิบายกลไก นิยาม สาระสำคัญ และความเชื่อมโยงตามบทเรียนที่สรุปไว้..."
                }
                className="w-full p-4 sm:p-5 text-sm sm:text-base text-slate-900 bg-slate-50/50 focus:bg-white rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 outline-hidden transition-all leading-relaxed min-h-[180px]"
              />
            </div>

            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-center space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                  <span>{language === "en" ? "Previous" : "ข้อก่อนหน้า"}</span>
                </button>
                <button
                  type="button"
                  disabled={currentIndex === questions.length - 1}
                  onClick={() =>
                    setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))
                  }
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <span>{language === "en" ? "Next" : "ข้อถัดไป"}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <button
                id="grade-subjective-btn"
                type="button"
                disabled={!isAnswered || isGrading}
                onClick={handleGradeCurrent}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>
                  {isGrading
                    ? language === "en"
                      ? "Grading response against Rubric..."
                      : "ระบบกำลังตรวจเทียบเกณฑ์ Rubric..."
                    : language === "en"
                    ? "Evaluate Answer with AI"
                    : "ส่งตรวจคำตอบด้วย AI"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right / Rubric Assessment Results Panel */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center">
              <Award className="w-4 h-4 mr-1.5 text-slate-700" />
              {language === "en" ? "Rubric Evaluation" : "ผลการประเมิน (Rubric Evaluation)"}
            </h4>

            {!currentResult ? (
              <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                <Edit3 className="w-8 h-8 mx-auto text-slate-300" />
                <p>
                  {language === "en"
                    ? 'Write your response and click "Evaluate Answer with AI" to grade against academic criteria.'
                    : 'พิมพ์คำอธิบายและกดปุ่ม "ส่งตรวจคำตอบด้วย AI" เพื่อให้ตรวจเทียบกับเกณฑ์อย่างละเอียด'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Score badge */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                  <div className="text-3xl font-extrabold text-slate-900 font-mono">
                    {currentResult.score} / {currentResult.total}
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    {currentResult.verdict} ({currentResult.percentage}%)
                  </div>
                </div>

                {/* Strengths */}
                {currentResult.strengths.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-emerald-700 flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      {language === "en" ? "Demonstrated Strengths:" : "จุดที่อธิบายได้ถูกต้อง:"}
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-700">
                      {currentResult.strengths.map((str, idx) => (
                        <li key={idx}>{str}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing key points */}
                {currentResult.missingKeyPoints.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-amber-800 flex items-center">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      {language === "en" ? "Missing Key Points:" : "คีย์เวิร์ดที่ยังขาดไปจากสรุป:"}
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-xs text-amber-900">
                      {currentResult.missingKeyPoints.map((mis, idx) => (
                        <li key={idx}>{mis}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Constructive critique */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900 flex items-center">
                    <Lightbulb className="w-3.5 h-3.5 mr-1 text-slate-700" />
                    {language === "en" ? "Feedback for Mastery:" : "คำแนะนำในการตอบให้สมบูรณ์:"}
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {currentResult.wordByWordFeedback}
                  </p>
                </div>

                {/* Model Answer */}
                {currentResult.modelAnswer && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-900">
                      {language === "en" ? "Exemplar Answer (Model Answer):" : "แนวทางคำตอบสมบูรณ์ (Model Answer):"}
                    </span>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 leading-relaxed font-mono">
                      {currentResult.modelAnswer}
                    </div>
                  </div>
                )}

                {/* Grounded Quote */}
                {currentResult.groundedQuote && (
                  <div className="text-xs text-slate-500 italic flex items-start space-x-1 pt-1">
                    <Quote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
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
