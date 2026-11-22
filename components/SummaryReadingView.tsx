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
  ArrowRight,
} from "lucide-react";
import { StudySummaryData } from "@/types/exam";
import { useLanguage } from "@/lib/language-context";
import { SaveToHistoryButton } from "@/components/SaveToHistoryButton";

interface SummaryReadingViewProps {
  summary: StudySummaryData;
  onBack: () => void;
  onProceedToModes: () => void;
  onSaveToHistory?: () => Promise<void>;
  isSavedToHistory?: boolean;
}

export function SummaryReadingView({
  summary,
  onBack,
  onProceedToModes,
  onSaveToHistory,
  isSavedToHistory = false,
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
    <div className="space-y-5 max-w-4xl mx-auto pb-14">
      {/* Top Control Bar */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center text-xs font-medium text-[#1F1E1D] bg-[#FAF9F5] hover:bg-[#EFECE4] border border-[#E5E3DC] px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            <span>{language === "en" ? "Back to Notes" : "กลับไปหน้าเนื้อหา"}</span>
          </button>

          <span className="hidden sm:inline-flex items-center text-xs px-3 py-1.5 rounded-xl bg-[#FAF9F5] text-[#6B6A65] font-medium border border-[#E5E3DC]">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-[#6B6A65]" />
            {language === "en"
              ? `Est. ${summary.readingTimeMinutes || 3} mins`
              : `อ่านประมาณ ${summary.readingTimeMinutes || 3} นาที`}
          </span>
        </div>

        {/* Reading Tools & CTAs */}
        <div className="flex items-center flex-wrap gap-2">
          {onSaveToHistory && (
            <SaveToHistoryButton
              isSaved={isSavedToHistory}
              onSave={onSaveToHistory}
            />
          )}

          {/* Font Size Adjuster */}
          <div className="hidden sm:flex items-center bg-[#EFECE4] rounded-xl p-0.5 border border-[#E2DFD7] text-xs">
            <button
              type="button"
              onClick={() => setFontSize("sm")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                fontSize === "sm" ? "bg-white text-[#1F1E1D]" : "text-[#6B6A65] hover:text-[#1F1E1D]"
              }`}
              title={language === "en" ? "Small font" : "ขนาดตัวหนังสือปกติ"}
            >
              {language === "en" ? "A" : "ก"}
            </button>
            <button
              type="button"
              onClick={() => setFontSize("base")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                fontSize === "base" ? "bg-white text-[#1F1E1D]" : "text-[#6B6A65] hover:text-[#1F1E1D]"
              }`}
              title={language === "en" ? "Medium font" : "ขนาดตัวหนังสือปานกลาง"}
            >
              {language === "en" ? "A+" : "ก+"}
            </button>
            <button
              type="button"
              onClick={() => setFontSize("lg")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                fontSize === "lg" ? "bg-white text-[#1F1E1D]" : "text-[#6B6A65] hover:text-[#1F1E1D]"
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
            className="inline-flex items-center text-xs font-medium text-[#1F1E1D] bg-[#FAF9F5] hover:bg-[#EFECE4] border border-[#E5E3DC] px-3 py-2 rounded-xl transition-colors cursor-pointer"
            title={language === "en" ? "Copy entire summary as Markdown" : "คัดลอกสรุปทั้งหมดเป็น Markdown"}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-[#1F1E1D]" />
                <span>{language === "en" ? "Copied" : "คัดลอกแล้ว"}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5 text-[#6B6A65]" />
                <span>{language === "en" ? "Copy" : "คัดลอกสรุป"}</span>
              </>
            )}
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="hidden sm:inline-flex items-center text-xs font-medium text-[#1F1E1D] bg-[#FAF9F5] hover:bg-[#EFECE4] border border-[#E5E3DC] px-3 py-2 rounded-xl transition-colors cursor-pointer"
            title={language === "en" ? "Print or save PDF" : "พิมพ์หรือบันทึกเป็น PDF"}
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-[#6B6A65]" />
            <span>{language === "en" ? "Print / PDF" : "พิมพ์ / PDF"}</span>
          </button>

          {/* Direct Proceed Button */}
          <button
            type="button"
            onClick={onProceedToModes}
            className="inline-flex items-center text-xs font-medium bg-[#1F1E1D] hover:bg-[#33322F] text-white px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <span>{language === "en" ? "Practice Modes" : "ทำแบบทดสอบ"}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </button>
        </div>
      </div>

      {/* Document Main Card */}
      <article className="bg-white rounded-2xl border border-[#E5E3DC] p-5 sm:p-8 lg:p-10 space-y-8">
        {/* Document Header */}
        <div className="border-b border-[#ECEAE3] pb-6 space-y-2">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="text-xs font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-[#EFECE4] text-[#1F1E1D]">
              {summary.subject || (language === "en" ? "Study Notes" : "สรุปบทเรียน")}
            </span>
            <span className="text-xs text-[#6B6A65] flex items-center">
              <BookOpen className="w-3 h-3 mr-1 text-[#6B6A65]" />
              {language === "en" ? "Curated Key Academic Takeaways" : "สรุปสาระสำคัญของเนื้อหาบทเรียน"}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-[#1F1E1D] tracking-tight leading-tight">
            {summary.title}
          </h1>

          <p className="text-xs sm:text-sm text-[#6B6A65]">
            {language === "en"
              ? "Synthesized core concepts, mechanisms, and high-yield topics for high retention."
              : "คัดกรองเฉพาะแก่นสำคัญ กลไก และจุดที่มักออกสอบ เพื่อให้อ่านเข้าใจง่ายและจำได้แม่นยำ"}
          </p>
        </div>

        {/* Section 1: 1-Minute Elevator Pitch */}
        <section className="p-5 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] space-y-2">
          <div className="flex items-center space-x-2 text-[#1F1E1D] font-semibold text-xs uppercase tracking-wider">
            <Bookmark className="w-4 h-4 text-[#6B6A65]" />
            <span>{language === "en" ? "1-Minute Overview" : "ภาพรวม 1 นาที"}</span>
          </div>
          <p className={`${fontSizeClass} text-[#1F1E1D] leading-relaxed`}>
            {summary.oneMinuteElevatorPitch}
          </p>
        </section>

        {/* Section 2: Core Key Takeaways */}
        {summary.coreKeyTakeaways && summary.coreKeyTakeaways.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-[#1F1E1D] flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-[#1F1E1D]" />
              {language === "en" ? "Core Takeaways" : "แก่นสำคัญที่ต้องจำ"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {summary.coreKeyTakeaways.map((takeaway, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] flex items-start space-x-3"
                >
                  <span className="w-5 h-5 rounded-full bg-[#EFECE4] text-[#1F1E1D] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm text-[#1F1E1D] leading-relaxed">
                    {takeaway}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Deep Dive Structured Sections */}
        <section className="space-y-5 pt-2">
          <div className="border-b border-[#ECEAE3] pb-2 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-[#1F1E1D] flex items-center">
              <FileText className="w-4 h-4 mr-2 text-[#1F1E1D]" />
              {language === "en" ? "Structured Deep Dive" : "เจาะลึกเนื้อหาสำคัญ"}
            </h2>
            <span className="text-xs text-[#6B6A65]">
              {language === "en" ? `${summary.sections?.length || 0} core topics` : `${summary.sections?.length || 0} หัวข้อหลัก`}
            </span>
          </div>

          <div className="space-y-4">
            {summary.sections.map((sec, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl border border-[#E5E3DC] bg-white space-y-4"
              >
                <div className="border-b border-[#ECEAE3] pb-3">
                  <div className="text-xs font-medium uppercase tracking-wider text-[#6B6A65] mb-1">
                    {language === "en" ? `Part ${idx + 1}` : `ส่วนที่ ${idx + 1}`}
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#1F1E1D]">
                    {sec.heading}
                  </h3>
                  {sec.subheading && (
                    <p className="text-xs text-[#6B6A65] mt-0.5">
                      {sec.subheading}
                    </p>
                  )}
                </div>

                <p className={`${fontSizeClass} text-[#1F1E1D] leading-relaxed whitespace-pre-line`}>
                  {sec.deepDive}
                </p>

                {sec.keyPoints && sec.keyPoints.length > 0 && (
                  <div className="p-3.5 bg-[#FAF9F5] rounded-xl border border-[#E5E3DC] space-y-1.5">
                    <div className="text-xs font-semibold text-[#1F1E1D]">
                      {language === "en" ? "Key highlights:" : "ประเด็นสำคัญในหัวข้อนี้:"}
                    </div>
                    <ul className="space-y-1 text-xs sm:text-sm text-[#4A4945]">
                      {sec.keyPoints.map((kp, kIdx) => (
                        <li key={kIdx} className="flex items-start space-x-2">
                          <span className="text-[#1F1E1D] font-bold shrink-0">•</span>
                          <span>{kp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {sec.formulaOrRule && (
                  <div className="p-3 rounded-xl bg-[#EFECE4]/60 border border-[#E5E3DC] text-xs sm:text-sm text-[#1F1E1D] flex items-start space-x-2">
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
          <section className="space-y-4 pt-4 border-t border-[#ECEAE3]">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-[#1F1E1D] flex items-center">
                <Target className="w-4 h-4 mr-2 text-[#1F1E1D]" />
                {language === "en" ? "Exam Watchouts & Pitfalls" : "จุดเน้นข้อสอบ & ข้อควรระวัง"}
              </h2>
              <span className="text-xs text-[#1F1E1D] font-medium bg-[#EFECE4] px-2.5 py-0.5 rounded-lg">
                {language === "en" ? "High Yield" : "จุดดักคะแนน"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {summary.examFocusPoints.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-[#1F1E1D]">
                      {item.concept}
                    </span>
                    <span className="text-[10px] uppercase font-medium px-2 py-0.5 bg-[#EFECE4] text-[#1F1E1D] rounded-md shrink-0">
                      {language === "en" ? "Tested Often" : "มักออกสอบ"}
                    </span>
                  </div>

                  <div className="text-xs text-[#4A4945] leading-relaxed">
                    <strong className="text-[#1F1E1D]">{language === "en" ? "Why examiners love this:" : "เหตุผลที่ออกสอบ:"}</strong>{" "}
                    {item.whyItAppearsInExam}
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-[#DFDDD6] text-xs text-[#1F1E1D] flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-[#1F1E1D] shrink-0 mt-0.5" />
                    <div>
                      <strong>{language === "en" ? "Trap Warning:" : "จุดระวัง:"}</strong> {item.trapWarning}
                    </div>
                  </div>

                  {item.sourceExcerpt && (
                    <div className="text-xs text-[#6B6A65] italic bg-white p-2 rounded-lg border border-[#ECEAE3]">
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
          <section className="space-y-4 pt-4 border-t border-[#ECEAE3]">
            <h2 className="text-base sm:text-lg font-semibold text-[#1F1E1D] flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-[#1F1E1D]" />
              {language === "en" ? "Terminology & Definitions" : "ตารางสรุปคำศัพท์และนิยามสำคัญ"}
            </h2>

            <div className="overflow-x-auto rounded-xl border border-[#E5E3DC]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F5] border-b border-[#E5E3DC] text-xs font-semibold text-[#6B6A65] uppercase tracking-wider">
                    <th className="p-3 w-1/4">{language === "en" ? "Term" : "คำศัพท์"}</th>
                    <th className="p-3 w-1/2">{language === "en" ? "Definition" : "นิยามความหมาย"}</th>
                    <th className="p-3 w-1/4">{language === "en" ? "Context / Example" : "บริบท / ตัวอย่าง"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEAE3] text-xs sm:text-sm">
                  {summary.keyTermsTable.map((termItem, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF9F5] transition-colors">
                      <td className="p-3 font-semibold text-[#1F1E1D]">
                        {termItem.term}
                      </td>
                      <td className="p-3 text-[#4A4945] leading-relaxed">
                        {termItem.definition}
                      </td>
                      <td className="p-3 text-[#6B6A65] text-xs leading-relaxed">
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
          <section className="space-y-4 pt-4 border-t border-[#ECEAE3]">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-[#1F1E1D] flex items-center">
                <HelpCircle className="w-4 h-4 mr-2 text-[#1F1E1D]" />
                {language === "en" ? "Quick Self-Check" : "เช็คความเข้าใจสั้นๆ"}
              </h2>
              <span className="text-xs text-[#6B6A65]">
                {language === "en" ? "Click to toggle answers" : "แตะเพื่อเปิดเฉลย"}
              </span>
            </div>

            <div className="space-y-3">
              {summary.selfCheckQuestions.map((q, idx) => {
                const isRevealed = !!revealedAnswers[idx];
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-[#E5E3DC] bg-[#FAF9F5] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs sm:text-sm font-medium text-[#1F1E1D]">
                        {idx + 1}. {q.question}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRevealAnswer(idx)}
                        className="inline-flex items-center text-xs font-medium text-[#1F1E1D] bg-white hover:bg-[#EFECE4] border border-[#DFDDD6] px-2.5 py-1 rounded-lg shrink-0 cursor-pointer"
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
                      <div className="p-3 bg-white rounded-lg border border-[#E5E3DC] text-xs sm:text-sm text-[#1F1E1D] mt-2 leading-relaxed">
                        <strong>{language === "en" ? "Answer:" : "เฉลย:"}</strong> {q.quickAnswer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 7: Final Bottom Transition CTA Card */}
        <section className="pt-6 border-t border-[#ECEAE3]">
          <div className="rounded-2xl p-6 sm:p-8 bg-[#1F1E1D] text-white space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white">
              <Sparkles className="w-5 h-5" />
            </div>

            <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">
              {language === "en"
                ? "Notes Reviewed! Ready to Test Your Knowledge?"
                : "ทบทวนสรุปเนื้อหาจบแล้ว พร้อมทดสอบความเข้าใจ!"}
            </h3>

            <p className="text-xs sm:text-sm text-[#D6D4CC] max-w-xl mx-auto leading-relaxed">
              {language === "en"
                ? "Put your understanding to the test with multiple choice, flashcards, or free response."
                : "ประเมินความพร้อมของคุณผ่านแบบทดสอบ 3 รูปแบบจากเนื้อหาที่สรุปไว้"}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="summary-proceed-to-modes-btn"
                type="button"
                onClick={onProceedToModes}
                className="w-full sm:w-auto px-7 py-3 bg-white hover:bg-[#FAF9F5] text-[#1F1E1D] font-medium rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{language === "en" ? "Start Practice Modes" : "เริ่มทำแบบทดสอบ"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer"
              >
                {language === "en" ? "Edit / Paste More Notes" : "แก้ไขหรือเพิ่มเนื้อหาบทเรียน"}
              </button>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
