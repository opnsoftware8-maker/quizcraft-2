"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Plus,
  X,
  History,
  Image as ImageIcon,
  FileUp,
  ArrowUp,
  BookOpen,
  ClipboardList,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "@/lib/language-context";
import { StudyHistoryItem } from "@/lib/firestore-study-history";
import {
  type ChatUploadedFile,
  formatFileSize,
  processChatFileList,
} from "@/lib/chat-files";

interface ChatComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: () => void;
  isStreaming?: boolean;
  attachedItems?: StudyHistoryItem[];
  attachedFiles?: ChatUploadedFile[];
  onOpenStudyHistory?: () => void;
  onRemoveAttachedItem?: (itemId: string) => void;
  onAddFiles?: (files: ChatUploadedFile[]) => void;
  onRemoveAttachedFile?: (fileId: string) => void;
}

export const ChatComposer = React.memo(function ChatComposer({
  value,
  onChange,
  onSubmit,
  isStreaming = false,
  attachedItems = [],
  attachedFiles = [],
  onOpenStudyHistory,
  onRemoveAttachedItem,
  onAddFiles,
  onRemoveAttachedFile,
}: ChatComposerProps) {
  const { language } = useLanguage();
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasContentToSend =
    value.trim().length > 0 ||
    attachedItems.length > 0 ||
    attachedFiles.length > 0;

  // Close popup on Escape or click outside
  useEffect(() => {
    if (!isAddMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAddMenuOpen]);

  // Auto-grow textarea height smoothly without forcing layout reflow when empty
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!value) {
      el.style.height = "";
      el.style.overflowY = "hidden";
      return;
    }
    el.style.height = "auto";
    const maxHeight = 160;
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value]);

  const resetWindowScrollIfNeeded = () => {
    if (typeof window !== "undefined" && (window.scrollY !== 0 || window.scrollX !== 0)) {
      window.scrollTo(0, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && onSubmit && hasContentToSend) {
        onSubmit();
        resetWindowScrollIfNeeded();
      }
    }
  };

  const attachmentOptions = [
    {
      id: "study-history",
      label: language === "en" ? "Study History" : "ประวัติการเรียน",
      icon: History,
    },
    {
      id: "image",
      label: language === "en" ? "Photos" : "รูปภาพ",
      icon: ImageIcon,
    },
    {
      id: "file",
      label: language === "en" ? "Files" : "ไฟล์",
      icon: FileUp,
    },
  ];

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const { files, errors } = await processChatFileList(
      selected,
      language,
      attachedFiles.length
    );

    e.target.value = "";

    if (errors.length > 0) {
      setFileError(errors[0]);
    } else {
      setFileError(null);
    }

    if (files.length > 0) {
      onAddFiles?.(files);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full max-w-3xl mx-auto px-4 pb-5 sm:pb-6 pt-2 relative"
    >
      {/* Persistent hidden file inputs so mobile browsers always fire onChange even after closing menu */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelection}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.markdown,.csv,.tsv,.json,.xml,.html,.htm,.py,.js,.ts,.tsx,.jsx,.java,.c,.cpp,.h,.cs,.go,.rs,.sql,.yaml,.yml,.log,.tex,application/pdf,text/*"
        multiple
        onChange={handleFileSelection}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      {/* Popup Attachment Menu above the Chat Input */}
      <AnimatePresence>
        {isAddMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            id="chat-add-menu-popup"
            className="mb-3 bg-white rounded-3xl border border-[#E7E5DE] shadow-[0_12px_36px_rgba(31,30,29,0.12)] p-4 sm:p-5"
            role="dialog"
            aria-label={language === "en" ? "Add to chat" : "การเพิ่มลงในแชท"}
          >
            {/* Top Handle */}
            <div className="w-10 h-1 rounded-full bg-[#DEDCD6] mx-auto mb-3" />

            {/* Popup Header: Close "×" on left + Title centered */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                id="chat-add-menu-close-btn"
                onClick={() => setIsAddMenuOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#1F1E1D] hover:bg-[#F2F0EA] transition-colors cursor-pointer"
                aria-label={language === "en" ? "Close menu" : "ซ่อนเมนู"}
              >
                <X className="w-5 h-5" />
              </button>

              <span className="text-base font-bold text-[#1F1E1D]">
                {language === "en" ? "Add to chat" : "การเพิ่มลงในแชท"}
              </span>

              {/* Symmetry spacer */}
              <div className="w-9 h-9" aria-hidden="true" />
            </div>

            {/* 3 Option Cards */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {attachmentOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    id={`chat-add-option-${option.id}`}
                    onClick={() => {
                      setFileError(null);
                      if (option.id === "study-history") {
                        setIsAddMenuOpen(false);
                        onOpenStudyHistory?.();
                      } else if (option.id === "image") {
                        imageInputRef.current?.click();
                        setIsAddMenuOpen(false);
                      } else if (option.id === "file") {
                        fileInputRef.current?.click();
                        setIsAddMenuOpen(false);
                      }
                    }}
                    className="flex flex-col items-center justify-center py-4 sm:py-5 px-2 rounded-2xl bg-[#FAF9F5] hover:bg-[#F2F0EA] border border-[#ECEAE3] transition-colors cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#E9E7E0] group-hover:bg-[#E1DFD7] text-[#1F1E1D] flex items-center justify-center mb-2.5 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-[#1F1E1D] whitespace-nowrap">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File validation error banner if unsupported or oversized */}
      {fileError && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl bg-[#EFECE4] border border-[#DFDDD6] px-3.5 py-2 text-xs text-[#1F1E1D]">
          <span>{fileError}</span>
          <button
            type="button"
            onClick={() => setFileError(null)}
            aria-label={language === "en" ? "Dismiss error" : "ปิดข้อความแจ้งเตือน"}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#E5E3DC] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attached Files & Study History Chips Strip (above composer bar) */}
      {(attachedFiles.length > 0 || attachedItems.length > 0) && (
        <div
          id="chat-attached-items-bar"
          className="flex items-center gap-2 overflow-x-auto pb-2.5 px-1 no-scrollbar"
        >
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2.5 bg-white border border-[#E5E3DC] rounded-2xl px-2.5 py-2 shadow-[0_1px_6px_rgba(31,30,29,0.04)] shrink-0 max-w-[240px]"
            >
              {file.kind === "image" && file.previewUrl ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#E5E3DC] bg-[#FAF9F5] shrink-0">
                  <Image
                    src={file.previewUrl}
                    alt={file.name}
                    width={40}
                    height={40}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <span className="w-10 h-10 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] text-[#1F1E1D] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-[#1F1E1D] truncate">
                  {file.name}
                </div>
                <div className="text-[11px] text-[#6B6A65] truncate">
                  {file.kind === "pdf"
                    ? "PDF"
                    : file.kind === "image"
                      ? language === "en"
                        ? "Photo"
                        : "รูปภาพ"
                      : language === "en"
                        ? "File"
                        : "ไฟล์"}{" "}
                  · {formatFileSize(file.size)}
                </div>
              </div>
              {onRemoveAttachedFile && (
                <button
                  type="button"
                  onClick={() => onRemoveAttachedFile(file.id)}
                  aria-label={
                    language === "en"
                      ? `Remove ${file.name}`
                      : `เอา ${file.name} ออก`
                  }
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {attachedItems.map((item) => {
            const TypeIcon = item.type === "summary" ? BookOpen : ClipboardList;
            const typeLabel =
              item.type === "summary"
                ? language === "en"
                  ? "Summary"
                  : "สรุปเนื้อหา"
                : language === "en"
                  ? "Quiz"
                  : "แบบทดสอบ";

            return (
              <div
                key={item.id}
                className="flex items-center gap-2.5 bg-white border border-[#E5E3DC] rounded-2xl px-3 py-2 shadow-[0_1px_6px_rgba(31,30,29,0.04)] shrink-0 max-w-[240px]"
              >
                <span className="w-8 h-8 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] text-[#1F1E1D] flex items-center justify-center shrink-0">
                  <TypeIcon className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-[#1F1E1D] truncate">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-[#6B6A65] truncate">
                    {typeLabel}
                  </div>
                </div>
                {onRemoveAttachedItem && (
                  <button
                    type="button"
                    onClick={() => onRemoveAttachedItem(item.id)}
                    aria-label={
                      language === "en"
                        ? `Remove ${item.title}`
                        : `เอา ${item.title} ออก`
                    }
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Chat Composer Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isStreaming && onSubmit && hasContentToSend) {
            onSubmit();
            resetWindowScrollIfNeeded();
          }
        }}
        className="bg-white border border-[#E5E3DC] rounded-[28px] shadow-[0_2px_14px_rgba(31,30,29,0.05)] px-2.5 py-2 flex items-end gap-2 focus-within:border-[#CFCBC2] transition-colors"
      >
        {/* Left "+" Button */}
        <button
          type="button"
          id="chat-add-btn"
          onClick={() => setIsAddMenuOpen((prev) => !prev)}
          aria-expanded={isAddMenuOpen}
          aria-label={language === "en" ? "Add attachments" : "เปิดเมนูเพิ่มลงในแชท"}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
            isAddMenuOpen
              ? "bg-[#1F1E1D] text-white"
              : "bg-[#F2F0EA] hover:bg-[#E8E5DD] text-[#1F1E1D]"
          }`}
        >
          <Plus
            className={`w-5 h-5 transition-transform duration-150 ${
              isAddMenuOpen ? "rotate-45" : ""
            }`}
          />
        </button>

        {/* Center Chat Input */}
        <textarea
          ref={textareaRef}
          id="chat-message-input"
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={resetWindowScrollIfNeeded}
          onKeyDown={handleKeyDown}
          placeholder={
            language === "en"
              ? "Ask OpenSolver anything..."
              : "พิมพ์ข้อความหรือโจทย์ที่ต้องการถาม..."
          }
          className="flex-1 bg-transparent border-0 outline-hidden resize-none py-2 px-1.5 text-[16px] leading-relaxed text-[#1F1E1D] placeholder:text-[#8C8A84] max-h-40 overflow-y-hidden no-scrollbar appearance-none"
        />

        {/* Right Control: Send Only */}
        <div className="flex items-center shrink-0">
          <button
            type="submit"
            id="chat-send-btn"
            disabled={isStreaming || !hasContentToSend}
            aria-label={language === "en" ? "Send message" : "ส่งข้อความ"}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              isStreaming || !hasContentToSend
                ? "bg-[#1F1E1D]/35 text-white cursor-not-allowed"
                : "bg-[#1F1E1D] hover:bg-[#33322F] text-white cursor-pointer"
            }`}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
});
