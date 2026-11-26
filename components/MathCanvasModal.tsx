"use client";

import React, { useEffect } from "react";
import { Compass, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { MathCanvasData } from "@/lib/math-canvas";
import { MathCanvasView } from "@/components/MathCanvasView";
import { useLanguage } from "@/lib/language-context";

interface MathCanvasModalProps {
  canvas: MathCanvasData | null;
  onClose: () => void;
}

function MathCanvasModalPanel({
  canvas,
  onClose,
}: {
  canvas: MathCanvasData;
  onClose: () => void;
}) {
  const { language } = useLanguage();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <motion.div
      key={`math-canvas-modal-backdrop-${canvas.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center sm:p-5 bg-[#1F1E1D]/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={canvas.title}
    >
      <motion.div
        key={`math-canvas-modal-panel-${canvas.id}`}
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full sm:h-[92vh] sm:max-w-6xl sm:rounded-2xl bg-white border border-[#E5E3DC] flex flex-col overflow-hidden shadow-xl"
      >
        {/* Top Modal Header */}
        <div className="px-4 py-3 border-b border-[#E5E3DC] bg-[#FAF9F5] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#EFECE4] border border-[#E5E3DC] flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4 text-[#1F1E1D]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-[#1F1E1D] truncate">
                {canvas.title}
              </h3>
              <p className="text-xs text-[#6B6A65] tabular-nums truncate">
                {canvas.subject ? `${canvas.subject} · ` : ""}
                {language === "en"
                  ? `X:[${canvas.xMin}, ${canvas.xMax}] · Y:[${canvas.yMin}, ${canvas.yMax}] · Drag to pan, pinch or scroll to zoom`
                  : `X:[${canvas.xMin}, ${canvas.xMax}] · Y:[${canvas.yMin}, ${canvas.yMax}] · ลากเพื่อเลื่อน หรือจีบนิ้ว/หมุนเมาส์เพื่อซูม`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl border border-transparent hover:border-[#E5E3DC] hover:bg-[#EFECE4] text-[#6B6A65] hover:text-[#1F1E1D] inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label={language === "en" ? "Close" : "ปิดหน้าต่าง"}
            title={language === "en" ? "Close" : "ปิด"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fullscreen Zoomable Stage */}
        <MathCanvasView canvas={canvas} mode="fullscreen" />

        {canvas.summary && (
          <div className="px-4 py-2.5 border-t border-[#E5E3DC] bg-[#FAF9F5] text-xs text-[#6B6A65] shrink-0">
            {canvas.summary}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function MathCanvasModal({ canvas, onClose }: MathCanvasModalProps) {
  return (
    <AnimatePresence>
      {canvas && (
        <MathCanvasModalPanel
          key={canvas.id}
          canvas={canvas}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}
