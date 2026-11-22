"use client";

import React, { useRef, useState, useEffect } from "react";
import { Upload, BookOpen, ArrowRight, X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "@/lib/language-context";

interface InputSectionProps {
  notesText: string;
  setNotesText: (val: string) => void;
  onContinue: () => void;
  onSummarize: (customPrompt?: string) => void;
  isLoading: boolean;
  isSummarizing?: boolean;
}

export function InputSection({
  notesText,
  setNotesText,
  onContinue,
  onSummarize,
  isLoading,
  isSummarizing = false,
}: InputSectionProps) {
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryPrompt, setSummaryPrompt] = useState("");

  useEffect(() => {
    if (!isSummaryModalOpen) return;
    const focusTimer = setTimeout(() => {
      promptInputRef.current?.focus();
    }, 50);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSummaryModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSummaryModalOpen]);

  const handleConfirmSummarize = () => {
    const trimmedPrompt = summaryPrompt.trim();
    setIsSummaryModalOpen(false);
    onSummarize(trimmedPrompt);
  };

  const charCount = notesText.length;
  const wordCount = notesText.trim() ? notesText.trim().split(/\s+/).length : 0;
  const isValid = charCount >= 20;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setNotesText(content);
        setUploadStatus(
          language === "en"
            ? `Loaded "${file.name}" (${content.length} chars)`
            : `อัปโหลดไฟล์ "${file.name}" สำเร็จ (${content.length} ตัวอักษร)`
        );
        setTimeout(() => setUploadStatus(null), 4000);
      }
    };
    reader.onerror = () => {
      setUploadStatus(
        language === "en"
          ? "Failed to read file. Please use a .txt or .md file."
          : "ไม่สามารถอ่านไฟล์ได้ กรุณาใช้ไฟล์ .txt หรือ .md"
      );
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Minimal Header */}
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-semibold text-[#1F1E1D] tracking-tight">
          {language === "en" ? "Study Content" : "วางเนื้อหาบทเรียน"}
        </h2>
        <p className="text-xs sm:text-sm text-[#6B6A65]">
          {language === "en"
            ? "Paste your notes or upload a text file to summarize or generate a quiz."
            : "วางเนื้อหาหรืออัปโหลดไฟล์ข้อความ เพื่อเลือกสรุปเนื้อหาหรือสร้างแบบทดสอบ"}
        </p>
      </div>

      {/* Main Content Box */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 text-xs text-[#6B6A65]">
          <span>
            {wordCount.toLocaleString()} {language === "en" ? "words" : "คำ"} ·{" "}
            {charCount.toLocaleString()} {language === "en" ? "chars" : "ตัวอักษร"}
          </span>

          {notesText && (
            <button
              type="button"
              onClick={() => setNotesText("")}
              className="inline-flex items-center gap-1 text-[#6B6A65] hover:text-[#1F1E1D] transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === "en" ? "Clear" : "ล้างเนื้อหา"}</span>
            </button>
          )}
        </div>

        <textarea
          id="notes-textarea"
          rows={10}
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          placeholder={
            language === "en"
              ? "Paste study notes, lecture summaries, or lesson text here (minimum 20 characters)..."
              : "วางเนื้อหาบทเรียน เลกเชอร์ หรือสรุปที่ต้องการเรียนรู้ที่นี่ (อย่างน้อย 20 ตัวอักษร)..."
          }
          className="w-full p-3.5 sm:p-4 text-[16px] text-[#1F1E1D] bg-[#FAF9F5] focus:bg-white rounded-xl border border-[#E5E3DC] focus:border-[#1F1E1D] outline-hidden transition-colors resize-y leading-relaxed min-h-[220px] sm:min-h-[260px] placeholder:text-[#8C8A84]"
        />

        {/* Compact File Upload Strip */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-xl border border-dashed px-4 py-3 text-center cursor-pointer transition-colors ${
            dragActive
              ? "border-[#1F1E1D] bg-[#EFECE4]"
              : "border-[#DFDDD6] hover:border-[#B8B5AD] bg-[#FAF9F5]/60"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.text"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-[#6B6A65]">
            <Upload className="w-4 h-4 text-[#1F1E1D] shrink-0" />
            <span>
              {language === "en" ? "Drop file or " : "ลากวางไฟล์หรือ "}
              <span className="text-[#1F1E1D] font-medium underline underline-offset-2">
                {language === "en" ? "choose .txt / .md" : "เลือกไฟล์ (.txt, .md)"}
              </span>
            </span>
          </div>
        </div>

        {uploadStatus && (
          <p className="text-xs text-[#1F1E1D] bg-[#EFECE4] border border-[#E5E3DC] rounded-xl px-3.5 py-2">
            {uploadStatus}
          </p>
        )}

        {!isValid && notesText.length > 0 && (
          <p className="text-xs text-[#6B6A65] bg-[#FAF9F5] border border-[#E5E3DC] rounded-xl px-3.5 py-2">
            {language === "en"
              ? "Please enter at least 20 characters to continue."
              : "กรุณาวางเนื้อหาอย่างน้อย 20 ตัวอักษรเพื่อดำเนินการต่อ"}
          </p>
        )}

        {/* Two Clean Option Buttons: Summarize Content | Create Quiz */}
        <div className="pt-2 border-t border-[#ECEAE3] grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            id="input-summarize-btn"
            type="button"
            disabled={!isValid || isLoading || isSummarizing}
            onClick={() => setIsSummaryModalOpen(true)}
            className={`w-full px-5 py-3 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
              isValid && !isLoading && !isSummarizing
                ? "bg-[#EFECE4] hover:bg-[#E5E2D9] text-[#1F1E1D] cursor-pointer"
                : "bg-[#F4F2EC] text-[#A19F99] cursor-not-allowed"
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>
              {isSummarizing
                ? language === "en"
                  ? "Summarizing..."
                  : "กำลังสรุปเนื้อหา..."
                : language === "en"
                ? "Summarize Content"
                : "สรุปเนื้อหา"}
            </span>
          </button>

          <button
            id="input-continue-btn"
            type="button"
            disabled={!isValid || isLoading || isSummarizing}
            onClick={onContinue}
            className={`w-full px-5 py-3 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
              isValid && !isLoading && !isSummarizing
                ? "bg-[#1F1E1D] hover:bg-[#33322F] text-white cursor-pointer"
                : "bg-[#DFDDD6] text-[#8C8A84] cursor-not-allowed"
            }`}
          >
            <span>{language === "en" ? "Create Quiz" : "ทำแบบทดสอบ"}</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Minimal Summary Custom Prompt Modal */}
      <AnimatePresence>
        {isSummaryModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsSummaryModalOpen(false)}
            className="fixed inset-0 z-50 bg-[#1F1E1D]/30 backdrop-blur-[1px] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="summary-modal-title"
              className="bg-[#FAF9F5] rounded-2xl max-w-md w-full shadow-xl border border-[#E5E3DC] overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-[#E5E3DC] flex items-center justify-between">
                <h3 id="summary-modal-title" className="text-base font-semibold text-[#1F1E1D]">
                  {language === "en" ? "Summary Options" : "กำหนดรูปแบบการสรุป"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="p-1.5 rounded-lg text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer"
                  aria-label={language === "en" ? "Close" : "ปิด"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="summary-custom-prompt-input"
                    className="text-xs font-medium text-[#1F1E1D]"
                  >
                    {language === "en"
                      ? "Custom Prompt (Optional)"
                      : "คำสั่งเพิ่มเติม (ไม่บังคับ)"}
                  </label>
                  {summaryPrompt && (
                    <button
                      type="button"
                      onClick={() => setSummaryPrompt("")}
                      className="text-xs text-[#6B6A65] hover:text-[#1F1E1D] cursor-pointer"
                    >
                      {language === "en" ? "Clear" : "ล้าง"}
                    </button>
                  )}
                </div>

                <textarea
                  id="summary-custom-prompt-input"
                  ref={promptInputRef}
                  rows={4}
                  value={summaryPrompt}
                  onChange={(e) => setSummaryPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      handleConfirmSummarize();
                    }
                  }}
                  placeholder={
                    language === "en"
                      ? "e.g. Concise bullet points, highlight formulas, simple language..."
                      : "เช่น สรุปเป็นข้อๆ กระชับ เน้นสูตรสำคัญ อธิบายแบบเข้าใจง่าย..."
                  }
                  className="w-full p-3.5 text-[16px] text-[#1F1E1D] bg-white rounded-xl border border-[#DFDDD6] focus:border-[#1F1E1D] outline-hidden transition-colors resize-y leading-relaxed placeholder:text-[#8C8A84]"
                />

                <p className="text-xs text-[#6B6A65]">
                  {language === "en"
                    ? "Leave blank and press Summarize Now for a standard summary."
                    : "หากไม่ได้พิมพ์อะไร สามารถกดปุ่ม สรุปเลย เพื่อสรุปทันที"}
                </p>
              </div>

              <div className="px-5 py-3.5 border-t border-[#E5E3DC] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#EFECE4] hover:bg-[#E5E2D9] text-sm font-medium text-[#1F1E1D] transition-colors cursor-pointer"
                >
                  {language === "en" ? "Cancel" : "ยกเลิก"}
                </button>
                <button
                  id="confirm-summarize-btn"
                  type="button"
                  onClick={handleConfirmSummarize}
                  className="px-5 py-2 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] text-white text-sm font-medium transition-colors cursor-pointer"
                >
                  {language === "en" ? "Summarize Now" : "สรุปเลย"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
