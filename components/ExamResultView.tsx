"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Award,
  Clock,
  RotateCcw,
  Printer,
  ChevronDown,
  ChevronUp,
  Quote,
  AlertTriangle,
  Lightbulb,
  FileText,
  Check,
  X,
  Sparkles,
  Target,
  Brain,
  AlertCircle,
} from "lucide-react";
import { ExamQuestion } from "@/types/exam";
import { getCustomApiHeaders } from "@/lib/custom-key";
import { useLanguage } from "@/lib/language-context";
import { SaveToHistoryButton } from "@/components/SaveToHistoryButton";

interface ExamResultViewProps {
  examTitle: string;
  subject: string;
  questions: ExamQuestion[];
  userAnswers: Record<number, number>;
  timeSpentSeconds: number;
  onRetry: () => void;
  onNewExam: () => void;
  hasCustomKey?: boolean;
  onOpenApiKeyModal?: () => void;
  onSaveToHistory?: () => Promise<void>;
  isSavedToHistory?: boolean;
}

interface DiagnosticResult {
  cognitiveDiagnosis: string;
  criticalKnowledgeGaps: {
    gapTitle: string;
    description: string;
    remedy: string;
  }[];
  actionPlan: string[];
  encouragement: string;
}

export function ExamResultView({
  examTitle,
  subject,
  questions,
  userAnswers,
  timeSpentSeconds,
  onRetry,
  onNewExam,
  hasCustomKey = false,
  onOpenApiKeyModal = () => {},
  onSaveToHistory,
  isSavedToHistory = false,
}: ExamResultViewProps) {
  const { language } = useLanguage();
  const [filter, setFilter] = useState<"all" | "incorrect" | "correct">("all");
  const [expandedQuotes, setExpandedQuotes] = useState<Record<number, boolean>>({});

  // AI Diagnostic State
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);

  let correctCount = 0;
  const incorrectQuestions: { q: ExamQuestion; index: number; userChoice: number | undefined }[] = [];

  questions.forEach((q, idx) => {
    const userSelected = userAnswers[idx];
    if (userSelected === q.correctIndex) {
      correctCount++;
    } else {
      incorrectQuestions.push({ q, index: idx, userChoice: userSelected });
    }
  });

  const total = questions.length;
  const percentage = Math.round((correctCount / total) * 100);

  const handlePrint = () => {
    window.print();
  };

  const handleRunAiDiagnostic = async () => {
    setIsDiagnosing(true);
    setDiagnosticError(null);

    try {
      const payload = {
        subject,
        examTitle,
        scorePercentage: percentage,
        language,
        incorrectQuestions: incorrectQuestions.map((item) => ({
          question: item.q.question,
          keyConcept: item.q.keyConcept,
          explanation: item.q.explanation,
          correctText: item.q.options[item.q.correctIndex],
          userChoiceText:
            item.userChoice !== undefined
              ? item.q.options[item.userChoice]
              : language === "en"
              ? "Unanswered"
              : "ไม่ได้ตอบ",
        })),
      };

      const res = await fetch("/api/diagnose-weakness", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCustomApiHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error ||
            (language === "en"
              ? "Failed to analyze learning gaps"
              : "เกิดข้อผิดพลาดในการวิเคราะห์จุดอ่อน")
        );
      }

      const data: DiagnosticResult = await res.json();
      setDiagnostic(data);
    } catch (e: any) {
      setDiagnosticError(
        e?.message ||
          (language === "en"
            ? "Could not connect to AI diagnostic system"
            : "ไม่สามารถเชื่อมต่อระบบวิเคราะห์ AI ได้")
      );
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Exam Readiness Index Determination
  let readinessLabel = "";
  let readinessDescription = "";

  if (percentage >= 90) {
    readinessLabel =
      language === "en"
        ? "Mastery — Exam Ready"
        : "พร้อมสอบระดับยอดเยี่ยม";
    readinessDescription =
      language === "en"
        ? "High accuracy across concepts and theories. Fully prepared for official examinations."
        : "คุณมีความแม่นยำในเนื้อหาและทฤษฎีในระดับสูงมาก พร้อมสอบจริงอย่างมั่นใจ";
  } else if (percentage >= 75) {
    readinessLabel =
      language === "en" ? "Proficient" : "พร้อมสอบระดับดี";
    readinessDescription =
      language === "en"
        ? "Solid conceptual understanding with minor gaps in specific analysis questions."
        : "เข้าใจมโนทัศน์ส่วนใหญ่ได้ดี มีจุดบกพร่องเล็กน้อยในรายละเอียดหรือโจทย์วิเคราะห์";
  } else if (percentage >= 60) {
    readinessLabel =
      language === "en" ? "Needs Review" : "พอใช้ ควรทบทวนซ้ำ";
    readinessDescription =
      language === "en"
        ? "Some confusion around distractor choices and key definitions. Re-reading is recommended."
        : "ยังมีจุดที่สับสนระหว่างตัวเลือกและนิยามสำคัญ ควรกลับไปอ่านทวนในหัวข้อที่ผิด";
  } else {
    readinessLabel =
      language === "en"
        ? "Critical Learning Gaps"
        : "ควรทบทวนเนื้อหาเพิ่มเติม";
    readinessDescription =
      language === "en"
        ? "Multiple knowledge gaps detected. We recommend reading the lesson summary 1-2 more times."
        : "พบช่องว่างความเข้าใจในสาระสำคัญหลายจุด แนะนำให้อ่านสรุปบทเรียนซ้ำอีก 1-2 รอบ";
  }

  const commonMisconceptions = incorrectQuestions.map((item) => ({
    concept: item.q.keyConcept,
    questionText: item.q.question,
    watchout:
      language === "en"
        ? `Review concept: ${item.q.keyConcept}`
        : `ควรทบทวนเรื่อง: ${item.q.keyConcept}`,
    sourceQuote: item.q.sourceQuote,
  }));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return language === "en"
      ? `${m} min ${s} sec`
      : `${m} นาที ${s} วินาที`;
  };

  const choiceLetters = ["A", "B", "C", "D"];

  const toggleQuote = (idx: number) => {
    setExpandedQuotes((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const filteredQuestions = questions
    .map((q, idx) => ({ q, idx, isCorrect: userAnswers[idx] === q.correctIndex }))
    .filter((item) => {
      if (filter === "correct") return item.isCorrect;
      if (filter === "incorrect") return !item.isCorrect;
      return true;
    });

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="text-xs font-semibold text-[#6B6A65] uppercase tracking-wider">
          {language === "en" ? "Assessment & Performance Review" : "ผลการทำแบบทดสอบและเฉลยละเอียด"}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onSaveToHistory && (
            <SaveToHistoryButton
              isSaved={isSavedToHistory}
              onSave={onSaveToHistory}
            />
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center px-3.5 py-2 rounded-xl border border-[#DFDDD6] text-xs font-medium text-[#1F1E1D] bg-white hover:bg-[#FAF9F5] transition-colors cursor-pointer"
            title={language === "en" ? "Print / Save PDF" : "พิมพ์ผลสอบ / บันทึก PDF"}
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-[#6B6A65]" />
            <span>{language === "en" ? "Print / PDF" : "พิมพ์ / PDF"}</span>
          </button>

          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center px-3.5 py-2 rounded-xl border border-[#DFDDD6] text-xs font-medium text-[#1F1E1D] bg-white hover:bg-[#FAF9F5] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-[#6B6A65]" />
            <span>{language === "en" ? "Retake Exam" : "ทำใหม่อีกครั้ง"}</span>
          </button>
          <button
            type="button"
            onClick={onNewExam}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] text-xs font-medium text-white transition-colors cursor-pointer"
          >
            <span>{language === "en" ? "New Practice Session" : "เลือกเนื้อหาใหม่"}</span>
          </button>
        </div>
      </div>

      {/* Scorecard & Exam Readiness Index */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-5 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-[#ECEAE3] pb-6">
          <div>
            <span className="text-xs font-semibold text-[#6B6A65] uppercase tracking-wider">
              {subject}
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-[#1F1E1D] mt-1">
              {examTitle}
            </h2>
            <div className="flex items-center space-x-3 text-xs sm:text-sm text-[#6B6A65] mt-1.5">
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1.5 text-[#6B6A65]" />
                {language === "en" ? `Time spent: ${formatTime(timeSpentSeconds)}` : `เวลาที่ใช้: ${formatTime(timeSpentSeconds)}`}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {language === "en" ? (
                  <>
                    Correct <strong className="text-[#1F1E1D]">{correctCount}</strong> of {total}
                  </>
                ) : (
                  <>
                    ตอบถูก <strong className="text-[#1F1E1D]">{correctCount}</strong> จาก {total} ข้อ
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Big Score Box */}
          <div className="flex items-center bg-[#FAF9F5] border border-[#E5E3DC] p-4 sm:p-5 rounded-2xl self-start sm:self-auto min-w-[180px] justify-center">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-[#1F1E1D] font-mono">
                {percentage}%
              </div>
              <div className="text-xs text-[#6B6A65] font-medium mt-1">
                {language === "en" ? `Total Score (${correctCount}/${total})` : `คะแนนรวม (${correctCount}/${total})`}
              </div>
            </div>
          </div>
        </div>

        {/* Exam Readiness Index Bar */}
        <div className="p-4 rounded-xl border border-[#E5E3DC] bg-[#FAF9F5] space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-[#1F1E1D]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1F1E1D]">
                {language === "en" ? "Exam Readiness" : "ระดับความพร้อมในการสอบ"}
              </span>
            </div>
            <span className="text-xs font-semibold text-[#1F1E1D] bg-[#EFECE4] px-2.5 py-0.5 rounded-lg">
              {readinessLabel}
            </span>
          </div>

          <div className="w-full bg-[#EFECE4] h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1F1E1D] transition-all duration-700"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-[#6B6A65]">{readinessDescription}</p>
        </div>

        {/* AI Deep Diagnostic Feature */}
        <div className="p-4 bg-[#FAF9F5] border border-[#E5E3DC] rounded-xl space-y-3 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Brain className="w-4 h-4 text-[#1F1E1D] shrink-0" />
              <div>
                <span className="text-xs font-semibold text-[#1F1E1D] uppercase tracking-wider block">
                  {language === "en" ? "AI Deep Diagnostic" : "วิเคราะห์จุดอ่อนเชิงลึก"}
                </span>
                <p className="text-xs text-[#6B6A65]">
                  {language === "en"
                    ? "Diagnose cognitive reasoning patterns, identify critical gaps, and get an action plan."
                    : "วิเคราะห์แนวคิด ระบุช่องว่างความรู้ที่ควรปิด พร้อมแผนทบทวน"}
                </p>
              </div>
            </div>

            {!diagnostic && (
              <button
                type="button"
                disabled={isDiagnosing}
                onClick={handleRunAiDiagnostic}
                className="px-3.5 py-2 bg-[#1F1E1D] hover:bg-[#33322F] text-white rounded-xl font-medium text-xs transition-colors flex items-center space-x-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isDiagnosing
                    ? language === "en"
                      ? "Diagnosing..."
                      : "กำลังวิเคราะห์..."
                    : language === "en"
                    ? "Run Diagnostic"
                    : "วิเคราะห์จุดบกพร่อง"}
                </span>
              </button>
            )}
          </div>

          {diagnosticError && (
            <div className="p-2.5 bg-[#EFECE4] border border-[#DFDDD6] rounded-lg text-xs text-[#1F1E1D] flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-[#1F1E1D] shrink-0" />
              <span>{diagnosticError}</span>
            </div>
          )}

          {/* Diagnostic Result Display */}
          {diagnostic && (
            <div className="mt-3 pt-3 border-t border-[#E5E3DC] space-y-3.5 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-[#E5E3DC] space-y-1">
                <div className="font-semibold text-[#1F1E1D] flex items-center space-x-1.5">
                  <Target className="w-4 h-4 text-[#1F1E1D]" />
                  <span>{language === "en" ? "Cognitive Diagnosis:" : "บทวิเคราะห์กระบวนการคิด:"}</span>
                </div>
                <p className="text-[#4A4945] leading-relaxed pl-5">
                  {diagnostic.cognitiveDiagnosis}
                </p>
              </div>

              {diagnostic.criticalKnowledgeGaps?.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-[#1F1E1D] flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#1F1E1D]" />
                    <span>{language === "en" ? "Critical Knowledge Gaps:" : "ช่องว่างความรู้ที่ควรทบทวน:"}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {diagnostic.criticalKnowledgeGaps.map((gap, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl border border-[#E5E3DC] space-y-1.5">
                        <div className="font-semibold text-[#1F1E1D] text-xs">{gap.gapTitle}</div>
                        <p className="text-xs text-[#4A4945]">{gap.description}</p>
                        <div className="text-xs text-[#1F1E1D] bg-[#FAF9F5] p-2 rounded-lg border border-[#ECEAE3]">
                          <strong>{language === "en" ? "Remedy:" : "วิธีแก้ไข:"}</strong> {gap.remedy}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diagnostic.actionPlan?.length > 0 && (
                <div className="p-3.5 bg-white rounded-xl border border-[#E5E3DC] space-y-1.5">
                  <div className="font-semibold text-[#1F1E1D]">
                    {language === "en" ? "Mastery Action Plan:" : "แผนปฏิบัติการทบทวน:"}
                  </div>
                  <ol className="list-decimal pl-4 space-y-1 text-[#4A4945]">
                    {diagnostic.actionPlan.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {diagnostic.encouragement && (
                <div className="text-xs text-[#6B6A65] italic bg-[#EFECE4]/60 p-2.5 rounded-lg text-center">
                  &ldquo;{diagnostic.encouragement}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Common Misconceptions */}
        {commonMisconceptions.length > 0 && (
          <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#1F1E1D]">
              <AlertTriangle className="w-4 h-4 text-[#1F1E1D]" />
              <span>{language === "en" ? "Common Misconceptions & Watchouts:" : "หัวข้อที่ควรระวังและทบทวน:"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {commonMisconceptions.map((mis, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border border-[#E5E3DC] text-xs space-y-1"
                >
                  <div className="font-semibold text-[#1F1E1D] flex items-center justify-between gap-2">
                    <span>{mis.concept}</span>
                    <span className="text-[10px] text-[#1F1E1D] bg-[#EFECE4] px-2 py-0.5 rounded-md shrink-0">
                      {language === "en" ? "Review" : "ทบทวน"}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6A65] leading-relaxed">
                    {mis.watchout}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Answer Key & Grounded Explanations */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-[#1F1E1D] flex items-center">
            <FileText className="w-4 h-4 mr-2 text-[#1F1E1D]" />
            {language === "en" ? "Detailed Answer Key & Explanations" : "เฉลยละเอียดและหลักฐานอ้างอิง"}
          </h3>

          {/* Filter tabs */}
          <div className="flex items-center space-x-1.5 text-xs no-print">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                filter === "all"
                  ? "bg-[#1F1E1D] text-white border-[#1F1E1D] font-medium"
                  : "bg-white text-[#6B6A65] border-[#DFDDD6] hover:text-[#1F1E1D]"
              }`}
            >
              {language === "en" ? `All (${questions.length})` : `ทั้งหมด (${questions.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilter("incorrect")}
              className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                filter === "incorrect"
                  ? "bg-[#1F1E1D] text-white border-[#1F1E1D] font-medium"
                  : "bg-white text-[#6B6A65] border-[#DFDDD6] hover:text-[#1F1E1D]"
              }`}
            >
              {language === "en" ? `Incorrect (${incorrectQuestions.length})` : `ข้อที่ผิด (${incorrectQuestions.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilter("correct")}
              className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                filter === "correct"
                  ? "bg-[#1F1E1D] text-white border-[#1F1E1D] font-medium"
                  : "bg-white text-[#6B6A65] border-[#DFDDD6] hover:text-[#1F1E1D]"
              }`}
            >
              {language === "en" ? `Correct (${correctCount})` : `ข้อที่ถูก (${correctCount})`}
            </button>
          </div>
        </div>

        {/* List of Detailed Questions */}
        <div className="space-y-3">
          {filteredQuestions.map(({ q, idx, isCorrect }) => {
            const userChoiceIdx = userAnswers[idx];
            const correctAnswerText = q.options[4] || q.options[q.correctIndex];
            const isExpanded = expandedQuotes[idx];

            return (
              <div
                key={q.id || idx}
                className="bg-white rounded-2xl border border-[#E5E3DC] p-5 sm:p-6 transition-all"
              >
                {/* Header of Question card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-semibold ${
                        isCorrect ? "bg-[#1F1E1D] text-white" : "bg-[#EFECE4] text-[#1F1E1D] border border-[#D4D1C8]"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium text-[#6B6A65]">
                      {q.keyConcept}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isCorrect ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[#EFECE4] text-[#1F1E1D]">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#1F1E1D]" />
                        {language === "en" ? "Correct (+1)" : "ถูกต้อง (+1)"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[#FAF9F5] text-[#6B6A65] border border-[#DFDDD6]">
                        <XCircle className="w-3.5 h-3.5 mr-1 text-[#6B6A65]" />
                        {language === "en" ? "Incorrect (0)" : "ไม่ถูกต้อง (0)"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Question */}
                <h4 className="text-sm sm:text-base font-semibold text-[#1F1E1D] leading-relaxed mb-4">
                  {q.question}
                </h4>

                {/* Choices breakdown */}
                <div className="space-y-2 mb-4">
                  {[0, 1, 2, 3].map((optIdx) => {
                    const choiceText = q.options[optIdx];
                    const isUserChoice = userChoiceIdx === optIdx;
                    const isTheCorrectChoice = q.correctIndex === optIdx;

                    let rowStyle = "bg-[#FAF9F5] border-[#E5E3DC] text-[#4A4945]";
                    if (isTheCorrectChoice) {
                      rowStyle = "bg-[#EFECE4] border-[#1F1E1D] text-[#1F1E1D] font-medium";
                    } else if (isUserChoice && !isCorrect) {
                      rowStyle = "bg-white border-[#C9C6BE] text-[#6B6A65] line-through";
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`w-full max-w-full p-2.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 ${rowStyle}`}
                      >
                        <div className="flex items-start space-x-2 min-w-0 flex-1">
                          <span className="font-semibold w-5 shrink-0 pt-0.5">{choiceLetters[optIdx]}.</span>
                          <span className="break-words leading-relaxed text-[#1F1E1D]">{choiceText}</span>
                        </div>
                        <div className="text-[11px] font-medium shrink-0 pl-7 sm:pl-0">
                          {isTheCorrectChoice && (
                            <span className="text-[#1F1E1D] inline-flex items-center">
                              <Check className="w-3.5 h-3.5 mr-1 shrink-0" />
                              {language === "en" ? "Correct answer" : "คำตอบที่ถูกต้อง"}
                            </span>
                          )}
                          {isUserChoice && !isTheCorrectChoice && (
                            <span className="text-[#6B6A65] inline-flex items-center">
                              <X className="w-3.5 h-3.5 mr-1 shrink-0" />
                              {language === "en" ? "Your answer" : "คำตอบของคุณ"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Key Explanation */}
                <div className="p-4 bg-[#FAF9F5] rounded-xl border border-[#E5E3DC] space-y-2 text-xs">
                  <div className="flex items-center space-x-1.5 font-semibold text-[#1F1E1D]">
                    <Lightbulb className="w-4 h-4 text-[#1F1E1D]" />
                    <span>{language === "en" ? "Explanation & Rationale:" : "คำอธิบายและเหตุผล:"}</span>
                  </div>
                  <p className="text-[#4A4945] leading-relaxed">
                    {q.explanation}
                  </p>

                  {/* Answer Key Verification */}
                  <div className="text-xs text-[#1F1E1D] font-mono bg-white p-2.5 rounded-lg border border-[#E5E3DC]">
                    <strong>{language === "en" ? "Answer Key:" : "เฉลยที่ระบุ:"}</strong> {correctAnswerText}
                  </div>

                  {/* Source Quote Accordion */}
                  {q.sourceQuote && (
                    <div className="pt-2 border-t border-[#ECEAE3]">
                      <button
                        type="button"
                        onClick={() => toggleQuote(idx)}
                        className="text-xs font-medium text-[#1F1E1D] hover:opacity-80 flex items-center space-x-1 cursor-pointer"
                      >
                        <Quote className="w-3 h-3 mr-0.5" />
                        <span>
                          {isExpanded
                            ? language === "en"
                              ? "Hide source quote"
                              : "ซ่อนข้อความอ้างอิง"
                            : language === "en"
                            ? "View source quote"
                            : "ดูข้อความอ้างอิงจากเนื้อหา"}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-2.5 bg-white rounded-lg border border-[#E5E3DC] text-xs text-[#6B6A65] font-mono italic">
                          &ldquo;{q.sourceQuote}&rdquo;
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
