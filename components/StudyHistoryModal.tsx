"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Check, BookOpen, ClipboardList, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import {
  StudyHistoryItem,
  StudyHistoryType,
} from "@/lib/firestore-study-history";

interface StudyHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StudyHistoryItem[];
  isLoading: boolean;
  alreadySelectedIds: string[];
  onConfirmSelection: (selectedItems: StudyHistoryItem[]) => void;
}

export function StudyHistoryModal({
  isOpen,
  onClose,
  items,
  isLoading,
  alreadySelectedIds,
  onConfirmSelection,
}: StudyHistoryModalProps) {
  const { language } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<"all" | StudyHistoryType>(
    "all"
  );
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCheckedIds([]);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const alreadySet = useMemo(
    () => new Set(alreadySelectedIds),
    [alreadySelectedIds]
  );

  const summaryCount = useMemo(
    () => items.filter((i) => i.type === "summary").length,
    [items]
  );
  const quizCount = useMemo(
    () => items.filter((i) => i.type === "quiz").length,
    [items]
  );

  const visibleItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((item) => item.type === activeFilter);
  }, [items, activeFilter]);

  if (!isOpen) return null;

  const toggleItem = (itemId: string) => {
    if (alreadySet.has(itemId)) return;
    setCheckedIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleCancel = () => {
    setCheckedIds([]);
    onClose();
  };

  const handleConfirm = () => {
    const picked = items.filter(
      (item) => checkedIds.includes(item.id) && !alreadySet.has(item.id)
    );
    setCheckedIds([]);
    onConfirmSelection(picked);
    onClose();
  };

  const formatDate = (ms: number) => {
    if (!ms) return "";
    try {
      return new Intl.DateTimeFormat(language === "en" ? "en-US" : "th-TH", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(ms));
    } catch {
      return "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1E1D]/30 backdrop-blur-[1px]"
      onClick={handleCancel}
    >
      <div
        className="bg-[#FAF9F5] rounded-2xl border border-[#E5E3DC] shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-history-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E3DC] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="study-history-modal-title"
              className="text-base font-semibold text-[#1F1E1D]"
            >
              {language === "en" ? "Study History" : "ประวัติการเรียนรู้"}
            </h3>
            <p className="text-xs text-[#6B6A65] mt-0.5">
              {language === "en"
                ? "Select saved summaries or quizzes to attach to this chat"
                : "เลือกติ๊กสรุปเนื้อหาหรือแบบทดสอบที่บันทึกไว้ เพื่อนำมาคุยในแชท"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-lg text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer shrink-0"
            aria-label={language === "en" ? "Close" : "ปิด"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two-Type Filter Bar */}
        <div className="px-5 pt-3 pb-2.5 border-b border-[#ECEAE3] flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeFilter === "all"
                ? "bg-[#1F1E1D] text-white"
                : "bg-white border border-[#DFDDD6] text-[#6B6A65] hover:text-[#1F1E1D]"
            }`}
          >
            {language === "en"
              ? `All (${items.length})`
              : `ทั้งหมด (${items.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("summary")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeFilter === "summary"
                ? "bg-[#1F1E1D] text-white"
                : "bg-white border border-[#DFDDD6] text-[#6B6A65] hover:text-[#1F1E1D]"
            }`}
          >
            {language === "en"
              ? `Summaries (${summaryCount})`
              : `สรุปเนื้อหา (${summaryCount})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("quiz")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeFilter === "quiz"
                ? "bg-[#1F1E1D] text-white"
                : "bg-white border border-[#DFDDD6] text-[#6B6A65] hover:text-[#1F1E1D]"
            }`}
          >
            {language === "en"
              ? `Quizzes (${quizCount})`
              : `แบบทดสอบ (${quizCount})`}
          </button>
        </div>

        {/* Scrollable Selectable Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="py-10 flex items-center justify-center text-[#6B6A65]">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="py-10 text-center space-y-1.5 px-4">
              <p className="text-sm font-medium text-[#1F1E1D]">
                {language === "en"
                  ? "No saved items in study history yet"
                  : "ยังไม่มีรายการในประวัติการเรียนรู้"}
              </p>
              <p className="text-xs text-[#6B6A65] leading-relaxed">
                {language === "en"
                  ? 'Summarize notes or generate a quiz in the "Learn" tab and click "Add to Study History".'
                  : 'ไปที่หน้า "เรียนรู้" เพื่อสรุปเนื้อหาหรือสร้างแบบทดสอบ แล้วกดปุ่ม "เพิ่มสู่ประวัติการเรียนรู้"'}
              </p>
            </div>
          ) : (
            visibleItems.map((item) => {
              const isAlreadyAttached = alreadySet.has(item.id);
              const isChecked =
                isAlreadyAttached || checkedIds.includes(item.id);
              const TypeIcon =
                item.type === "summary" ? BookOpen : ClipboardList;
              const typeLabel =
                item.type === "summary"
                  ? language === "en"
                    ? "Summary"
                    : "สรุปเนื้อหา"
                  : language === "en"
                    ? "Quiz"
                    : "แบบทดสอบ";

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isAlreadyAttached}
                  onClick={() => toggleItem(item.id)}
                  aria-pressed={isChecked}
                  className={`w-full text-left rounded-xl border p-3.5 flex items-start gap-3 transition-colors ${
                    isAlreadyAttached
                      ? "bg-[#EFECE4]/70 border-[#DFDDD6] opacity-55 cursor-not-allowed"
                      : isChecked
                        ? "bg-[#EFECE4] border-[#1F1E1D]/45 cursor-pointer"
                        : "bg-white border-[#E5E3DC] hover:bg-[#F5F3EC] cursor-pointer"
                  }`}
                >
                  {/* Monochrome Multi-select Checkbox */}
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isAlreadyAttached
                        ? "bg-[#9A9891] border-[#9A9891] text-white"
                        : isChecked
                          ? "bg-[#1F1E1D] border-[#1F1E1D] text-white"
                          : "bg-white border-[#C9C6BE] text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </span>

                  {/* Type Icon */}
                  <span className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#E5E3DC] text-[#1F1E1D] flex items-center justify-center shrink-0">
                    <TypeIcon className="w-4 h-4" />
                  </span>

                  {/* Title, Type Badge, Date */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#1F1E1D] truncate">
                        {item.title}
                      </span>
                      {isAlreadyAttached && (
                        <span className="text-[11px] font-medium text-[#6B6A65] shrink-0">
                          {language === "en" ? "Added" : "เลือกแล้ว"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] font-medium text-[#1F1E1D] bg-[#FAF9F5] border border-[#DFDDD6] px-2 py-0.5 rounded-md">
                        {typeLabel}
                      </span>
                      {item.subject && item.subject !== typeLabel && (
                        <span className="text-[11px] text-[#6B6A65] truncate max-w-[160px]">
                          {item.subject}
                        </span>
                      )}
                      {item.createdAtMs > 0 && (
                        <span className="text-[11px] text-[#8C8A84]">
                          {formatDate(item.createdAtMs)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer: Cancel & Confirm */}
        <div className="px-5 py-3.5 border-t border-[#E5E3DC] bg-[#F5F3EC] flex items-center justify-between gap-3">
          <span className="text-xs text-[#6B6A65]">
            {checkedIds.length > 0
              ? language === "en"
                ? `${checkedIds.length} selected`
                : `เลือก ${checkedIds.length} รายการ`
              : language === "en"
                ? "Multi-select available"
                : "สามารถติ๊กเลือกได้หลายรายการ"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="study-history-cancel-btn"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl border border-[#DFDDD6] bg-white hover:bg-[#EFECE4] text-xs font-medium text-[#1F1E1D] transition-colors cursor-pointer"
            >
              {language === "en" ? "Cancel" : "ยกเลิก"}
            </button>
            <button
              type="button"
              id="study-history-confirm-btn"
              onClick={handleConfirm}
              disabled={checkedIds.length === 0}
              className="px-4 py-2 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] disabled:bg-[#DFDDD6] disabled:text-[#8C8A84] text-white text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {language === "en" ? "Confirm" : "ตกลง"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
