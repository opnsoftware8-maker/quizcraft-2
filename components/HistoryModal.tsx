"use client";

import React from "react";
import {
  X,
  History,
  Trash2,
  Calendar,
  Award,
  Clock,
} from "lucide-react";
import { ExamHistoryRecord } from "@/types/exam";
import { useLanguage } from "@/lib/language-context";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ExamHistoryRecord[];
  onClearHistory: () => void;
}

export function HistoryModal({
  isOpen,
  onClose,
  records,
  onClearHistory,
}: HistoryModalProps) {
  const { language } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {language === "en" ? "Practice History & Assessments" : "ประวัติการสอบและผลประเมินย้อนหลัง"}
              </h3>
              <p className="text-xs text-slate-500">
                {language === "en"
                  ? "Stored locally in your browser. Private, instant, no account needed."
                  : "บันทึกไว้ใน LocalStorage บนเบราว์เซอร์ของคุณ ใช้งานได้ทันทีไม่ต้องเข้าสู่ระบบ"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {records.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs sm:text-sm space-y-2">
              <History className="w-8 h-8 mx-auto text-slate-300" />
              <p>
                {language === "en"
                  ? "No test records yet. Complete a quiz or written exam to see your track record here."
                  : "ยังไม่มีประวัติการสอบ ทำแบบทดสอบชุดแรกเพื่อเริ่มบันทึกผล"}
              </p>
            </div>
          ) : (
            records.map((rec) => {
              const isHigh = rec.percentage >= 80;
              const isMedium = rec.percentage >= 60 && rec.percentage < 80;

              return (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm font-semibold text-slate-900">
                          {rec.noteTitle}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 text-slate-800">
                          {rec.mode === "quiz"
                            ? language === "en"
                              ? "Mock Exam"
                              : "สนามสอบจำลอง"
                            : rec.mode === "subjective"
                            ? language === "en"
                              ? "Free Response"
                              : "ข้อสอบข้อเขียน"
                            : language === "en"
                            ? "Flashcards"
                            : "แฟลชการ์ด"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {rec.dateFormatted}
                        </span>
                        {rec.durationSeconds > 0 && (
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {Math.round(rec.durationSeconds / 60)} {language === "en" ? "mins" : "นาที"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score badge */}
                    <div className="text-right">
                      <div
                        className={`text-lg font-bold font-mono ${
                          isHigh
                            ? "text-emerald-600"
                            : isMedium
                            ? "text-amber-600"
                            : "text-rose-600"
                        }`}
                      >
                        {rec.percentage}%
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {rec.score}/{rec.total} {language === "en" ? "pts" : "คะแนน"}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs font-medium text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="flex items-center">
                      <Award className="w-3.5 h-3.5 mr-1 text-slate-600" />
                      {rec.readinessRating}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between">
          {records.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              {language === "en" ? "Clear All History" : "ล้างประวัติการสอบทั้งหมด"}
            </button>
          )}
          <div className="ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              {language === "en" ? "Close" : "ปิดหน้าต่าง"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
