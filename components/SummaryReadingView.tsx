"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  Copy,
  Check,
  Printer,
  ChevronDown,
  ChevronUp,
  FileText,
  Target,
  HelpCircle,
  Eye,
  Sliders,
  ArrowRight,
} from "lucide-react";
import { StudySummaryData } from "@/types/exam";
import { useLanguage } from "@/lib/language-context";

interface SummaryReadingViewProps {
  summary: StudySummaryData;
  onBack: () => void;
  onProceedToModes: () => void;
}

export function SummaryReadingView({
  summary,
  onBack,
  onProceedToModes,
}: SummaryReadingViewProps) {
  const { language } = useLanguage();
  const [copied, setCopied] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  const toggleRevealAnswer = (idx: number) => {
    setRevealedAnswers((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleCopy = () => {
    let textToCopy = summary.rawMarkdownExport;
    if (!textToCopy) {
      // Fallback markdown synthesis
      textToCopy = `# ${summary.title}\n\n` +
        `**${language === "en" ? "Subject" : "สาขาวิชา"}:** ${summary.subject} | **${language === "en" ? "Est. Reading Time" : "เวลาอ่านโดยประมาณ"}:** ${summary.readingTimeMinutes} ${language === "en" ? "mins" : "นาที"}\n\n` +
        `## ${language === "en" ? "1-Minute Overview" : "ภาพรวม 1 นาที"}\n${summary.oneMinuteElevatorPitch}\n\n` +
        `## ${language === "en" ? "Core Takeaways" : "แก่นสำคัญที่ต้องรู้"}\n` +
        summary.coreKeyTakeaways.map((t) => `- ${t}`).join("\n") +
        `\n\n## ${language === "en" ? "Deep Dive" : "หัวข้อเจาะลึก"}\n` +
        summary.sections
          .map(
            (s) =>
              `### ${s.heading}\n${s.deepDive}\n` +
              s.keyPoints.map((kp) => `* ${kp}`).join("\n")
          )
          .join("\n\n") +
        `\n\n## ${language === "en" ? "Exam Focus & Watchouts" : "จุดเน้นข้อสอบ & ข้อควรระวัง"}\n` +
        summary.examFocusPoints
          .map(
            (e) =>
              `- **${e.concept}**: ${e.whyItAppearsInExam}\n  *${language === "en" ? "Caution" : "ระวัง"}:* ${e.trapWarning}`
          )
          .join("\n\n");
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const fontSizeClass =
    fontSize === "sm"
      ? "text-xs sm:text-sm leading-relaxed"
      : fontSize === "lg"
      ? "text-base sm:text-lg leading-loose"
      : "text-sm sm:text-base leading-relaxed";

  return (
    <div className="space-y-6 lg:space-y-8 max-w-5xl lg:max-w-6xl mx-auto pb-16">
      {/* Top Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            <span>{language === "en" ? "Back to Notes" : "กลับไปหน้าเนื้อหา"}</span>
          </button>

          <span className="hidden sm:inline-flex items-center text-xs px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 font-medium border border-slate-200">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            {language === "en"
              ? `Estimated reading time: ${summary.readingTimeMinutes || 3} mins`
              : `เวลาอ่านโดยประมาณ ${summary.readingTimeMinutes || 3} นาที`}
          </span>
        </div>

        {/* Reading Tools & CTAs */}
        <div className="flex items-center space-x-2">
          {/* Font Size Adjuster */}
          <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setFontSize("sm")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                fontSize === "sm" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title={language === "en" ? "Small font" : "ขนาดตัวหนังสือปกติ"}
            >
              {language === "en" ? "A" : "ก"}
            </button>
            <button
              type="button"
              onClick={() => setFontSize("base")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                fontSize === "base" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title={language === "en" ? "Medium font" : "ขนาดตัวหนังสือปานกลาง"}
            >
              {language === "en" ? "A+" : "ก+"}
            </button>
            <button
              type="button"
              onClick={() => setFontSize("lg")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                fontSize === "lg" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title={language === "en" ? "Large font" : "ขนาดตัวหนังสือใหญ่สบายตา"}
            >
              {language === "en" ? "A++" : "ก++"}
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            title={language === "en" ? "Copy entire summary as Markdown" : "คัดลอกสรุปทั้งหมดเป็น Markdown"}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                <span className="text-emerald-600">{language === "en" ? "Copied" : "คัดลอกแล้ว"}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                <span>{language === "en" ? "Copy Summary" : "คัดลอกสรุป"}</span>
              </>
            )}
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="hidden sm:inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            title={language === "en" ? "Print or save PDF" : "พิมพ์หรือบันทึกเป็น PDF"}
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            <span>{language === "en" ? "Print / PDF" : "พิมพ์ / PDF"}</span>
          </button>

          {/* Direct Proceed Button in Header */}
          <button
            type="button"
            onClick={onProceedToModes}
            className="inline-flex items-center text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <span>{language === "en" ? "Start Practice Modes" : "เริ่มทำข้อสอบ"}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </button>
        </div>
      </div>

      {/* Document Main Card */}
      <article className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-10 lg:p-12 space-y-8 lg:space-y-10">
        {/* Document Header */}
        <div className="border-b border-slate-100 pb-6 space-y-2">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
              {summary.subject || (language === "en" ? "Study Notes" : "สรุปบทเรียน")}
            </span>
            <span className="text-xs font-medium text-slate-500 flex items-center">
              <BookOpen className="w-3 h-3 mr-1 text-slate-700" />
              {language === "en" ? "Curated Key Academic Takeaways" : "สรุปสาระสำคัญของเนื้อหาบทเรียน"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
            {summary.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500">
            {language === "en"
              ? "Synthesized core concepts, mechanisms, and high-yield topics without fluff for high retention."
              : "คัดกรองเฉพาะแก่นสำคัญ กลไก และจุดที่มักออกสอบ โดยปราศจากข้อความฟุ่มเฟือย เพื่อให้อ่านเข้าใจง่ายและจำได้แม่นยำที่สุด"}
          </p>
        </div>

        {/* Section 1: 1-Minute Elevator Pitch */}
        <section className="p-5 sm:p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center space-x-2 text-slate-800 font-semibold text-xs uppercase tracking-wider">
            <Bookmark className="w-4 h-4 text-slate-600" />
            <span>{language === "en" ? "1-Minute Overview (Executive Summary)" : "ภาพรวม 1 นาที (Executive Summary)"}</span>
          </div>
          <p className={`${fontSizeClass} text-slate-700 font-medium leading-relaxed`}>
            {summary.oneMinuteElevatorPitch}
          </p>
        </section>

        {/* Section 2: Core Key Takeaways */}
        {summary.coreKeyTakeaways && summary.coreKeyTakeaways.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
              {language === "en" ? "Core Takeaways & Must-Know Concepts" : "แก่นสำคัญที่ต้องจำให้ได้ (Core Takeaways)"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {summary.coreKeyTakeaways.map((takeaway, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                    {takeaway}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Deep Dive Structured Sections */}
        <section className="space-y-6 pt-2">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-slate-700" />
              {language === "en" ? "Structured Deep Dive & Explanations" : "เจาะลึกเนื้อหาและกลไกสำคัญ (Structured Deep Dive)"}
            </h2>
            <span className="text-xs text-slate-500">
              {language === "en" ? `${summary.sections?.length || 0} core topics` : `${summary.sections?.length || 0} หัวข้อหลัก`}
            </span>
          </div>

          <div className="space-y-6">
            {summary.sections.map((sec, idx) => (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-4"
              >
                <div className="border-b border-slate-100 pb-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    {language === "en" ? `Part ${idx + 1}` : `ส่วนที่ ${idx + 1}`}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {sec.heading}
                  </h3>
                  {sec.subheading && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {sec.subheading}
                    </p>
                  )}
                </div>

                {/* Deep Dive Explanation */}
                <p className={`${fontSizeClass} text-slate-700 leading-relaxed whitespace-pre-line`}>
                  {sec.deepDive}
                </p>

                {/* Core Key Points List */}
                {sec.keyPoints && sec.keyPoints.length > 0 && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="text-xs font-semibold text-slate-900">
                      {language === "en" ? "Key highlights in this section:" : "ประเด็นสำคัญในหัวข้อนี้:"}
                    </div>
                    <ul className="space-y-1 text-xs sm:text-sm text-slate-600">
                      {sec.keyPoints.map((kp, kIdx) => (
                        <li key={kIdx} className="flex items-start space-x-2">
                          <span className="text-slate-800 font-bold shrink-0">•</span>
                          <span>{kp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Formula or Core Rule Callout */}
                {sec.formulaOrRule && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 flex items-start space-x-2">
                    <span className="font-semibold shrink-0">
                      {language === "en" ? "Key formula/rule:" : "สูตร/กฎสำคัญ:"}
                    </span>
                    <span className="font-mono text-xs">{sec.formulaOrRule}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: High-Yield Exam Focus & Traps */}
        {summary.examFocusPoints && summary.examFocusPoints.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center">
                <Target className="w-4 h-4 mr-2 text-rose-600" />
                {language === "en" ? "Exam Watchouts & Common Pitfalls" : "จุดที่ข้อสอบมักเน้น & หลุมพรางที่ต้องระวัง (Exam Watchouts)"}
              </h2>
              <span className="text-xs text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                {language === "en" ? "High Yield" : "จุดดักคะแนน"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.examFocusPoints.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900">
                      {item.concept}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                      {language === "en" ? "Tested Often" : "มักออกสอบ"}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">{language === "en" ? "Why examiners love this:" : "ทำไมถึงชอบออก:"}</strong>{" "}
                    {item.whyItAppearsInExam}
                  </div>

                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>{language === "en" ? "Trap Warning:" : "จุดหลุมพราง:"}</strong> {item.trapWarning}
                    </div>
                  </div>

                  {item.sourceExcerpt && (
                    <div className="text-xs text-slate-500 italic bg-white p-2 rounded-lg border border-slate-200">
                      &ldquo;{item.sourceExcerpt}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 5: Key Terms Cheat Sheet */}
        {summary.keyTermsTable && summary.keyTermsTable.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-slate-700" />
              {language === "en" ? "Terminology & Definitions Cheat Sheet" : "ตารางสรุปคำศัพท์และนิยามสำคัญ (Terminology Cheat Sheet)"}
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="p-3 w-1/4">{language === "en" ? "Term" : "คำศัพท์ (Term)"}</th>
                    <th className="p-3 w-1/2">{language === "en" ? "Definition" : "นิยามความหมาย (Definition)"}</th>
                    <th className="p-3 w-1/4">{language === "en" ? "Context / Example" : "บริบท / ตัวอย่างเชื่อมโยง"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {summary.keyTermsTable.map((termItem, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">
                        {termItem.term}
                      </td>
                      <td className="p-3 text-slate-700 leading-relaxed">
                        {termItem.definition}
                      </td>
                      <td className="p-3 text-slate-500 text-xs leading-relaxed">
                        {termItem.contextOrExample}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Section 6: Quick Self-Check Questions */}
        {summary.selfCheckQuestions && summary.selfCheckQuestions.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center">
                <HelpCircle className="w-4 h-4 mr-2 text-slate-700" />
                {language === "en" ? "Quick Self-Check Before Testing" : "เช็คความเข้าใจสั้นๆ ก่อนเริ่มสอบ (Quick Self-Check)"}
              </h2>
              <span className="text-xs text-slate-500">
                {language === "en" ? "Click to toggle answers" : "แตะเพื่อเปิดเฉลย"}
              </span>
            </div>

            <div className="space-y-3">
              {summary.selfCheckQuestions.map((q, idx) => {
                const isRevealed = !!revealedAnswers[idx];
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs sm:text-sm font-semibold text-slate-900">
                        {idx + 1}. {q.question}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRevealAnswer(idx)}
                        className="inline-flex items-center text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 cursor-pointer shadow-2xs"
                      >
                        {isRevealed ? (
                          <>
                            <ChevronUp className="w-3 h-3 mr-1" />
                            {language === "en" ? "Hide Answer" : "ซ่อนเฉลย"}
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            {language === "en" ? "Reveal Answer" : "ดูเฉลย"}
                          </>
                        )}
                      </button>
                    </div>

                    {isRevealed && (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-800 mt-2 leading-relaxed">
                        <strong className="text-slate-900">{language === "en" ? "Answer:" : "เฉลยคำตอบ:"}</strong> {q.quickAnswer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 7: Final Bottom Transition CTA Card */}
        <section className="pt-6 border-t border-slate-100">
          <div className="rounded-2xl p-6 sm:p-8 bg-slate-900 text-white space-y-4 text-center shadow-xs">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 text-white mb-1">
              <Sparkles className="w-6 h-6 text-slate-300" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              {language === "en"
                ? "Notes Reviewed! Ready to Test Your Knowledge?"
                : "ทบทวนสรุปเนื้อหาจบแล้ว พร้อมทดสอบความเข้าใจ!"}
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              {language === "en"
                ? "You have reviewed all essential takeaways and traps. Put your understanding to the test with multiple choice, flashcards, or free response."
                : "คุณได้อ่านประเด็นสำคัญและจุดดักข้อสอบครบถ้วนแล้ว ตอนนี้ถึงเวลาประเมินความพร้อมจริงผ่านห้องสอบจำลอง 3 โหมด"}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="summary-proceed-to-modes-btn"
                type="button"
                onClick={onProceedToModes}
                className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl text-sm transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{language === "en" ? "Enter Practice Modes" : "เริ่มทำข้อสอบทดสอบ"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer"
              >
                {language === "en" ? "Edit / Upload More Notes" : "แก้ไขหรือเพิ่มเนื้อหาบทเรียน"}
              </button>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
