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
  Filter,
  Check,
  X,
  Sparkles,
  Zap,
  Target,
  Brain,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { ExamQuestion } from "@/types/exam";
import { getCustomApiHeaders } from "@/lib/custom-key";
import { useLanguage } from "@/lib/language-context";

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
  let readinessColor = "";
  let readinessBadgeBg = "";
  let readinessDescription = "";

  if (percentage >= 90) {
    readinessLabel =
      language === "en"
        ? "Mastery — Exam Ready"
        : "พร้อมสอบระดับยอดเยี่ยม (Mastery - Exam Ready)";
    readinessColor = "text-emerald-700";
    readinessBadgeBg = "bg-emerald-50 border-emerald-200";
    readinessDescription =
      language === "en"
        ? "High accuracy across concepts and theories. Fully prepared for official examinations."
        : "คุณมีความแม่นยำในเนื้อหาและทฤษฎีในระดับสูงมาก พร้อมลงสนามสอบจริงอย่างมั่นใจ";
  } else if (percentage >= 75) {
    readinessLabel =
      language === "en" ? "Proficient" : "พร้อมสอบระดับดี (Proficient)";
    readinessColor = "text-blue-700";
    readinessBadgeBg = "bg-blue-50 border-blue-200";
    readinessDescription =
      language === "en"
        ? "Solid conceptual understanding with minor gaps in specific analysis questions."
        : "เข้าใจมโนทัศน์ส่วนใหญ่ได้ดี มีจุดบกพร่องเล็กน้อยในรายละเอียดหรือโจทย์วิเคราะห์";
  } else if (percentage >= 60) {
    readinessLabel =
      language === "en" ? "Needs Review" : "พอใช้ ควรทบทวนซ้ำ (Needs Review)";
    readinessColor = "text-amber-700";
    readinessBadgeBg = "bg-amber-50 border-amber-200";
    readinessDescription =
      language === "en"
        ? "Some confusion around distractor choices and key definitions. Re-reading is recommended."
        : "ยังมีจุดที่สับสนระหว่างตัวเลือกหลอกและนิยามสำคัญ ควรกลับไปอ่านทวนในหัวข้อที่ผิด";
  } else {
    readinessLabel =
      language === "en"
        ? "Critical Learning Gaps"
        : "มีช่องว่างความรู้เร่งด่วน (Critical Learning Gaps)";
    readinessColor = "text-rose-700";
    readinessBadgeBg = "bg-rose-50 border-rose-200";
    readinessDescription =
      language === "en"
        ? "Multiple knowledge gaps detected. We recommend reading the lesson summary 1-2 more times."
        : "พบช่องว่างความเข้าใจในสาระสำคัญหลายจุด แนะนำให้เปิดอ่านสรุปบทเรียนซ้ำอีก 1-2 รอบ";
  }

  const commonMisconceptions = incorrectQuestions.map((item) => ({
    concept: item.q.keyConcept,
    questionText: item.q.question,
    watchout:
      language === "en"
        ? `Review concept: ${item.q.keyConcept}`
        : `ระวังความสับสนเกี่ยวกับ: ${item.q.keyConcept}`,
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
    <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between no-print">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {language === "en" ? "Assessment & Score Performance Review" : "แบบประเมินผลคะแนนวิเคราะห์ผลการสอบ"}
        </div>
        <div className="flex items-center space-x-2.5">
          {/* PDF / Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            title={language === "en" ? "Print / Save PDF" : "พิมพ์ผลสอบ / บันทึก PDF"}
          >
            <Printer className="w-4 h-4 mr-1.5 text-slate-500" />
            <span>{language === "en" ? "Print / PDF" : "พิมพ์ผลสอบ / บันทึก PDF"}</span>
          </button>

          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 mr-1.5 text-slate-500" />
            <span>{language === "en" ? "Retake Exam" : "สอบใหม่อีกครั้ง"}</span>
          </button>
          <button
            type="button"
            onClick={onNewExam}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            <span>{language === "en" ? "New Practice Session" : "เลือกหัวข้อใหม่"}</span>
          </button>
        </div>
      </div>

      {/* Scorecard & Exam Readiness Index */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 lg:p-10 shadow-xs space-y-6 lg:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-100 pb-6">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {subject}
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mt-1">
              {examTitle}
            </h2>
            <div className="flex items-center space-x-3 text-xs sm:text-sm text-slate-500 mt-1.5">
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1.5 text-slate-400" />
                {language === "en" ? `Time spent: ${formatTime(timeSpentSeconds)}` : `เวลาที่ใช้: ${formatTime(timeSpentSeconds)}`}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {language === "en" ? (
                  <>
                    Correct <strong className="text-slate-900 font-bold">{correctCount}</strong> of {total} questions
                  </>
                ) : (
                  <>
                    ตอบถูก <strong className="text-slate-900 font-bold">{correctCount}</strong> จาก {total} ข้อ
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Big Score Box */}
          <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl self-start sm:self-auto min-w-[200px] justify-center">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 font-mono">
                {percentage}%
              </div>
              <div className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                {language === "en" ? `Total Score (${correctCount}/${total})` : `คะแนนสอบรวม (${correctCount}/${total})`}
              </div>
            </div>
          </div>
        </div>

        {/* Exam Readiness Index Bar */}
        <div className={`p-4 rounded-xl border ${readinessBadgeBg} space-y-2`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Award className={`w-5 h-5 ${readinessColor}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                {language === "en" ? "Exam Readiness Index" : "ระดับความพร้อมในการสอบ (Exam Readiness Index)"}
              </span>
            </div>
            <span className={`text-xs font-bold ${readinessColor}`}>
              {readinessLabel}
            </span>
          </div>

          {/* Readiness Progress Bar */}
          <div className="w-full bg-white/80 border border-slate-200 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                percentage >= 90
                  ? "bg-emerald-600"
                  : percentage >= 75
                  ? "bg-blue-600"
                  : percentage >= 60
                  ? "bg-amber-500"
                  : "bg-rose-600"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-slate-600">{readinessDescription}</p>
        </div>

        {/* AI Deep Diagnostic Feature */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-slate-700" />
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  {language === "en" ? "AI Deep Diagnostic" : "AI Deep Diagnostic (วิเคราะห์เจาะลึกจุดอ่อนด้วย AI)"}
                </span>
                <p className="text-xs text-slate-500">
                  {language === "en"
                    ? "Diagnose cognitive reasoning patterns, identify critical gaps, and get an action plan."
                    : "วิเคราะห์กระบวนการคิด ระบุจุดบกพร่องที่ต้องปิดด่วน พร้อมแผนปฏิบัติการ"}
                </p>
              </div>
            </div>

            {!diagnostic && (
              <button
                type="button"
                disabled={isDiagnosing}
                onClick={handleRunAiDiagnostic}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs shadow-xs transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {isDiagnosing
                    ? language === "en"
                      ? "Diagnosing..."
                      : "AI กำลังวิเคราะห์ผลสอบ..."
                    : language === "en"
                    ? "Run AI Diagnostic"
                    : "ให้ AI วินิจฉัยจุดบกพร่อง"}
                </span>
              </button>
            )}
          </div>

          {diagnosticError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{diagnosticError}</span>
            </div>
          )}

          {/* Diagnostic Result Display */}
          {diagnostic && (
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-4 text-xs">
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                  <Target className="w-4 h-4 text-slate-600" />
                  <span>{language === "en" ? "Cognitive Diagnosis:" : "บทวินิจฉัยเชิงกระบวนการคิด (Cognitive Diagnosis):"}</span>
                </div>
                <p className="text-slate-700 leading-relaxed pl-5">
                  {diagnostic.cognitiveDiagnosis}
                </p>
              </div>

              {diagnostic.criticalKnowledgeGaps?.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{language === "en" ? "Critical Knowledge Gaps:" : "ช่องว่างความรู้ที่ต้องปิดด่วน (Critical Knowledge Gaps):"}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {diagnostic.criticalKnowledgeGaps.map((gap, i) => (
                      <div key={i} className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                        <div className="font-bold text-slate-900 text-xs">{gap.gapTitle}</div>
                        <p className="text-xs text-slate-600">{gap.description}</p>
                        <div className="text-xs text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-200 font-medium">
                          <strong>{language === "en" ? "Remedy:" : "วิธีแก้ไข:"}</strong> {gap.remedy}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diagnostic.actionPlan?.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                  <div className="font-semibold text-slate-900">
                    {language === "en" ? "Mastery Action Plan:" : "แผนปฏิบัติการ 3 ขั้นตอนเพื่อพิชิตคะแนนเต็ม (Mastery Action Plan):"}
                  </div>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-700">
                    {diagnostic.actionPlan.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {diagnostic.encouragement && (
                <div className="text-xs text-slate-700 italic bg-slate-100 p-2 rounded text-center">
                  &ldquo;{diagnostic.encouragement}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Common Misconceptions */}
        {commonMisconceptions.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>{language === "en" ? "Common Misconceptions & Watchouts:" : "สรุปจุดที่เข้าใจผิดหรือข้อควรระวัง (Common Misconceptions):"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {commonMisconceptions.map((mis, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1"
                >
                  <div className="font-semibold text-slate-900 flex items-center justify-between">
                    <span>{mis.concept}</span>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      {language === "en" ? "Review" : "จุดบกพร่อง"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
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
          <h3 className="text-base font-bold text-slate-900 flex items-center">
            <FileText className="w-4 h-4 mr-2 text-slate-600" />
            {language === "en" ? "Detailed Answer Key & Source Grounding" : "เฉลยละเอียดและหลักฐานอ้างอิงต้นฉบับ 100% (Grounded Answer Key)"}
          </h3>

          {/* Filter tabs */}
          <div className="flex items-center space-x-1.5 text-xs no-print">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg border transition-colors cursor-pointer ${
                filter === "all"
                  ? "bg-slate-900 text-white border-slate-900 font-semibold"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {language === "en" ? `All (${questions.length})` : `ทั้งหมด (${questions.length})`}
            </button>
            <button
              onClick={() => setFilter("incorrect")}
              className={`px-3 py-1 rounded-lg border transition-colors cursor-pointer ${
                filter === "incorrect"
                  ? "bg-rose-700 text-white border-rose-700 font-semibold"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {language === "en" ? `Incorrect (${incorrectQuestions.length})` : `เฉพาะข้อที่ผิด (${incorrectQuestions.length})`}
            </button>
            <button
              onClick={() => setFilter("correct")}
              className={`px-3 py-1 rounded-lg border transition-colors cursor-pointer ${
                filter === "correct"
                  ? "bg-emerald-700 text-white border-emerald-700 font-semibold"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {language === "en" ? `Correct (${correctCount})` : `เฉพาะข้อที่ถูก (${correctCount})`}
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
                className={`bg-white rounded-xl border p-5 sm:p-6 shadow-xs transition-all ${
                  isCorrect
                    ? "border-emerald-200 hover:border-emerald-300"
                    : "border-rose-200 hover:border-rose-300"
                }`}
              >
                {/* Header of Question card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                        isCorrect ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {q.keyConcept}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isCorrect ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        {language === "en" ? "Correct (+1)" : "ถูกต้อง (+1)"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                        {language === "en" ? "Incorrect (0)" : "ไม่ถูกต้อง (0)"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Question */}
                <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed mb-4">
                  {q.question}
                </h4>

                {/* Choices breakdown */}
                <div className="space-y-2 mb-4">
                  {[0, 1, 2, 3].map((optIdx) => {
                    const choiceText = q.options[optIdx];
                    const isUserChoice = userChoiceIdx === optIdx;
                    const isTheCorrectChoice = q.correctIndex === optIdx;

                    let rowStyle = "bg-slate-50 border-slate-200 text-slate-600";
                    if (isTheCorrectChoice) {
                      rowStyle = "bg-emerald-50/80 border-emerald-300 text-emerald-900 font-medium";
                    } else if (isUserChoice && !isCorrect) {
                      rowStyle = "bg-rose-50/80 border-rose-300 text-rose-900 line-through";
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`w-full max-w-full p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 ${rowStyle}`}
                      >
                        <div className="flex items-start space-x-2 min-w-0 flex-1">
                          <span className="font-bold w-5 shrink-0 pt-0.5">{choiceLetters[optIdx]}.</span>
                          <span className="break-words leading-relaxed text-slate-900">{choiceText}</span>
                        </div>
                        <div className="text-[11px] font-semibold shrink-0 pl-7 sm:pl-0">
                          {isTheCorrectChoice && (
                            <span className="text-emerald-700 inline-flex items-center">
                              <Check className="w-3.5 h-3.5 mr-1 text-emerald-700 shrink-0" />
                              {language === "en" ? "Correct answer" : "คำตอบที่ถูกต้อง"}
                            </span>
                          )}
                          {isUserChoice && !isTheCorrectChoice && (
                            <span className="text-rose-700 inline-flex items-center">
                              <X className="w-3.5 h-3.5 mr-1 text-rose-700 shrink-0" />
                              {language === "en" ? "Your answer" : "ตัวเลือกที่คุณตอบ"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Key Explanation */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center space-x-1.5 font-semibold text-slate-900">
                    <Lightbulb className="w-4 h-4 text-slate-700" />
                    <span>{language === "en" ? "Explanation & Rationale:" : "คำอธิบายและเหตุผลทางวิชาการ:"}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {q.explanation}
                  </p>

                  {/* Answer Key Verification */}
                  <div className="text-xs text-slate-700 font-mono bg-white p-2.5 rounded-lg border border-slate-200">
                    <strong>{language === "en" ? "Answer Key:" : "ค่าเฉลยที่ระบุ (Answer Key):"}</strong> {correctAnswerText}
                  </div>

                  {/* Source Quote Accordion */}
                  {q.sourceQuote && (
                    <div className="pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => toggleQuote(idx)}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center space-x-1 cursor-pointer"
                      >
                        <Quote className="w-3 h-3 mr-0.5" />
                        <span>
                          {isExpanded
                            ? language === "en"
                              ? "Hide source quote"
                              : "ซ่อนข้อความอ้างอิงจากบทเรียน"
                            : language === "en"
                            ? "View source quote from notes"
                            : "ดูข้อความอ้างอิงจากบทเรียนต้นฉบับ (Source Quote)"}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 font-mono italic">
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
