"use client";

import React from "react";
import { Compass } from "lucide-react";
import { MathCanvasData } from "@/lib/math-canvas";
import { MathCanvasView } from "@/components/MathCanvasView";
import { useLanguage } from "@/lib/language-context";

interface MathCanvasCardProps {
  canvas: MathCanvasData;
  onExpand: (canvas: MathCanvasData) => void;
}

export function MathCanvasCard({ canvas, onExpand }: MathCanvasCardProps) {
  const { language } = useLanguage();

  return (
    <div className="my-3 w-full rounded-2xl border border-[#E5E3DC] bg-white overflow-hidden">
      {/* Compact Header Strip */}
      <div className="px-3.5 py-2.5 border-b border-[#E5E3DC] bg-[#FAF9F5] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Compass className="w-4 h-4 text-[#6B6A65] shrink-0" />
          <h4 className="text-[13.5px] font-semibold text-[#1F1E1D] truncate">
            {canvas.title}
          </h4>
        </div>
        <span className="text-[11.5px] text-[#6B6A65] tabular-nums whitespace-nowrap shrink-0">
          {canvas.subject
            ? canvas.subject
            : language === "en"
              ? `X:[${canvas.xMin},${canvas.xMax}] Y:[${canvas.yMin},${canvas.yMax}]`
              : `X:[${canvas.xMin},${canvas.xMax}] Y:[${canvas.yMin},${canvas.yMax}]`}
        </span>
      </div>

      {/* Interactive Blank-Paper Coordinate Canvas */}
      <MathCanvasView
        canvas={canvas}
        mode="card"
        onExpand={() => onExpand(canvas)}
      />

      {/* Optional Summary Footer */}
      {canvas.summary && (
        <div className="px-3.5 py-2 border-t border-[#E5E3DC] bg-[#FAF9F5]/80 text-[12px] text-[#6B6A65]">
          {canvas.summary}
        </div>
      )}
    </div>
  );
}
