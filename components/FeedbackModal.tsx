"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { sendUserFeedback } from "@/lib/analytics";
import { useLanguage } from "@/lib/language-context";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { language } = useLanguage();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    text: string;
  }>({ type: "idle", text: "" });

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleClose = () => {
    setStatus({ type: "idle", text: "" });
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setStatus({
        type: "error",
        text:
          language === "en"
            ? "Please enter your message before sending."
            : "กรุณาพิมพ์ข้อความคำแนะนำก่อนกดส่ง",
      });
      return;
    }

    setIsSending(true);
    setStatus({ type: "idle", text: "" });

    try {
      await sendUserFeedback(trimmed);
      setMessage("");
      setStatus({
        type: "success",
        text:
          language === "en"
            ? "Thank you! Your feedback has been sent."
            : "ส่งคำแนะนำเรียบร้อยแล้ว ขอบคุณสำหรับความคิดเห็นของคุณ",
      });
    } catch {
      setStatus({
        type: "error",
        text:
          language === "en"
            ? "Unable to send feedback right now. Please try again."
            : "ไม่สามารถส่งข้อความได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="feedback-modal-title"
                className="font-bold text-slate-900 text-base leading-tight"
              >
                {language === "en" ? "Send Feedback" : "ส่งคำแนะนำ"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === "en"
                  ? "Share suggestions, report bugs, or request features"
                  : "แนะนำติชม แจ้งปัญหา หรือเสนอฟีเจอร์เพิ่มเติม"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label={language === "en" ? "Close" : "ปิด"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="feedback-message-input"
              className="block text-xs sm:text-sm font-semibold text-slate-800"
            >
              {language === "en" ? "Your message" : "ข้อความคำแนะนำ / ฟีดแบค"}
            </label>
            <textarea
              ref={inputRef}
              id="feedback-message-input"
              rows={5}
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                language === "en"
                  ? "Write your thoughts, suggestions, or issues you encountered..."
                  : "พิมพ์คำแนะนำ ข้อเสนอแนะ หรือสิ่งที่อยากให้ปรับปรุงเพิ่มเติม..."
              }
              className="w-full p-3.5 text-sm text-slate-900 bg-slate-50/70 focus:bg-white rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 outline-hidden transition-all resize-y min-h-[120px]"
              disabled={isSending}
            />
          </div>

          {status.type === "error" && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{status.text}</span>
            </div>
          )}

          {status.type === "success" && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{status.text}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {language === "en" ? "Close" : "ปิด"}
            </button>
            <button
              id="feedback-submit-btn"
              type="submit"
              disabled={isSending || !message.trim()}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center space-x-2 transition-all ${
                isSending || !message.trim()
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer"
              }`}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>
                {isSending
                  ? language === "en"
                    ? "Sending..."
                    : "กำลังส่ง..."
                  : language === "en"
                    ? "Send Message"
                    : "ส่งข้อความ"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
