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
import { SaveToHistoryButton } from "@/components/SaveToHistoryButton";

interface MockExamViewProps {
  examTitle: string;
  subject: string;
  questions: ExamQuestion[];
  initialMinutes: number;
  onSubmitExam: (userAnswers: Record<number, number>, timeSpentSeconds: number) => void;
  onExit: () => void;
  onSaveToHistory?: () => Promise<void>;
  isSavedToHistory?: boolean;
}

export function MockExamView({
  examTitle,
  subject,
  questions,
  initialMinutes,
  onSubmitExam,
  onExit,
  onSaveToHistory,
  isSavedToHistory = false,
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
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Top Exam Header & Timer Bar */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#6B6A65]">
            <span className="font-semibold text-[#1F1E1D] uppercase tracking-wider">
              {subject}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {language === "en"
                ? `Question ${currentIndex + 1} of ${questions.length}`
                : `ข้อที่ ${currentIndex + 1} จาก ${questions.length} ข้อ`}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-[#1F1E1D] mt-1 line-clamp-1">
            {examTitle}
          </h2>
        </div>

        {/* Save to History, Timer & Controls */}
        <div className="flex items-center flex-wrap gap-2 self-end sm:self-auto">
          {onSaveToHistory && (
            <SaveToHistoryButton
              isSaved={isSavedToHistory}
              onSave={onSaveToHistory}
            />
          )}

          <div
            className={`inline-flex items-center px-3.5 py-2 rounded-xl border text-sm font-mono font-semibold transition-all ${
              isTimeUrgent
                ? "bg-[#EFECE4] border-[#1F1E1D] text-[#1F1E1D] animate-pulse"
                : "bg-[#FAF9F5] border-[#E5E3DC] text-[#1F1E1D]"
            }`}
          >
            <Clock className="w-4 h-4 mr-2 text-[#1F1E1D]" />
            <span>
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-xl border border-[#E5E3DC] text-[#1F1E1D] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
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
            {isPaused ? <Play className="w-4 h-4 text-[#1F1E1D]" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isPaused && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#EFECE4] border border-[#DFDDD6] text-[#1F1E1D] text-sm flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-[#1F1E1D] shrink-0" />
            <span>
              {language === "en"
                ? "Exam is paused. Questions are hidden to ensure test integrity."
                : "เวลาสอบถูกหยุดชั่วคราว ข้อสอบถูกซ่อนไว้"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsPaused(false)}
            className="px-4 py-1.5 bg-[#1F1E1D] text-white rounded-xl font-medium hover:bg-[#33322F] text-xs sm:text-sm cursor-pointer shrink-0"
          >
            {language === "en" ? "Resume Exam" : "ทำข้อสอบต่อ"}
          </button>
        </div>
      )}

      {!isPaused && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main Question Card */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E5E3DC] p-5 sm:p-7 min-h-[420px] flex flex-col justify-between">
              {/* Question Text */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#1F1E1D] text-white text-xs font-semibold flex items-center justify-center">
                      {currentIndex + 1}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6B6A65]">
                      {currentQ.difficulty === "analysis"
                        ? language === "en"
                          ? "Application & Analysis"
                          : "ข้อสอบวิเคราะห์"
                        : language === "en"
                        ? "Recall & Concept"
                        : "ข้อสอบพื้นฐาน"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFlag(currentIndex)}
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      flagged[currentIndex]
                        ? "bg-[#EFECE4] text-[#1F1E1D] font-medium border border-[#DFDDD6]"
                        : "text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#FAF9F5] border border-transparent"
                    }`}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 mr-1.5 ${
                        flagged[currentIndex] ? "fill-[#1F1E1D] text-[#1F1E1D]" : ""
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

                <h3 className="text-base sm:text-lg font-semibold text-[#1F1E1D] leading-relaxed pt-1 break-words">
                  {currentQ.question}
                </h3>
              </div>

              {/* 4 Choices */}
              <div className="space-y-2.5 my-6">
                {[0, 1, 2, 3].map((optIdx) => {
                  const choiceText = currentQ.options[optIdx] || "";
                  const isSelected = userAnswers[currentIndex] === optIdx;

                  return (
                    <button
                      key={optIdx}
                      id={`choice-${currentIndex}-${optIdx}`}
                      type="button"
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full max-w-full min-w-0 p-3.5 sm:p-4 rounded-xl border text-left flex items-start gap-3 transition-colors cursor-pointer select-none ${
                        isSelected
                          ? "border-[#1F1E1D] bg-[#EFECE4]/70 text-[#1F1E1D] font-medium"
                          : "border-[#E5E3DC] bg-[#FAF9F5]/60 hover:bg-[#FAF9F5] hover:border-[#C9C6BE] text-[#1F1E1D]"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? "bg-[#1F1E1D] text-white"
                            : "bg-white text-[#6B6A65] border border-[#DFDDD6]"
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
              <div className="border-t border-[#ECEAE3] pt-4 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                    className="px-4 py-2 rounded-xl border border-[#DFDDD6] bg-white text-xs sm:text-sm font-medium text-[#1F1E1D] hover:bg-[#FAF9F5] disabled:opacity-30 disabled:pointer-events-none inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#6B6A65]" />
                    <span>{language === "en" ? "Previous" : "ข้อก่อนหน้า"}</span>
                  </button>

                  {currentIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                      className="px-5 py-2 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] text-white text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>{language === "en" ? "Next" : "ข้อถัดไป"}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirmSubmit(true)}
                      className="px-5 py-2 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] text-white text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{language === "en" ? "Submit Exam" : "ส่งข้อสอบ"}</span>
                    </button>
                  )}
                </div>

                <div className="text-xs text-[#6B6A65] bg-[#FAF9F5] border border-[#E5E3DC] px-3.5 py-2 rounded-xl text-center self-center sm:self-auto">
                  {language === "en" ? (
                    <>
                      Answered <strong className="text-[#1F1E1D]">{answeredCount}</strong> of{" "}
                      <strong className="text-[#1F1E1D]">{questions.length}</strong>
                    </>
                  ) : (
                    <>
                      ตอบแล้ว <strong className="text-[#1F1E1D]">{answeredCount}</strong> จาก{" "}
                      <strong className="text-[#1F1E1D]">{questions.length}</strong> ข้อ
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Question Grid Sidebar */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">
            <div className="bg-white rounded-2xl border border-[#E5E3DC] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1F1E1D] uppercase tracking-wider">
                  {language === "en" ? "Question Grid" : "แผนผังข้อสอบ"}
                </span>
                <span className="text-xs font-mono font-semibold text-[#6B6A65]">
                  {Math.round((answeredCount / questions.length) * 100)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#EFECE4] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#1F1E1D] h-full transition-all duration-300"
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
                      className={`h-9 rounded-lg text-xs font-semibold transition-all relative flex items-center justify-center cursor-pointer ${
                        isCurrent
                          ? "ring-2 ring-[#1F1E1D] border-[#1F1E1D] bg-white text-[#1F1E1D]"
                          : isAnswered
                          ? "bg-[#EFECE4] border border-[#D4D1C8] text-[#1F1E1D]"
                          : "bg-[#FAF9F5] border border-[#E5E3DC] text-[#9A9891] hover:bg-[#EFECE4]/60 hover:text-[#1F1E1D]"
                      }`}
                    >
                      <span>{idx + 1}</span>
                      {isFlag && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#1F1E1D] ring-2 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-3 border-t border-[#ECEAE3] space-y-1.5 text-xs text-[#6B6A65]">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded bg-[#EFECE4] border border-[#D4D1C8]" />
                  <span>
                    {language === "en" ? `Answered (${answeredCount})` : `ตอบแล้ว (${answeredCount})`}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded bg-[#FAF9F5] border border-[#E5E3DC]" />
                  <span>
                    {language === "en"
                      ? `Unanswered (${questions.length - answeredCount})`
                      : `ยังไม่ตอบ (${questions.length - answeredCount})`}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1F1E1D]" />
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
                className="w-full py-3 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] text-white text-xs sm:text-sm font-medium transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{language === "en" ? "Submit Exam" : "ส่งข้อสอบเพื่อตรวจผล"}</span>
              </button>

              <button
                type="button"
                onClick={onExit}
                className="w-full text-center text-xs text-[#6B6A65] hover:text-[#1F1E1D] font-medium py-1 transition-colors cursor-pointer"
              >
                {language === "en" ? "Cancel Exam" : "ยกเลิกการสอบนี้"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-[#1F1E1D]/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FAF9F5] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E5E3DC] space-y-4">
            <h4 className="text-lg font-semibold text-[#1F1E1D]">
              {language === "en" ? "Confirm Submission?" : "ยืนยันการส่งข้อสอบ?"}
            </h4>
            <div className="text-xs sm:text-sm text-[#4A4945] space-y-2 leading-relaxed">
              <p>
                {language === "en" ? (
                  <>
                    You have answered <strong className="text-[#1F1E1D]">{answeredCount}</strong> out of{" "}
                    <strong className="text-[#1F1E1D]">{questions.length}</strong> questions.
                  </>
                ) : (
                  <>
                    คุณตอบข้อสอบไปแล้ว <strong className="text-[#1F1E1D]">{answeredCount}</strong> จากทั้งหมด{" "}
                    <strong className="text-[#1F1E1D]">{questions.length}</strong> ข้อ
                  </>
                )}
              </p>
              {!isAllAnswered && (
                <div className="p-3 bg-[#EFECE4] border border-[#DFDDD6] rounded-xl text-[#1F1E1D] flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-[#1F1E1D] mt-0.5 shrink-0" />
                  <span>
                    {language === "en"
                      ? `There are still ${questions.length - answeredCount} unanswered questions. Unanswered questions will receive 0 points.`
                      : `ยังมีข้อสอบที่ยังไม่ได้ตอบอีก ${questions.length - answeredCount} ข้อ หากส่งตอนนี้ ข้อที่ยังไม่ตอบจะได้ 0 คะแนน`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 rounded-xl border border-[#DFDDD6] bg-white text-xs font-medium text-[#1F1E1D] hover:bg-[#FAF9F5] cursor-pointer"
              >
                {language === "en" ? "Return to Exam" : "กลับไปทำต่อ"}
              </button>
              <button
                type="button"
                onClick={handleForceSubmit}
                className="px-4 py-2 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] text-white text-xs font-medium cursor-pointer"
              >
                {language === "en" ? "Confirm & Submit" : "ยืนยันส่งข้อสอบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
