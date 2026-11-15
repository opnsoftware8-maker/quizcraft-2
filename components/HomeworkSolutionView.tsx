"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  Printer,
  BookOpen,
  ArrowRight,
  BrainCircuit,
  AlertTriangle,
  Bookmark,
  FileText,
  Calculator,
  Lightbulb,
  ListOrdered,
  Eye,
  Sliders,
} from "lucide-react";
import { StructuredHomeworkSolution, HomeworkProblemItem, HomeworkStep } from "@/types/exam";
import { useLanguage } from "@/lib/language-context";

interface HomeworkSolutionViewProps {
  solution: StructuredHomeworkSolution;
  onConvertToSummary: (text: string) => void;
  onConvertToQuiz: (text: string) => void;
  onClear?: () => void;
}

export function HomeworkSolutionView({
  solution,
  onConvertToSummary,
  onConvertToQuiz,
  onClear,
}: HomeworkSolutionViewProps) {
  const { language } = useLanguage();
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedStepKey, setCopiedStepKey] = useState<string | null>(null);
  const [copiedAnswerIdx, setCopiedAnswerIdx] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [viewMode, setViewMode] = useState<"structured" | "raw">("structured");

  const fontSizeClass =
    fontSize === "sm"
      ? "text-xs sm:text-sm leading-relaxed"
      : fontSize === "lg"
      ? "text-base sm:text-lg leading-loose"
      : "text-sm sm:text-base leading-relaxed";

  const handleCopyAll = () => {
    const textToCopy = solution.rawMarkdownExport || JSON.stringify(solution, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleCopyStep = (key: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedStepKey(key);
    setTimeout(() => setCopiedStepKey(null), 2000);
  };

  const handleCopyFinalAnswer = (idx: number, answer: string) => {
    navigator.clipboard.writeText(answer);
    setCopiedAnswerIdx(idx);
    setTimeout(() => setCopiedAnswerIdx(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 lg:space-y-8 pt-2 animate-fadeIn">
      {/* Top Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {solution.subject && (
            <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              {solution.subject}
            </span>
          )}
          {solution.difficultyLevel && (
            <span className="text-xs font-medium px-3 py-1 rounded-xl bg-slate-50 text-slate-600 border border-slate-200">
              {solution.difficultyLevel}
            </span>
          )}
          <span className="text-xs font-medium text-slate-500 flex items-center pl-1">
            <ListOrdered className="w-3.5 h-3.5 mr-1.5 text-slate-700" />
            {language === "en"
              ? `Solutions (${solution.solutions?.length || 1} items)`
              : `เฉลยวิธีทำ ${solution.solutions?.length || 1} ข้อ`}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("structured")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === "structured"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {language === "en" ? "Structured" : "จัดหัวข้อ"}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("raw")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === "raw"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Markdown
            </button>
          </div>

          {/* Font Size Adjuster */}
          <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setFontSize("sm")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                fontSize === "sm" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title={language === "en" ? "Standard font" : "ขนาดตัวหนังสือปกติ"}
            >
              {language === "en" ? "A" : "ก"}
            </button>
            <button
              type="button"
              onClick={() => setFontSize("base")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                fontSize === "base" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title={language === "en" ? "Medium font" : "ขนาดตัวหนังสือปานกลาง"}
            >
              {language === "en" ? "A+" : "ก+"}
            </button>
            <button
              type="button"
              onClick={() => setFontSize("lg")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                fontSize === "lg" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title={language === "en" ? "Large font" : "ขนาดตัวหนังสือใหญ่สบายตา"}
            >
              {language === "en" ? "A++" : "ก++"}
            </button>
          </div>

          {/* Copy All */}
          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            title={language === "en" ? "Copy entire solution" : "คัดลอกเฉลยทั้งหมด"}
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                <span className="text-emerald-600">{language === "en" ? "Copied" : "คัดลอกแล้ว"}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                <span>{language === "en" ? "Copy All" : "คัดลอกทั้งหมด"}</span>
              </>
            )}
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="hidden sm:inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            title={language === "en" ? "Print or save PDF" : "พิมพ์หรือบันทึกเป็น PDF"}
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            <span>{language === "en" ? "Print / PDF" : "พิมพ์ / PDF"}</span>
          </button>
        </div>
      </div>

      {viewMode === "raw" ? (
        /* Markdown / Raw View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 lg:p-10">
          <pre className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
            {solution.rawMarkdownExport}
          </pre>
        </div>
      ) : (
        /* Structured Academic View */
        <article className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 lg:p-10 space-y-8">
          {/* Header */}
          <div className="border-b border-slate-100 pb-5 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                {language === "en"
                  ? "Structured Problem Solution & Step-by-Step Analysis"
                  : "เฉลยวิธีทำและวิเคราะห์โจทย์ปัญหาอย่างเป็นระบบ (Step-by-Step Problem Solution)"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {solution.title || (language === "en" ? "Problem Solution & Analysis" : "เฉลยวิธีทำและวิเคราะห์โจทย์ปัญหา")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {language === "en"
                ? "Organized conceptual sections showing step-by-step reasoning, formulas, and verified answers for clear academic comprehension."
                : "จัดระเบียบข้อมูลเป็นหัวข้อชัดเจน แสดงวิธีทำทีละขั้นตอน พร้อมสูตร หลักการ และคำตอบที่ถูกต้อง เพื่อการศึกษาและทำความเข้าใจได้อย่างเป็นระบบ"}
            </p>
          </div>

          {/* Section: Overview & Approach */}
          {solution.overview && (
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 text-slate-800 font-semibold text-xs uppercase tracking-wider">
                <Bookmark className="w-4 h-4 text-slate-600" />
                <span>{language === "en" ? "Overview & Strategy" : "ภาพรวม & กลยุทธ์การแก้โจทย์ (Overview & Strategy)"}</span>
              </div>
              <p className={`${fontSizeClass} text-slate-700 font-medium leading-relaxed`}>
                {solution.overview}
              </p>
            </div>
          )}

          {/* Solutions List */}
          <div className="space-y-8">
            {solution.solutions?.map((prob, pIdx) => (
              <div
                key={pIdx}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs space-y-5 p-6 sm:p-8 hover:border-slate-300 transition-all"
              >
                {/* Problem Header */}
                <div className="border-b border-slate-100 pb-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-xl bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-200">
                      <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                      {prob.problemNumber || (language === "en" ? `Problem ${pIdx + 1}` : `ข้อที่ ${pIdx + 1}`)}
                    </span>
                    {prob.toFind && (
                      <span className="text-xs font-medium px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                        {language === "en" ? `To Find: ${prob.toFind}` : `สิ่งที่ต้องหา: ${prob.toFind}`}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                    {prob.problemStatement}
                  </h3>

                  {/* Given Info (Knowns) */}
                  {prob.givenInfo && prob.givenInfo.length > 0 && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mt-2">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center">
                        <span>{language === "en" ? "Given Information:" : "สิ่งที่โจทย์กำหนดให้ (Given Info):"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {prob.givenInfo.map((info, gIdx) => (
                          <span
                            key={gIdx}
                            className="inline-flex items-center text-xs font-medium px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2"></span>
                            {info}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Formula or Rule Box */}
                {prob.mainFormulaOrConcept && (
                  <div className="p-3.5 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] flex items-start space-x-3">
                    <Calculator className="w-4 h-4 text-[#7C3AED] mt-0.5 shrink-0" />
                    <div className="space-y-0.5 text-xs sm:text-sm">
                      <span className="font-bold text-[#6D28D9]">
                        {language === "en" ? "Main Formula / Principle:" : "สูตรหลัก / กฎที่นำมาใช้:"}
                      </span>
                      <p className="font-medium text-[#4C1D95] font-mono">
                        {prob.mainFormulaOrConcept}
                      </p>
                    </div>
                  </div>
                )}

                {/* Step-by-Step Working Section */}
                <div className="space-y-3.5">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                    <ListOrdered className="w-4 h-4 text-[#2563EB]" />
                    <span>
                      {language === "en"
                        ? "Step-by-Step Solution Working:"
                        : "วิธีทำทีละขั้นตอน (Step-by-Step Solution) — ลอกตามได้เข้าใจง่าย:"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {prob.steps?.map((st, sIdx) => {
                      const stepKey = `p${pIdx}-s${sIdx}`;
                      const isCopied = copiedStepKey === stepKey;
                      const stepCopyText = `${st.title}\n${st.explanation}${st.calculation ? `\n${st.calculation}` : ""}`;

                      return (
                        <div
                          key={sIdx}
                          className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#BFDBFE] transition-all space-y-2 group relative"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                              <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {st.stepNumber || sIdx + 1}
                              </span>
                              <h4 className="text-xs sm:text-sm font-bold text-[#0F172A]">
                                {st.title || (language === "en" ? `Step ${st.stepNumber || sIdx + 1}` : `สเต็ปที่ ${st.stepNumber || sIdx + 1}`)}
                              </h4>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyStep(stepKey, stepCopyText)}
                              className="text-[11px] font-semibold text-[#64748B] hover:text-[#2563EB] flex items-center space-x-1 px-2 py-0.5 rounded-md hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                              title={language === "en" ? "Copy this step" : "คัดลอกเฉพาะสเต็ปนี้"}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-[#16A34A]" />
                                  <span className="text-[#16A34A]">{language === "en" ? "Copied" : "คัดลอกแล้ว"}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>{language === "en" ? "Copy step" : "คัดลอกสเต็ป"}</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Explanation */}
                          <p className={`${fontSizeClass} text-[#334155] leading-relaxed pl-8.5`}>
                            {st.explanation}
                          </p>

                          {/* Calculation block if present */}
                          {st.calculation && (
                            <div className="ml-8.5 mt-2 p-3 bg-white rounded-lg border border-[#CBD5E1] font-mono text-xs sm:text-sm text-[#0F172A] overflow-x-auto shadow-2xs">
                              <pre className="whitespace-pre-wrap leading-relaxed">{st.calculation}</pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* HIGHLIGHTED FINAL ANSWER BOX */}
                <div className="p-4 sm:p-5 rounded-xl bg-[#ECFDF5] border-2 border-[#10B981] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#065F46]">
                        {language === "en" ? "Final Answer" : "คำตอบสุดท้าย (Final Answer)"}
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-[#064E3B]">
                        {prob.finalAnswer}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyFinalAnswer(pIdx, prob.finalAnswer)}
                    className="inline-flex items-center text-xs font-bold text-[#065F46] bg-white hover:bg-[#D1FAE5] border border-[#6EE7B7] px-3 py-1.5 rounded-lg transition-colors cursor-pointer self-start sm:self-center shrink-0"
                  >
                    {copiedAnswerIdx === pIdx ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-[#10B981]" />
                        <span>{language === "en" ? "Copied" : "คัดลอกแล้ว"}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1 text-[#059669]" />
                        <span>{language === "en" ? "Copy Answer" : "คัดลอกคำตอบ"}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Tips, Traps or Verification */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {prob.tipsOrTraps && (
                    <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start space-x-2.5">
                      <AlertTriangle className="w-4 h-4 text-[#D97706] mt-0.5 shrink-0" />
                      <div className="space-y-0.5 text-xs">
                        <span className="font-bold text-[#B45309]">
                          {language === "en" ? "Watchouts & Traps:" : "ข้อควรระวัง / เทคนิคเพิ่มเติม:"}
                        </span>
                        <p className="text-[#92400E] leading-relaxed font-medium">
                          {prob.tipsOrTraps}
                        </p>
                      </div>
                    </div>
                  )}

                  {prob.verification && (
                    <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start space-x-2.5">
                      <Lightbulb className="w-4 h-4 text-[#2563EB] mt-0.5 shrink-0" />
                      <div className="space-y-0.5 text-xs">
                        <span className="font-bold text-[#1E293B]">
                          {language === "en" ? "Verification:" : "การตรวจทานคำตอบ:"}
                        </span>
                        <p className="text-[#475569] leading-relaxed font-medium">
                          {prob.verification}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Overall Key Takeaways */}
          {solution.overallKeyTakeaway && (
            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-slate-600" />
                <span>{language === "en" ? "Key Takeaways:" : "สรุปแก่นความรู้สำคัญ (Key Takeaways):"}</span>
              </div>
              <p className={`${fontSizeClass} text-slate-700 leading-relaxed`}>
                {solution.overallKeyTakeaway}
              </p>
            </div>
          )}

          {/* Next Steps: Continuous Learning Flow */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="text-xs font-semibold text-slate-900 flex items-center space-x-1.5">
              <BrainCircuit className="w-4 h-4 text-slate-600" />
              <span>{language === "en" ? "Next Learning Steps:" : "ไปต่อยอดความรู้ทันที (Next Learning Steps):"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => onConvertToSummary(solution.rawMarkdownExport || "")}
                className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80 transition-all text-left cursor-pointer group flex flex-col justify-between shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-slate-800 flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-slate-600" />
                    <span>{language === "en" ? "Convert into Study Guide" : "สรุปเป็นเนื้อหาบทเรียนต่อ"}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {language === "en"
                    ? "Turn this solution into an executive study summary with key takeaway flashpoints."
                    : "นำคำตอบและวิธีทำนี้ไปจัดระเบียบเป็นชีทสรุปบทเรียนและจุดสำคัญที่ต้องจำ"}
                </p>
              </button>

              <button
                type="button"
                onClick={() => onConvertToQuiz(solution.rawMarkdownExport || "")}
                className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all text-left cursor-pointer group flex flex-col justify-between shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white flex items-center space-x-2">
                    <BrainCircuit className="w-4 h-4 text-white" />
                    <span>{language === "en" ? "Generate Practice Exam" : "แปลงเป็นแบบทดสอบข้อสอบทันที"}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-xs text-white/80 mt-2">
                  {language === "en"
                    ? "Build 4-choice questions or flashcards from this solution to test active recall."
                    : "สร้างชุดข้อสอบ 4 ตัวเลือก หรือแฟลชการ์ดจำแม่นจากข้อนี้ เพื่อทดสอบความจำ"}
                </p>
              </button>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
