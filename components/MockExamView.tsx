"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  Send,
  HelpCircle,
  Pause,
  Play,
  Layers,
} from "lucide-react";
import { ExamQuestion } from "@/types/exam";
import { useLanguage } from "@/lib/language-context";

interface MockExamViewProps {
  examTitle: string;
  subject: string;
  questions: ExamQuestion[];
  initialMinutes: number;
  onSubmitExam: (userAnswers: Record<number, number>, timeSpentSeconds: number) => void;
  onExit: () => void;
}

export function MockExamView({
  examTitle,
  subject,
  questions,
  initialMinutes,
  onSubmitExam,
  onExit,
}: MockExamViewProps) {
  const { language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number>(initialMinutes * 60);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);

  const totalTimeSeconds = initialMinutes * 60;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const userAnswersRef = useRef(userAnswers);
  const timeLeftRef = useRef(timeLeft);

  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const handleForceSubmit = React.useCallback(() => {
    const timeSpent = totalTimeSeconds - timeLeftRef.current;
    onSubmitExam(userAnswersRef.current, Math.max(timeSpent, 1));
  }, [onSubmitExam, totalTimeSeconds]);

  // Timer Countdown Effect
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleForceSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, handleForceSubmit]);


  const handleSelectOption = (optionIndex: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex,
    }));
  };

  const toggleFlag = (qIndex: number) => {
    setFlagged((prev) => ({
      ...prev,
      [qIndex]: !prev[qIndex],
    }));
  };

  const currentQ = questions[currentIndex];
  if (!currentQ) return null;

  const answeredCount = Object.keys(userAnswers).length;
  const isAllAnswered = answeredCount === questions.length;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isTimeUrgent = timeLeft < 120 && timeLeft > 0; // Less than 2 min

  const choiceLabels = ["ก.", "ข.", "ค.", "ง."];
  const choiceLetters = ["A", "B", "C", "D"];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Exam Header & Timer Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-800 uppercase tracking-wider">
              {subject}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {language === "en"
                ? `Question ${currentIndex + 1} of ${questions.length}`
                : `โจทย์ข้อ ${currentIndex + 1} จาก ${questions.length} ข้อ`}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 line-clamp-1">
            {examTitle}
          </h2>
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center space-x-3 self-end sm:self-auto">
          <div
            className={`inline-flex items-center px-4 py-2 rounded-xl border text-base font-mono font-bold transition-all ${
              isTimeUrgent
                ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
                : "bg-slate-50 border-slate-200 text-slate-900"
            }`}
          >
            <Clock className={`w-4 h-4 mr-2 ${isTimeUrgent ? "text-rose-600" : "text-slate-700"}`} />
            <span>
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title={
              isPaused
                ? language === "en"
                  ? "Resume exam"
                  : "ทำข้อสอบต่อ"
                : language === "en"
                ? "Pause exam"
                : "พักชั่วคราว"
            }
          >
            {isPaused ? <Play className="w-4 h-4 text-blue-600" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isPaused && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              {language === "en"
                ? "Exam is paused. Questions are hidden to ensure test integrity."
                : "เวลาสอบถูกหยุดชั่วคราว ข้อสอบถูกซ่อนเพื่อความโปร่งใส"}
            </span>
          </div>
          <button
            onClick={() => setIsPaused(false)}
            className="px-4 py-1.5 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 text-xs sm:text-sm cursor-pointer"
          >
            {language === "en" ? "Resume Exam" : "ทำข้อสอบต่อ"}
          </button>
        </div>
      )}

      {!isPaused && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Main Question Card (Left 8 cols on desktop) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 lg:p-10 shadow-xs min-h-[460px] flex flex-col justify-between">
              {/* Question Text */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-8 h-8 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                      {currentIndex + 1}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {currentQ.difficulty === "analysis"
                        ? language === "en"
                          ? "Application & Analysis"
                          : "ข้อสอบวิเคราะห์ (Application)"
                        : language === "en"
                        ? "Recall & Concept"
                        : "ข้อสอบความจำ/พื้นฐาน (Recall)"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFlag(currentIndex)}
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      flagged[currentIndex]
                        ? "bg-amber-100 text-amber-900 font-semibold border border-amber-300"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 mr-1.5 ${
                        flagged[currentIndex] ? "fill-amber-500 text-amber-500" : ""
                      }`}
                    />
                    <span>
                      {flagged[currentIndex]
                        ? language === "en"
                          ? "Marked"
                          : "ปักหมุดแล้ว"
                        : language === "en"
                        ? "Mark for review"
                        : "ปักหมุดทวน"}
                    </span>
                  </button>
                </div>

                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 leading-relaxed pt-2 break-words">
                  {currentQ.question}
                </h3>
              </div>

              {/* 4 Choices */}
              <div className="space-y-3 my-6">
                {[0, 1, 2, 3].map((optIdx) => {
                  const choiceText = currentQ.options[optIdx] || "";
                  const isSelected = userAnswers[currentIndex] === optIdx;

                  return (
                    <button
                      key={optIdx}
                      id={`choice-${currentIndex}-${optIdx}`}
                      type="button"
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full max-w-full min-w-0 p-4 sm:p-5 rounded-xl border text-left flex items-start gap-3.5 sm:gap-4 transition-all cursor-pointer select-none active:scale-[0.99] ${
                        isSelected
                          ? "border-slate-900 bg-slate-50 text-slate-900 font-medium shadow-xs ring-1 ring-slate-900"
                          : "border-slate-200 bg-white hover:bg-slate-50/60 hover:border-slate-300 text-slate-800"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {choiceLetters[optIdx]}
                      </span>
                      <div className="flex-1 min-w-0 break-words leading-relaxed text-sm sm:text-base pt-0.5">
                        {choiceText}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Card Navigation */}
              <div className="border-t border-slate-100 pt-5 mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                    <span>{language === "en" ? "Previous" : "ข้อก่อนหน้า"}</span>
                  </button>

                  {currentIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <span>{language === "en" ? "Next" : "ข้อถัดไป"}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirmSubmit(true)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 mr-0.5" />
                      <span>{language === "en" ? "Submit Exam" : "ส่งข้อสอบ"}</span>
                    </button>
                  )}
                </div>

                <div className="text-xs sm:text-sm text-slate-500 bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl text-center self-center sm:self-auto">
                  {language === "en" ? (
                    <>
                      Answered <strong className="text-slate-900 font-bold">{answeredCount}</strong> of{" "}
                      <strong className="text-slate-900 font-bold">{questions.length}</strong> questions
                    </>
                  ) : (
                    <>
                      ตอบแล้ว <strong className="text-slate-900 font-bold">{answeredCount}</strong> จาก{" "}
                      <strong className="text-slate-900 font-bold">{questions.length}</strong> ข้อ
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Question Grid Sidebar (Right 4 cols on desktop, sticky) */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {language === "en" ? "Question Grid" : "แผนผังข้อสอบ (Question Grid)"}
                </span>
                <span className="text-xs font-mono font-semibold text-slate-600">
                  {Math.round((answeredCount / questions.length) * 100)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-slate-900 h-full transition-all duration-300"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                />
              </div>

              {/* Grid of question buttons */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, idx) => {
                  const isAnswered = userAnswers[idx] !== undefined;
                  const isCurrent = idx === currentIndex;
                  const isFlag = flagged[idx];

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-10 rounded-lg text-xs font-semibold transition-all relative flex items-center justify-center cursor-pointer ${
                        isCurrent
                          ? "ring-2 ring-slate-900 border-slate-900 bg-white text-slate-900 font-bold"
                          : isAnswered
                          ? "bg-slate-100 border border-slate-300 text-slate-900"
                          : "bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      }`}
                    >
                      <span>{idx + 1}</span>
                      {isFlag && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
                  <span>
                    {language === "en" ? `Answered (${answeredCount})` : `ตอบแล้ว (${answeredCount})`}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded bg-slate-50 border border-slate-200" />
                  <span>
                    {language === "en"
                      ? `Unanswered (${questions.length - answeredCount})`
                      : `ยังไม่ตอบ (${questions.length - answeredCount})`}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>
                    {language === "en"
                      ? `Marked for review (${Object.values(flagged).filter(Boolean).length})`
                      : `ปักหมุดทวน (${Object.values(flagged).filter(Boolean).length})`}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="exam-submit-confirm-btn"
                type="button"
                onClick={() => setShowConfirmSubmit(true)}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center space-x-2 shadow-xs cursor-pointer active:scale-[0.99]"
              >
                <Send className="w-4 h-4 text-slate-300" />
                <span>{language === "en" ? "Submit Exam" : "ส่งข้อสอบเพื่อตรวจผล"}</span>
              </button>

              <button
                type="button"
                onClick={onExit}
                className="w-full text-center text-xs text-slate-500 hover:text-rose-600 font-medium py-1 transition-colors cursor-pointer"
              >
                {language === "en" ? "Cancel Exam" : "ยกเลิกการสอบนี้"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h4 className="text-lg font-bold text-slate-900">
              {language === "en" ? "Confirm Submission?" : "ยืนยันการส่งข้อสอบ?"}
            </h4>
            <div className="text-xs sm:text-sm text-slate-600 space-y-2 leading-relaxed">
              <p>
                {language === "en" ? (
                  <>
                    You have answered <strong>{answeredCount}</strong> out of{" "}
                    <strong>{questions.length}</strong> questions.
                  </>
                ) : (
                  <>
                    คุณตอบข้อสอบไปแล้ว <strong>{answeredCount}</strong> จากทั้งหมด{" "}
                    <strong>{questions.length}</strong> ข้อ
                  </>
                )}
              </p>
              {!isAllAnswered && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <span>
                    {language === "en"
                      ? `There are still ${questions.length - answeredCount} unanswered questions. Unanswered questions will receive 0 points.`
                      : `ยังมีข้อสอบที่ยังไม่ได้ตอบอีก ${questions.length - answeredCount} ข้อ หากส่งตอนนี้ ข้อที่ยังไม่ตอบจะได้ 0 คะแนน`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {language === "en" ? "Return to Exam" : "กลับไปทำต่อ"}
              </button>
              <button
                type="button"
                onClick={handleForceSubmit}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                {language === "en" ? "Confirm & Submit" : "ยืนยันส่งข้อสอบทันที"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
