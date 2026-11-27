"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  ClipboardList,
  Sparkles,
  Calculator,
  Table2,
  Compass,
  PenLine,
  FileText,
} from "lucide-react";
import dynamic from "next/dynamic";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { PersonaAvatar } from "@/components/PersonaAvatarIcon";
import { retryDynamicImport } from "@/lib/chunk-recovery";

const DataTableCard = dynamic(
  () =>
    retryDynamicImport(() =>
      import("@/components/DataTableCard").then((m) => m.DataTableCard)
    ),
  { ssr: false }
);
const DataTableModal = dynamic(
  () =>
    retryDynamicImport(() =>
      import("@/components/DataTableModal").then((m) => m.DataTableModal)
    ),
  { ssr: false }
);
const MathCanvasCard = dynamic(
  () =>
    retryDynamicImport(() =>
      import("@/components/MathCanvasCard").then((m) => m.MathCanvasCard)
    ),
  { ssr: false }
);
const MathCanvasModal = dynamic(
  () =>
    retryDynamicImport(() =>
      import("@/components/MathCanvasModal").then((m) => m.MathCanvasModal)
    ),
  { ssr: false }
);
import { AiPersona, AiEmotion } from "@/lib/firestore-personas";
import { useLanguage } from "@/lib/language-context";
import { StructuredTableData, tableToTsv } from "@/lib/structured-table";
import { MathCanvasData } from "@/lib/math-canvas";
import { markdownToCleanPlainText } from "@/lib/plain-text";
import { type ChatUploadedFile, formatFileSize } from "@/lib/chat-files";

export interface ChatAttachmentMeta {
  id: string;
  type: "summary" | "quiz";
  title: string;
  subject: string;
}

export type ThinkingStage =
  | "analyzing"
  | "thinking"
  | "calculating"
  | "building_table"
  | "drawing_graph"
  | "composing";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  apiContent?: string;
  attachments?: ChatAttachmentMeta[];
  uploadedFiles?: ChatUploadedFile[];
  tables?: StructuredTableData[];
  canvases?: MathCanvasData[];
  personaId?: string;
  personaName?: string;
  emotionId?: string;
  emotionLabel?: string;
  emotionImage?: string;
  thinkingStage?: ThinkingStage;
  status: "streaming" | "done" | "error";
  feedback: "up" | "down" | null;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  onRetry: (aiMessageId: string) => void;
  onFeedback: (aiMessageId: string, vote: "up" | "down") => void;
  onCreateQuizFromMessage?: (msg: ChatMessage) => void;
  onSummarizeFromMessage?: (msg: ChatMessage) => void;
  personas?: AiPersona[];
  emotions?: AiEmotion[];
  activePersona?: AiPersona | null;
}

function getStageMeta(stage: ThinkingStage | undefined, language: "th" | "en") {
  const activeStage: ThinkingStage = stage || "analyzing";
  switch (activeStage) {
    case "calculating":
      return {
        key: "calculating",
        Icon: Calculator,
        label:
          language === "en"
            ? "Calculating formulas with Math.js..."
            : "กำลังคำนวณตัวเลขและสูตรด้วย Math.js...",
      };
    case "building_table":
      return {
        key: "building_table",
        Icon: Table2,
        label:
          language === "en"
            ? "Structuring comparison table..."
            : "กำลังจัดโครงสร้างตารางข้อมูล...",
      };
    case "drawing_graph":
      return {
        key: "drawing_graph",
        Icon: Compass,
        label:
          language === "en"
            ? "Plotting coordinate diagram..."
            : "กำลังวาดกราฟและพิกัดจำลอง...",
      };
    case "composing":
      return {
        key: "composing",
        Icon: PenLine,
        label:
          language === "en"
            ? "Preparing your answer..."
            : "กำลังเรียบเรียงคำตอบให้คุณ...",
      };
    case "thinking":
      return {
        key: "thinking",
        Icon: Sparkles,
        label:
          language === "en"
            ? "Thinking through the steps..."
            : "กำลังคิดวิเคราะห์ขั้นตอนคำตอบ...",
      };
    case "analyzing":
    default:
      return {
        key: "analyzing",
        Icon: Sparkles,
        label:
          language === "en"
            ? "Reading and analyzing your question..."
            : "กำลังอ่านและวิเคราะห์คำถาม...",
      };
  }
}

function ThinkingStatusIndicator({
  stage,
  language,
  compact = false,
}: {
  stage?: ThinkingStage;
  language: "th" | "en";
  compact?: boolean;
}) {
  const { key, Icon, label } = getStageMeta(stage, language);

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-2xl border border-[#E5E3DC] bg-white/90 px-3 py-2 ${
        compact ? "mt-2.5" : "my-1"
      }`}
      aria-live="polite"
      aria-label={label}
    >
      {/* Pure GPU-composited pulsing orbital thinking icon */}
      <div className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EFECE4] text-[#1F1E1D]">
        <span
          aria-hidden="true"
          className="thinking-orbital-ring pointer-events-none absolute inset-0 rounded-full border border-[#1F1E1D]/25"
        />
        <span
          key={key}
          className="thinking-stage-icon flex items-center justify-center"
        >
          <Icon className="h-3.5 w-3.5 text-[#1F1E1D]" />
        </span>
      </div>

      {/* Smooth stage label */}
      <div className="min-w-0 overflow-hidden">
        <span
          key={key}
          className="thinking-stage-label block text-[13.5px] font-medium leading-snug"
        >
          {label}
        </span>
      </div>

      {/* Pure GPU-composited wave dots */}
      <div className="flex items-center gap-1 pl-0.5 shrink-0" aria-hidden="true">
        <span className="thinking-wave-dot thinking-wave-dot-1 h-1.5 w-1.5 rounded-full bg-[#6B6A65]" />
        <span className="thinking-wave-dot thinking-wave-dot-2 h-1.5 w-1.5 rounded-full bg-[#6B6A65]" />
        <span className="thinking-wave-dot thinking-wave-dot-3 h-1.5 w-1.5 rounded-full bg-[#6B6A65]" />
      </div>
    </div>
  );
}

interface ChatMessageRowProps {
  msg: ChatMessage;
  language: "th" | "en";
  isCopied: boolean;
  avatarImage?: string;
  avatarAlt: string;
  onCopy: (msg: ChatMessage) => void;
  onRetry: (aiMessageId: string) => void;
  onFeedback: (aiMessageId: string, vote: "up" | "down") => void;
  onCreateQuizFromMessage?: (msg: ChatMessage) => void;
  onSummarizeFromMessage?: (msg: ChatMessage) => void;
  onExpandTable: (table: StructuredTableData) => void;
  onExpandCanvas: (canvas: MathCanvasData) => void;
}

const actionBtnBase =
  "inline-flex items-center gap-1.5 p-1.5 rounded-lg text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer";

const MemoizedChatMessageRow = React.memo(function ChatMessageRow({
  msg,
  language,
  isCopied,
  avatarImage,
  avatarAlt,
  onCopy,
  onRetry,
  onFeedback,
  onCreateQuizFromMessage,
  onSummarizeFromMessage,
  onExpandTable,
  onExpandCanvas,
}: ChatMessageRowProps) {
  if (msg.role === "user") {
    return (
      <div className="flex flex-col items-end gap-2 w-full">
        {msg.uploadedFiles && msg.uploadedFiles.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 max-w-[84%] sm:max-w-[74%]">
            {msg.uploadedFiles.map((file) => {
              const imageSrc =
                file.kind === "image"
                  ? file.previewUrl ||
                    (file.base64Data
                      ? `data:${file.mimeType || "image/jpeg"};base64,${file.base64Data}`
                      : "")
                  : "";

              if (file.kind === "image" && imageSrc) {
                return (
                  <div
                    key={file.id}
                    className="overflow-hidden rounded-2xl border border-[#E5E3DC] bg-white shadow-[0_1px_6px_rgba(31,30,29,0.05)] max-w-[260px]"
                  >
                    <Image
                      src={imageSrc}
                      alt={file.name}
                      width={260}
                      height={200}
                      referrerPolicy="no-referrer"
                      className="max-h-56 w-auto max-w-full object-contain bg-[#FAF9F5]"
                    />
                    <div className="px-2.5 py-1.5 border-t border-[#ECEAE3] bg-white flex items-center justify-between gap-2 text-[11px] text-[#6B6A65]">
                      <span className="truncate font-medium text-[#1F1E1D]">
                        {file.name}
                      </span>
                      <span className="shrink-0">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={file.id}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white border border-[#E5E3DC] px-3 py-2 text-xs text-[#1F1E1D]"
                >
                  <FileText className="w-4 h-4 text-[#6B6A65] shrink-0" />
                  <div className="min-w-0 max-w-[180px]">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-[11px] text-[#6B6A65]">
                      {file.kind === "pdf" ? "PDF" : file.kind === "image" ? (language === "en" ? "Image" : "รูปภาพ") : (language === "en" ? "File" : "ไฟล์")} · {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {msg.attachments && msg.attachments.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5 max-w-[84%] sm:max-w-[74%]">
            {msg.attachments.map((att) => {
              const TypeIcon = att.type === "summary" ? BookOpen : ClipboardList;
              const typeLabel =
                att.type === "summary"
                  ? language === "en"
                    ? "Summary"
                    : "สรุปเนื้อหา"
                  : language === "en"
                    ? "Quiz"
                    : "แบบทดสอบ";
              return (
                <div
                  key={att.id}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white border border-[#E5E3DC] px-3 py-1.5 text-xs text-[#1F1E1D]"
                >
                  <TypeIcon className="w-3.5 h-3.5 text-[#6B6A65] shrink-0" />
                  <span className="font-medium truncate max-w-[160px]">
                    {att.title}
                  </span>
                  <span className="text-[11px] text-[#6B6A65] shrink-0">
                    · {typeLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {msg.content.trim().length > 0 && (
          <div className="max-w-[84%] sm:max-w-[74%] rounded-3xl rounded-br-lg bg-[#EFECE4] text-[#1F1E1D] px-4 py-2.5 text-[15.5px] leading-relaxed whitespace-pre-wrap break-words">
            {msg.content}
          </div>
        )}
      </div>
    );
  }

  const hasTables = Boolean(msg.tables && msg.tables.length > 0);
  const hasCanvases = Boolean(msg.canvases && msg.canvases.length > 0);
  const hasText = msg.content.trim().length > 0;
  const isActivelyStreaming = msg.status === "streaming";
  const showThinkingBelowOrInline = isActivelyStreaming && !hasText;

  return (
    <div className="flex flex-col items-start w-full">
      {/* Persona / Emotion Profile Avatar above AI response bubble */}
      <div className="mb-1.5 flex items-center gap-2">
        <PersonaAvatar
          profileImage={avatarImage}
          alt={msg.emotionLabel ? `${avatarAlt} (${msg.emotionLabel})` : avatarAlt}
          sizeClass={msg.emotionLabel ? "w-9 h-9" : "w-8 h-8"}
        />
        {msg.emotionLabel && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-white border border-[#E5E3DC] text-[11px] font-medium text-[#1F1E1D]">
            {msg.emotionLabel}
          </span>
        )}
      </div>

      <div className="w-full">
        {hasText && (
          <MarkdownRenderer
            content={msg.content}
            isStreaming={isActivelyStreaming}
          />
        )}
        {msg.tables &&
          msg.tables.map((tbl) => (
            <DataTableCard
              key={tbl.id}
              table={tbl}
              onExpand={onExpandTable}
            />
          ))}
        {msg.canvases &&
          msg.canvases.map((cv) => (
            <MathCanvasCard
              key={cv.id}
              canvas={cv}
              onExpand={onExpandCanvas}
            />
          ))}

        {showThinkingBelowOrInline && (
          <ThinkingStatusIndicator
            stage={msg.thinkingStage}
            language={language}
            compact={hasTables || hasCanvases}
          />
        )}
      </div>

      {/* Action Buttons under completed AI responses */}
      {msg.status !== "streaming" && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1">
          {/* 1. Copy */}
          <button
            type="button"
            onClick={() => onCopy(msg)}
            className={actionBtnBase}
            aria-label={language === "en" ? "Copy response" : "คัดลอกคำตอบ"}
            title={language === "en" ? "Copy" : "คัดลอก"}
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium">
                  {language === "en" ? "Copied" : "คัดลอกแล้ว"}
                </span>
              </>
            ) : (
              <Copy className="w-4 h-4 shrink-0" />
            )}
          </button>

          {/* 2. Retry */}
          <button
            type="button"
            onClick={() => onRetry(msg.id)}
            className={actionBtnBase}
            aria-label={language === "en" ? "Retry response" : "ลองใหม่"}
            title={language === "en" ? "Retry" : "ลองใหม่"}
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
          </button>

          {/* 3. Thumbs Up */}
          <button
            type="button"
            onClick={() => onFeedback(msg.id, "up")}
            aria-pressed={msg.feedback === "up"}
            className={`inline-flex items-center gap-1.5 p-1.5 rounded-lg transition-colors cursor-pointer ${
              msg.feedback === "up"
                ? "bg-[#E6E2D8] text-[#1F1E1D]"
                : "text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#EFECE4]"
            }`}
            aria-label={language === "en" ? "Good response" : "เยี่ยม"}
            title={language === "en" ? "Helpful" : "เยี่ยม"}
          >
            <ThumbsUp
              className="w-4 h-4 shrink-0"
              fill={msg.feedback === "up" ? "currentColor" : "none"}
            />
          </button>

          {/* 4. Thumbs Down */}
          <button
            type="button"
            onClick={() => onFeedback(msg.id, "down")}
            aria-pressed={msg.feedback === "down"}
            className={`inline-flex items-center gap-1.5 p-1.5 rounded-lg transition-colors cursor-pointer ${
              msg.feedback === "down"
                ? "bg-[#E6E2D8] text-[#1F1E1D]"
                : "text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#EFECE4]"
            }`}
            aria-label={language === "en" ? "Bad response" : "แย่"}
            title={language === "en" ? "Not helpful" : "แย่"}
          >
            <ThumbsDown
              className="w-4 h-4 shrink-0"
              fill={msg.feedback === "down" ? "currentColor" : "none"}
            />
          </button>

          {/* 5 & 6. Create Quiz + Summarize directly from this response */}
          {msg.status === "done" &&
            (hasText || hasTables || hasCanvases) &&
            (onCreateQuizFromMessage || onSummarizeFromMessage) && (
              <>
                <span
                  className="mx-1 h-4 w-px bg-[#E5E3DC]"
                  aria-hidden="true"
                />
                {onCreateQuizFromMessage && (
                  <button
                    type="button"
                    onClick={() => onCreateQuizFromMessage(msg)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1F1E1D] bg-[#EFECE4]/70 hover:bg-[#EFECE4] transition-colors cursor-pointer"
                    aria-label={
                      language === "en"
                        ? "Create quiz from this response"
                        : "ทำแบบทดสอบจากคำตอบนี้"
                    }
                  >
                    <ClipboardList className="w-3.5 h-3.5 shrink-0 text-[#6B6A65]" />
                    <span>{language === "en" ? "Create Quiz" : "ทำแบบทดสอบ"}</span>
                  </button>
                )}
                {onSummarizeFromMessage && (
                  <button
                    type="button"
                    onClick={() => onSummarizeFromMessage(msg)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1F1E1D] bg-[#EFECE4]/70 hover:bg-[#EFECE4] transition-colors cursor-pointer"
                    aria-label={
                      language === "en"
                        ? "Summarize this response"
                        : "สรุปเนื้อหาจากคำตอบนี้"
                    }
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0 text-[#6B6A65]" />
                    <span>{language === "en" ? "Summarize" : "สรุปเนื้อหา"}</span>
                  </button>
                )}
              </>
            )}
        </div>
      )}
    </div>
  );
});

export function ChatMessageList({
  messages,
  onRetry,
  onFeedback,
  onCreateQuizFromMessage,
  onSummarizeFromMessage,
  personas = [],
  emotions = [],
  activePersona = null,
}: ChatMessageListProps) {
  const { language } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const prevMessageCountRef = useRef<number>(messages.length);
  const lastScrollHeightRef = useRef<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTable, setExpandedTable] = useState<StructuredTableData | null>(
    null
  );
  const [expandedCanvas, setExpandedCanvas] = useState<MathCanvasData | null>(
    null
  );

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 120;
  }, []);

  useEffect(() => {
    const isNewMessageAdded = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (isNewMessageAdded) {
      shouldAutoScrollRef.current = true;
    }

    if (!shouldAutoScrollRef.current) return;

    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = scrollContainerRef.current;
      if (!el) return;
      const nextHeight = el.scrollHeight;
      if (isNewMessageAdded || nextHeight !== lastScrollHeightRef.current) {
        lastScrollHeightRef.current = nextHeight;
        el.scrollTop = nextHeight;
      }
    });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async (msg: ChatMessage) => {
    const parts: string[] = [];
    if (msg.content.trim()) {
      parts.push(markdownToCleanPlainText(msg.content));
    }
    if (msg.tables && msg.tables.length > 0) {
      for (const tbl of msg.tables) {
        parts.push(`${tbl.title}\n${tableToTsv(tbl)}`);
      }
    }
    if (msg.canvases && msg.canvases.length > 0) {
      for (const cv of msg.canvases) {
        parts.push(`[${cv.title}]`);
      }
    }
    const text = parts.join("\n\n");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(msg.id);
      setTimeout(() => {
        setCopiedId((current) => (current === msg.id ? null : current));
      }, 1800);
    } catch {
      // ignore clipboard failures
    }
  }, []);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="chat-scroll-container flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pt-3 pb-4"
    >
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-5">
        {messages.map((msg) => {
          let avatarImage: string | undefined;
          let avatarAlt = "AI";
          if (msg.role === "assistant") {
            const targetPersonaKey =
              msg.personaId !== undefined
                ? msg.personaId || "default"
                : activePersona?.id || "default";

            if (msg.personaId !== undefined) {
              if (msg.personaId === "") {
                avatarImage = "";
                avatarAlt = language === "en" ? "Default" : "เริ่มต้น";
              } else {
                const matched = personas.find((p) => p.id === msg.personaId);
                avatarImage = matched?.profileImage || "";
                avatarAlt = matched?.name || msg.personaName || "AI";
              }
            } else {
              avatarImage = activePersona?.profileImage || "";
              avatarAlt = activePersona?.name || "AI";
            }

            if (msg.emotionId || msg.emotionLabel) {
              const matchedEmotion =
                emotions.find((e) => msg.emotionId && e.id === msg.emotionId) ||
                emotions.find(
                  (e) =>
                    e.personaId === targetPersonaKey &&
                    msg.emotionLabel &&
                    e.label.toLowerCase() === msg.emotionLabel.toLowerCase()
                );
              if (matchedEmotion?.image) {
                avatarImage = matchedEmotion.image;
              } else if (msg.emotionImage) {
                avatarImage = msg.emotionImage;
              }
            }
          }

          return (
            <MemoizedChatMessageRow
              key={msg.id}
              msg={msg}
              language={language}
              isCopied={copiedId === msg.id}
              avatarImage={avatarImage}
              avatarAlt={avatarAlt}
              onCopy={handleCopy}
              onRetry={onRetry}
              onFeedback={onFeedback}
              onCreateQuizFromMessage={onCreateQuizFromMessage}
              onSummarizeFromMessage={onSummarizeFromMessage}
              onExpandTable={setExpandedTable}
              onExpandCanvas={setExpandedCanvas}
            />
          );
        })}

        <div className="h-1 shrink-0" />
      </div>

      <DataTableModal
        table={expandedTable}
        onClose={() => setExpandedTable(null)}
      />

      <MathCanvasModal
        canvas={expandedCanvas}
        onClose={() => setExpandedCanvas(null)}
      />
    </div>
  );
}
