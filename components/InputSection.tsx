"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  FileText,
  Upload,
  Sparkles,
  BookOpen,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ArrowRight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { notifyUserAction } from "@/lib/analytics";
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

  const handleContinueWithNotify = () => {
    const topicSummary = notesText.trim().substring(0, 40);
    notifyUserAction(`เลือกสร้างแบบทดสอบจากเนื้อหา: "${topicSummary}..."`).catch(() => {});
    onContinue();
  };

  const handleOpenSummaryModal = () => {
    setIsSummaryModalOpen(true);
  };

  const handleConfirmSummarize = () => {
    const trimmedPrompt = summaryPrompt.trim();
    const topicSummary = notesText.trim().substring(0, 40);
    notifyUserAction(`กดสรุปบทเรียนจากเนื้อหา: "${topicSummary}..."`).catch(() => {});
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
            ? `File "${file.name}" uploaded successfully (${content.length} chars)`
            : `อัปโหลดไฟล์ "${file.name}" สำเร็จ (${content.length} ตัวอักษร)`
        );
        setTimeout(() => setUploadStatus(null), 4000);
      }
    };
    reader.onerror = () => {
      setUploadStatus(
        language === "en"
          ? "Failed to read file. Please provide a valid .txt or .md file."
          : "ไม่สามารถอ่านไฟล์ได้ กรุณาลองใช้ไฟล์ .txt หรือ .md"
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
    <div className="space-y-6 lg:space-y-8">
      {/* Section Headline & Instructions (Minimalist Studio Header) */}
      <div className="text-center max-w-3xl mx-auto pt-2 pb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">
          {language === "en" ? "Exam & Flashcards Generator" : "ระบบสร้างข้อสอบ & แฟลชการ์ด"}
        </span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
          {language === "en" ? "Test Knowledge & Review Lessons" : "ทดสอบความรู้ และทบทวนบทเรียน"}
        </h2>
        <p className="mt-2 text-xs sm:text-sm lg:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {language === "en"
            ? "Import summaries, lecture notes, or textbooks to generate multiple-choice exams, flashcards, and analytical essays with step-by-step solutions."
            : "นำเข้าข้อความสรุป เลกเชอร์ หรือเนื้อหาบทเรียน เพื่อสร้างแบบทดสอบปรนัย แฟลชการ์ด และข้อสอบข้อเขียนพร้อมเฉลยละเอียด"}
        </p>
      </div>

      {/* Main Text Input Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 lg:p-10 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-5 h-5 text-slate-700" />
            <label
              htmlFor="notes-textarea"
              className="text-sm sm:text-base font-bold text-slate-900"
            >
              {language === "en" ? "Lesson Content / Study Notes" : "เนื้อหาบทเรียน / ข้อความสรุป"}
            </label>
          </div>
          <div className="flex items-center space-x-3 text-xs sm:text-sm text-slate-500">
            <span>{wordCount.toLocaleString()} {language === "en" ? "words" : "คำ"}</span>
            <span aria-hidden="true">·</span>
            <span>{charCount.toLocaleString()} {language === "en" ? "characters" : "ตัวอักษร"}</span>
            {notesText && (
              <button
                onClick={() => {
                  setNotesText("");
                }}
                className="text-rose-600 hover:text-rose-700 font-medium inline-flex items-center transition-colors cursor-pointer ml-2"
                title={language === "en" ? "Clear notes" : "ล้างข้อความ"}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                {language === "en" ? "Clear" : "ล้างเนื้อหา"}
              </button>
            )}
          </div>
        </div>

        {/* Text Area (Spacious for Desktop & Tablet) */}
        <div className="relative">
          <textarea
            id="notes-textarea"
            rows={12}
            value={notesText}
            onChange={(e) => {
              setNotesText(e.target.value);
            }}
            placeholder={
              language === "en"
                ? "Paste study notes, lecture summaries, or textbook excerpts here... (e.g. Photosynthesis mechanisms, Newtonian physics, or Macroeconomics supply & demand)"
                : "วางข้อความสรุป เลกเชอร์ หรือชีทบทเรียนที่นี่... (เช่น สรุปการสังเคราะห์ด้วยแสง, ฟิสิกส์กลศาสตร์, หรือเศรษฐศาสตร์)"
            }
            className="w-full p-4 sm:p-5 text-sm sm:text-base text-slate-900 bg-slate-50/50 focus:bg-white rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 outline-hidden transition-all resize-y leading-relaxed min-h-[260px] lg:min-h-[320px]"
          />
        </div>

        {/* File Drag and Drop / Upload Helper */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-colors ${
            dragActive
              ? "border-slate-900 bg-slate-50"
              : "border-slate-300 hover:border-slate-400 bg-slate-50/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.text"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-slate-600">
            <Upload className="w-4 h-4 text-slate-700" />
            <span>
              {language === "en" ? "Drag & drop text file here, or " : "ลากและวางไฟล์ข้อความ หรือ "}
              <span className="text-slate-900 font-semibold underline">
                {language === "en" ? "browse file (.txt, .md)" : "คลิกเลือกไฟล์ (.txt, .md)"}
              </span>
            </span>
          </div>
        </div>

        {uploadStatus && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{uploadStatus}</span>
          </div>
        )}

        {/* Validation error prompt */}
        {!isValid && notesText.length > 0 && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              {language === "en"
                ? "Please enter or paste at least 20 characters to generate an exam."
                : "กรุณากรอกหรือวางเนื้อหาอย่างน้อย 20 ตัวอักษรเพื่อสร้างแบบทดสอบ"}
            </span>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="text-xs sm:text-sm text-slate-500 flex items-center">
            {isValid && (
              <span className="inline-flex items-center text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {language === "en"
                  ? `Content ready (${charCount.toLocaleString()} characters)`
                  : `เนื้อหาพร้อมประมวลผล (${charCount.toLocaleString()} ตัวอักษร)`}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* AI Summary Button */}
            <button
              id="input-summarize-btn"
              type="button"
              disabled={!isValid || isLoading || isSummarizing}
              onClick={handleOpenSummaryModal}
              className={`w-full sm:w-auto px-5 py-3 rounded-xl text-xs sm:text-sm font-medium inline-flex items-center justify-center space-x-2 transition-all ${
                isValid && !isLoading && !isSummarizing
                  ? "bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 cursor-pointer shadow-2xs"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
              title={
                language === "en"
                  ? "Distill key takeaways into a structured study guide"
                  : "สรุปเนื้อหาสำคัญ จัดระเบียบหัวข้อให้อ่านเข้าใจง่าย"
              }
            >
              <BookOpen className="w-4 h-4 text-slate-600" />
              <span>
                {isSummarizing
                  ? (language === "en" ? "Summarizing..." : "กำลังสรุปเนื้อหา...")
                  : (language === "en" ? "Executive Summary" : "สรุปเนื้อหาสำคัญ")}
              </span>
            </button>

            {/* Proceed to Modes Button */}
            <button
              id="input-continue-btn"
              type="button"
              disabled={!isValid || isLoading || isSummarizing}
              onClick={handleContinueWithNotify}
              className={`w-full sm:w-auto px-7 py-3 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center space-x-2 transition-all shadow-xs ${
                isValid && !isLoading && !isSummarizing
                  ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-[0.99]"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              <span>{language === "en" ? "Choose Exam Mode" : "ดำเนินการเลือกโหมดข้อสอบ"}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Custom Summary Prompt Popup Modal */}
      <AnimatePresence>
        {isSummaryModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsSummaryModalOpen(false)}
            className="fixed inset-0 z-50 bg-[#0F172A]/50 flex items-center justify-center p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="summary-modal-title"
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 id="summary-modal-title" className="text-base font-semibold text-slate-900">
                      {language === "en" ? "Summary Options" : "ตัวเลือกการสรุปเนื้อหา"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {language === "en"
                        ? "Customize how the notes should be summarized, or leave blank for standard summary."
                        : "กำหนดรูปแบบการสรุปให้ตรงใจ หรือปล่อยว่างไว้เพื่อสรุปแบบมาตรฐานทันที"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label={language === "en" ? "Close" : "ปิด"}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="summary-custom-prompt-input"
                    className="text-xs sm:text-sm font-semibold text-slate-900"
                  >
                    {language === "en" ? "Custom Summary Prompt (Optional)" : "พรอมต์กำหนดการสรุปเนื้อหา (ไม่บังคับ)"}
                  </label>
                  {summaryPrompt && (
                    <button
                      type="button"
                      onClick={() => setSummaryPrompt("")}
                      className="text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      {language === "en" ? "Clear" : "ล้างข้อความ"}
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
                      ? "e.g. Summarize into concise bullet points for quick exam review, highlight key formulas, or explain in simple language..."
                      : "เช่น สรุปเป็นข้อๆ กระชับอ่านง่ายก่อนสอบ, เน้นสูตรและจุดที่มักออกสอบ, อธิบายด้วยภาษาง่ายๆ..."
                  }
                  className="w-full p-3.5 text-sm text-slate-900 bg-slate-50/60 focus:bg-white rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 outline-hidden transition-all resize-y leading-relaxed"
                />

                <p className="text-xs text-slate-500">
                  {language === "en"
                    ? "Leave this field empty and click Summarize Now to generate the standard summary immediately."
                    : "หากไม่ได้พิมพ์อะไร สามารถกดปุ่ม \"สรุปเลย\" เพื่อเริ่มสรุปเนื้อหาให้ทันที"}
                </p>
              </div>

              {/* Modal Footer */}
              <div className="px-5 sm:px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  {language === "en" ? "Cancel" : "ยกเลิก"}
                </button>
                <button
                  id="confirm-summarize-btn"
                  type="button"
                  onClick={handleConfirmSummarize}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center space-x-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{language === "en" ? "Summarize Now" : "สรุปเลย"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
