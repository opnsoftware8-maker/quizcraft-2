"use client";

import React, { useState } from "react";
import { BookmarkPlus, Check, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface SaveToHistoryButtonProps {
  isSaved: boolean;
  onSave: () => Promise<void>;
}

export function SaveToHistoryButton({
  isSaved,
  onSave,
}: SaveToHistoryButtonProps) {
  const { language } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);

  const handleClick = async () => {
    if (isSaved || isSaving) return;
    setIsSaving(true);
    try {
      await onSave();
    } catch (err) {
      console.error("Failed to save to study history:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSaved || isSaving}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-colors ${
        isSaved
          ? "bg-[#EFECE4] border-[#DFDDD6] text-[#1F1E1D] cursor-default"
          : "bg-[#FAF9F5] hover:bg-[#EFECE4] border-[#E5E3DC] text-[#1F1E1D] cursor-pointer"
      }`}
    >
      {isSaving ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1F1E1D]" />
      ) : isSaved ? (
        <Check className="w-3.5 h-3.5 text-[#1F1E1D]" />
      ) : (
        <BookmarkPlus className="w-3.5 h-3.5 text-[#6B6A65]" />
      )}
      <span>
        {isSaving
          ? language === "en"
            ? "Saving..."
            : "กำลังบันทึก..."
          : isSaved
            ? language === "en"
              ? "Saved to History"
              : "เพิ่มในประวัติแล้ว"
            : language === "en"
              ? "Add to Study History"
              : "เพิ่มสู่ประวัติการเรียนรู้"}
      </span>
    </button>
  );
}
