"use client";

import React, { useEffect, useRef } from "react";
import katex from "katex";

interface MathLatexLabelProps {
  content: string;
  isLatex?: boolean;
  displayMode?: boolean;
  className?: string;
}

export function MathLatexLabel({
  content,
  isLatex = false,
  displayMode = false,
  className = "",
}: MathLatexLabelProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isLatex) return;

    try {
      katex.render(content, el, {
        throwOnError: false,
        displayMode,
        strict: false,
        trust: false,
      });
    } catch {
      el.textContent = content;
    }
  }, [content, isLatex, displayMode]);

  if (!isLatex) {
    return <span className={className}>{content}</span>;
  }

  return <span ref={containerRef} className={className} />;
}
