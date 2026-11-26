"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import dynamic from "next/dynamic";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { PersonaAvatar } from "@/components/PersonaAvatarIcon";

const DataTableCard = dynamic(
  () => import("@/components/DataTableCard").then((m) => m.DataTableCard),
  { ssr: false }
);
const DataTableModal = dynamic(
  () => import("@/components/DataTableModal").then((m) => m.DataTableModal),
  { ssr: false }
);
const MathCanvasCard = dynamic(
  () => import("@/components/MathCanvasCard").then((m) => m.MathCanvasCard),
  { ssr: false }
);
const MathCanvasModal = dynamic(
  () => import("@/components/MathCanvasModal").then((m) => m.MathCanvasModal),
  { ssr: false }
);
import { AiPersona } from "@/lib/firestore-personas";
import { useLanguage } from "@/lib/language-context";
import { StructuredTableData, tableToTsv } from "@/lib/structured-table";
import { MathCanvasData } from "@/lib/math-canvas";
import { markdownToCleanPlainText } from "@/lib/plain-text";

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
  tables?: StructuredTableData[];
  canvases?: MathCanvasData[];
  personaId?: string;
  personaName?: string;
  thinkingStage?: ThinkingStage;
  status: "streaming" | "done" | "error";
  feedback: "up" | "down" | null;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  onRetry: (aiMessageId: string) => void;
  onFeedback: (aiMessageId: string, vote: "up" | "down") => void;
  personas?: AiPersona[];
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
  onExpandTable,
  onExpandCanvas,
}: ChatMessageRowProps) {
  if (msg.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5 w-full">
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
      {/* Persona Profile Avatar above AI response bubble */}
      <div className="mb-1.5 flex items-center">
        <PersonaAvatar
          profileImage={avatarImage}
          alt={avatarAlt}
          sizeClass="w-8 h-8"
        />
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

      {/* 4 Uniform Action Buttons under completed AI responses only */}
      {msg.status !== "streaming" && (
        <div className="mt-2.5 flex items-center gap-1">
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
        </div>
      )}
    </div>
  );
});

export function ChatMessageList({
  messages,
  onRetry,
  onFeedback,
  personas = [],
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
