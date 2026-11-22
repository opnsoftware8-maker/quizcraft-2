"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  ClipboardList,
} from "lucide-react";
import { motion } from "motion/react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useLanguage } from "@/lib/language-context";

export interface ChatAttachmentMeta {
  id: string;
  type: "summary" | "quiz";
  title: string;
  subject: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  apiContent?: string;
  attachments?: ChatAttachmentMeta[];
  status: "streaming" | "done" | "error";
  feedback: "up" | "down" | null;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  onRetry: (aiMessageId: string) => void;
  onFeedback: (aiMessageId: string, vote: "up" | "down") => void;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-2.5 px-1" aria-label="AI is typing">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="w-2 h-2 rounded-full bg-[#8C8A84]"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{
            duration: 1.05,
            repeat: Infinity,
            delay: index * 0.18,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function ChatMessageList({
  messages,
  onRetry,
  onFeedback,
}: ChatMessageListProps) {
  const { language } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const prevMessageCountRef = useRef<number>(messages.length);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 140;
  };

  useEffect(() => {
    const isNewMessageAdded = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (isNewMessageAdded) {
      shouldAutoScrollRef.current = true;
    }

    if (shouldAutoScrollRef.current) {
      bottomAnchorRef.current?.scrollIntoView({
        behavior: isNewMessageAdded ? "smooth" : "auto",
        block: "end",
      });
    }
  }, [messages]);

  const handleCopy = async (id: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 1800);
    } catch {
      // ignore clipboard failures
    }
  };

  const actionBtnBase =
    "inline-flex items-center gap-1.5 p-1.5 rounded-lg text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer";

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pt-3 pb-4"
    >
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-5">
        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="flex flex-col items-end gap-1.5 w-full">
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-1.5 max-w-[84%] sm:max-w-[74%]">
                    {msg.attachments.map((att) => {
                      const TypeIcon =
                        att.type === "summary" ? BookOpen : ClipboardList;
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

          const isWaitingFirstChunk =
            msg.status === "streaming" && msg.content.length === 0;
          const isCopied = copiedId === msg.id;

          return (
            <div key={msg.id} className="flex flex-col items-start w-full">
              {isWaitingFirstChunk ? (
                <TypingIndicator />
              ) : (
                <div className="w-full">
                  <MarkdownRenderer content={msg.content} />
                </div>
              )}

              {/* 4 Uniform Action Buttons under completed AI responses only */}
              {msg.status !== "streaming" && (
                <div className="mt-2.5 flex items-center gap-1">
                  {/* 1. Copy */}
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.content)}
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
        })}

        <div ref={bottomAnchorRef} className="h-1 shrink-0" />
      </div>
    </div>
  );
}
