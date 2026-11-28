"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Loader2,
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

const CHAT_IMAGE_INPUT_ID = "chat-image-upload-input";
const CHAT_FILE_INPUT_ID = "chat-file-upload-input";

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
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachedFilesCountRef = useRef<number>(attachedFiles.length);

  useEffect(() => {
    attachedFilesCountRef.current = attachedFiles.length;
  }, [attachedFiles.length]);

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
      if (!isStreaming && !isProcessingFiles && onSubmit && hasContentToSend) {
        onSubmit();
        resetWindowScrollIfNeeded();
      }
    }
  };

  const handleIncomingFiles = useCallback(
    async (pickedFiles: File[]) => {
      if (pickedFiles.length === 0) return;

      setFileError(null);
      setIsProcessingFiles(true);
      setIsAddMenuOpen(false);

      try {
        const { files, errors } = await processChatFileList(
          pickedFiles,
          language,
          attachedFilesCountRef.current
        );

        if (errors.length > 0) {
          setFileError(errors[0]);
        }

        if (files.length > 0) {
          onAddFiles?.(files);
        }
      } catch {
        setFileError(
          language === "en"
            ? "Could not attach the selected file(s). Please try again."
            : "ไม่สามารถแนบไฟล์ที่เลือกได้ กรุณาลองใหม่อีกครั้ง"
        );
      } finally {
        setIsProcessingFiles(false);
      }
    },
    [language, onAddFiles]
  );

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    // Copy File objects synchronously BEFORE clearing input value so repeated picks of the same file work reliably
    const pickedFiles = selected ? Array.from(selected) : [];
    e.target.value = "";
    if (pickedFiles.length === 0) return;
    void handleIncomingFiles(pickedFiles);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      void handleIncomingFiles(pastedFiles);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      void handleIncomingFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes("Files")) {
          e.preventDefault();
          setIsDraggingOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.relatedTarget as Node)
        ) {
          setIsDraggingOver(false);
        }
      }}
      onDrop={handleDrop}
      className="w-full max-w-3xl mx-auto px-4 pb-5 sm:pb-6 pt-2 relative"
    >
      {/* Persistent visually-hidden (sr-only) file inputs outside AnimatePresence so mobile/PWA browsers always trigger onChange */}
      <input
        ref={imageInputRef}
        id={CHAT_IMAGE_INPUT_ID}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelection}
        className="sr-only"
        tabIndex={-1}
      />
      <input
        ref={fileInputRef}
        id={CHAT_FILE_INPUT_ID}
        type="file"
        multiple
        onChange={handleFileSelection}
        className="sr-only"
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

            {/* 3 Option Cards: Native <label htmlFor> for Photos & Files so mobile/PWA pickers open on first tap */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <button
                type="button"
                id="chat-add-option-study-history"
                onClick={() => {
                  setFileError(null);
                  setIsAddMenuOpen(false);
                  onOpenStudyHistory?.();
                }}
                className="flex flex-col items-center justify-center py-4 sm:py-5 px-2 rounded-2xl bg-[#FAF9F5] hover:bg-[#F2F0EA] border border-[#ECEAE3] transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-[#E9E7E0] group-hover:bg-[#E1DFD7] text-[#1F1E1D] flex items-center justify-center mb-2.5 transition-colors">
                  <History className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-[#1F1E1D] whitespace-nowrap">
                  {language === "en" ? "Study History" : "ประวัติการเรียน"}
                </span>
              </button>

              <label
                htmlFor={CHAT_IMAGE_INPUT_ID}
                id="chat-add-option-image"
                onClick={() => {
                  setFileError(null);
                  window.setTimeout(() => setIsAddMenuOpen(false), 250);
                }}
                className="flex flex-col items-center justify-center py-4 sm:py-5 px-2 rounded-2xl bg-[#FAF9F5] hover:bg-[#F2F0EA] border border-[#ECEAE3] transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-[#E9E7E0] group-hover:bg-[#E1DFD7] text-[#1F1E1D] flex items-center justify-center mb-2.5 transition-colors">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-[#1F1E1D] whitespace-nowrap">
                  {language === "en" ? "Photos" : "รูปภาพ"}
                </span>
              </label>

              <label
                htmlFor={CHAT_FILE_INPUT_ID}
                id="chat-add-option-file"
                onClick={() => {
                  setFileError(null);
                  window.setTimeout(() => setIsAddMenuOpen(false), 250);
                }}
                className="flex flex-col items-center justify-center py-4 sm:py-5 px-2 rounded-2xl bg-[#FAF9F5] hover:bg-[#F2F0EA] border border-[#ECEAE3] transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-[#E9E7E0] group-hover:bg-[#E1DFD7] text-[#1F1E1D] flex items-center justify-center mb-2.5 transition-colors">
                  <FileUp className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-[#1F1E1D] whitespace-nowrap">
                  {language === "en" ? "Files" : "ไฟล์"}
                </span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File processing indicator */}
      {isProcessingFiles && (
        <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-white border border-[#E5E3DC] px-3.5 py-2 text-xs font-medium text-[#1F1E1D] shadow-[0_1px_6px_rgba(31,30,29,0.04)]">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1F1E1D]" />
          <span>
            {language === "en"
              ? "Preparing file(s)..."
              : "กำลังเตรียมไฟล์ที่เลือก..."}
          </span>
        </div>
      )}

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
          if (!isStreaming && !isProcessingFiles && onSubmit && hasContentToSend) {
            onSubmit();
            resetWindowScrollIfNeeded();
          }
        }}
        className={`bg-white border rounded-[28px] shadow-[0_2px_14px_rgba(31,30,29,0.05)] px-2.5 py-2 flex items-end gap-2 transition-colors ${
          isDraggingOver
            ? "border-[#1F1E1D] bg-[#FAF9F5]"
            : "border-[#E5E3DC] focus-within:border-[#CFCBC2]"
        }`}
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
          onPaste={handlePaste}
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
            disabled={isStreaming || isProcessingFiles || !hasContentToSend}
            aria-label={language === "en" ? "Send message" : "ส่งข้อความ"}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              isStreaming || isProcessingFiles || !hasContentToSend
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
