"use client";

import React, { useState } from "react";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Quote,
  AlertTriangle,
  Layers,
  Sparkles,
  Award,
  Check,
  AlertCircle,
  Download,
} from "lucide-react";
import { Flashcard } from "@/types/exam";
import { useLanguage } from "@/lib/language-context";

interface FlashcardsViewProps {
  topic: string;
  cards: Flashcard[];
  onExit: () => void;
  hasCustomKey?: boolean;
  onOpenApiKeyModal?: () => void;
}

export function FlashcardsView({
  topic,
  cards,
  onExit,
  hasCustomKey = false,
  onOpenApiKeyModal = () => {},
}: FlashcardsViewProps) {
  const { language } = useLanguage();
  const [cardList, setCardList] = useState<Flashcard[]>(cards);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [mastery, setMastery] = useState<Record<string, boolean>>({});
  const [exportedMsg, setExportedMsg] = useState<string | null>(null);

  const currentCard = cardList[currentIndex];
  const total = cardList.length;

  const masteredCount = Object.values(mastery).filter(Boolean).length;
  const masteryPercentage = total > 0 ? Math.round((masteredCount / total) * 100) : 0;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const markMastery = (isMastered: boolean) => {
    if (!currentCard) return;
    setMastery((prev) => ({
      ...prev,
      [currentCard.id]: isMastered,
    }));
    handleNext();
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...cardList].sort(() => Math.random() - 0.5);
    setCardList(shuffled);
    setCurrentIndex(0);
  };

  const handleExportAnki = () => {
    // Format for Anki TSV import: Front \t Back \t Tags
    const ankiRows = cardList.map((card) => {
      const front = card.term.replace(/\t/g, " ").replace(/\n/g, "<br>");
      const back =
        `<div><strong>${language === "en" ? "Definition" : "นิยาม"}:</strong> ${card.definition.replace(/\n/g, "<br>")}</div>` +
        `<div style="margin-top:6px; color:#b45309;"><strong>${language === "en" ? "Exam Watchout" : "ข้อควรระวังในข้อสอบ"}:</strong> ${card.examWatchout.replace(/\n/g, "<br>")}</div>` +
        (card.sourceQuote
          ? `<div style="margin-top:6px; font-style:italic; font-size:11px; color:#64748b;">"${card.sourceQuote.replace(/\n/g, "<br>")}"</div>`
          : "");
      return `${front}\t${back}\tQuizCraft_${topic.replace(/\s+/g, "_")}`;
    });

    const fileContent = `#separator:tab\n#html:true\n#tags column:3\n` + ankiRows.join("\n");
    const blob = new Blob([fileContent], { type: "text/tab-separated-values;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Anki_${topic.replace(/[^a-zA-Z0-9_\u0E00-\u0E7F]/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportedMsg(
      language === "en"
        ? "Anki deck exported successfully!"
        : "ส่งออกไฟล์ Anki สำเร็จแล้ว!"
    );
    setTimeout(() => setExportedMsg(null), 3000);
  };

  // Keyboard shortcuts for Desktop & Tablet
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev + 1) % (cardList.length || 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev - 1 + (cardList.length || 1)) % (cardList.length || 1));
      } else if (e.key === "1") {
        e.preventDefault();
        if (currentCard) {
          setMastery((prev) => ({ ...prev, [currentCard.id]: false }));
          setIsFlipped(false);
          setCurrentIndex((prev) => (prev + 1) % (cardList.length || 1));
        }
      } else if (e.key === "2") {
        e.preventDefault();
        if (currentCard) {
          setMastery((prev) => ({ ...prev, [currentCard.id]: true }));
          setIsFlipped(false);
          setCurrentIndex((prev) => (prev + 1) % (cardList.length || 1));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, cardList, currentCard]);

  if (!currentCard) return null;

  const isCurrentMastered = mastery[currentCard.id] === true;
  const isCurrentReview = mastery[currentCard.id] === false;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {topic}
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            {language === "en" ? "Concept Flashcards & Exam Traps" : "แฟลชการ์ดสกัดคีย์เวิร์ดและจุดลวงข้อสอบ"}
          </h2>
        </div>
        <div className="flex items-center space-x-2.5">
          {/* Anki Export Button */}
          <button
            onClick={handleExportAnki}
            type="button"
            className="text-xs font-medium text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title={language === "en" ? "Export to Anki (.txt)" : "ส่งออกเป็นการ์ด Anki (.txt)"}
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === "en" ? "Export Anki" : "ส่งออก Anki"}</span>
          </button>

          <button
            onClick={onExit}
            type="button"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            {language === "en" ? "Back to Hub" : "กลับหน้าหลัก"}
          </button>
        </div>
      </div>

      {exportedMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl text-center font-medium animate-in fade-in">
          ✓ {exportedMsg} ({language === "en" ? "Ready for Anki Import" : "สามารถ Import เข้า Anki ได้ทันที"})
        </div>
      )}

      {/* Progress and Mastery Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="font-semibold text-slate-800">
            {language === "en" ? `Card ${currentIndex + 1} of ${total}` : `การ์ดที่ ${currentIndex + 1} จาก ${total} ใบ`}
          </span>
          <span className="text-slate-900 font-mono font-bold">
            {language === "en"
              ? `Mastered: ${masteredCount}/${total} (${masteryPercentage}%)`
              : `แม่นยำแล้ว ${masteredCount}/${total} (${masteryPercentage}%)`}
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-slate-900 h-full transition-all duration-300"
            style={{ width: `${masteryPercentage}%` }}
          />
        </div>
      </div>

      {/* Interactive 3D Flip Card Container */}
      <div
        className="perspective-1000 min-h-[400px] sm:min-h-[460px] cursor-pointer select-none"
        onClick={handleFlip}
      >
        <div
          className={`w-full h-full min-h-[400px] sm:min-h-[460px] rounded-2xl border transition-all duration-300 shadow-xs p-8 sm:p-12 flex flex-col justify-between relative ${
            isFlipped
              ? "bg-slate-50/80 border-slate-400 ring-1 ring-slate-400"
              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
          }`}
        >
          {/* Card Top Information */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
              {isFlipped
                ? language === "en"
                  ? "Explanation & Exam Traps (Back)"
                  : "คำอธิบาย & ข้อควรระวัง (ด้านหลัง)"
                : language === "en"
                ? "Key Term & Concept (Front)"
                : "คีย์เวิร์ดสำคัญ (ด้านหน้า)"}
            </span>
            <div className="flex items-center space-x-2">
              {isCurrentMastered && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center">
                  <Check className="w-3.5 h-3.5 mr-1 inline shrink-0" />
                  {language === "en" ? "Mastered" : "แม่นยำแล้ว"}
                </span>
              )}
              {isCurrentReview && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 inline shrink-0" />
                  {language === "en" ? "Needs Review" : "ต้องทบทวนซ้ำ"}
                </span>
              )}
            </div>
          </div>

          {/* Card Center Content */}
          <div className="my-auto py-8 text-center space-y-4 max-w-2xl mx-auto w-full">
            {!isFlipped ? (
              <div className="space-y-3">
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                  {currentCard.term}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === "en"
                    ? "(Press Spacebar or click card to flip for definition and exam traps)"
                    : "(กด Spacebar หรือคลิกการ์ดเพื่อพลิกดูคำนิยามและจุดลวงข้อสอบ)"}
                </p>
              </div>
            ) : (
              <div className="space-y-5 text-left">
                <div className="text-base sm:text-lg text-slate-900 font-normal leading-relaxed">
                  {currentCard.definition}
                </div>

                {/* Exam Watchout */}
                <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-xs sm:text-sm text-amber-900 space-y-1">
                  <div className="font-semibold flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600 shrink-0" />
                    <span>{language === "en" ? "Exam Watchout & Pitfall:" : "ข้อควรระวังในห้องสอบ:"}</span>
                  </div>
                  <p className="leading-relaxed pl-5 text-amber-800">
                    {currentCard.examWatchout}
                  </p>
                </div>

                {/* Source Quote */}
                {currentCard.sourceQuote && (
                  <div className="text-xs text-slate-500 italic flex items-start space-x-1.5 pt-1">
                    <Quote className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">&ldquo;{currentCard.sourceQuote}&rdquo;</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Flip Hint */}
          <div className="text-center text-xs text-slate-400 border-t border-slate-100 pt-4 flex items-center justify-between">
            <span className="hidden sm:inline">
              {language === "en" ? "Press ← / → arrows to navigate" : "กดลูกศร ← / → เพื่อเลื่อนการ์ด"}
            </span>
            <span className="mx-auto sm:mx-0">
              {isFlipped
                ? language === "en"
                  ? "Click or press Spacebar to flip back"
                  : "คลิกหรือกด Spacebar เพื่อพลิกกลับ"
                : language === "en"
                ? "Click or press Spacebar to reveal answer"
                : "คลิกหรือกด Spacebar เพื่อดูเฉลย"}
            </span>
            <span className="hidden sm:inline">
              {language === "en" ? "Keys: 1 (Review) / 2 (Mastered)" : "กด 1 (ทวนซ้ำ) / 2 (จำได้แล้ว)"}
            </span>
          </div>
        </div>
      </div>

      {/* Mastery & Navigation Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Prev / Next */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handlePrev}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
            <span>{language === "en" ? "Previous Card" : "การ์ดก่อนหน้า"}</span>
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
          >
            <span>{language === "en" ? "Next" : "ถัดไป"}</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={handleShuffle}
            title={language === "en" ? "Shuffle cards" : "สลับลำดับการ์ด"}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 cursor-pointer shadow-2xs transition-colors"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>

        {/* Learning Assessment Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => markMastery(false)}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs"
          >
            <XCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{language === "en" ? "Needs Review (1)" : "ยังจำไม่ได้ (1)"}</span>
          </button>
          <button
            type="button"
            onClick={() => markMastery(true)}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{language === "en" ? "Mastered (2)" : "จำได้แม่นยำแล้ว (2)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
