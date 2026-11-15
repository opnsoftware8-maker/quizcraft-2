"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Shuffle,
  X,
  Sliders,
  CheckCircle2,
  Lightbulb,
  Target,
  Globe,
  Trophy,
  Calculator,
  Scale,
  Zap,
} from "lucide-react";
import {
  getExamPromptExamples,
  getPopularPromptPresets,
} from "@/constants/examPrompts";
import { useLanguage } from "@/lib/language-context";

const PRESET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Globe,
  Trophy,
  Calculator,
  Scale,
  Zap,
};

interface PromptInputWithAnimatedPlaceholderProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function PromptInputWithAnimatedPlaceholder({
  value,
  onChange,
  id = "custom-prompt-input",
  label,
  description,
  disabled = false,
}: PromptInputWithAnimatedPlaceholderProps) {
  const { language } = useLanguage();
  const examPromptExamples = getExamPromptExamples(language);
  const popularPresets = getPopularPromptPresets(language);

  const defaultLabel =
    language === "en"
      ? "Special Conditions / Custom Exam Prompt"
      : "เงื่อนไขพิเศษ / พรอมต์โจทย์ (Custom Exam Prompt)";
  const defaultDesc =
    language === "en"
      ? "Specify exam question style, difficulty tone, tricky distractors, or scenario format grounded in the text"
      : "ระบุสไตล์ข้อสอบ, ระดับความยาก, ช้อยส์ลวง หรือรูปแบบคำถามที่ต้องการอิงจากเนื้อหา";

  const resolvedLabel = label ?? defaultLabel;
  const resolvedDesc = description ?? defaultDesc;

  const [displayedText, setDisplayedText] = useState<string>("");
  const [isCursorVisible, setIsCursorVisible] = useState<boolean>(true);
  const [currentPromptIndex, setCurrentPromptIndex] = useState<number>(0);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // References to keep animation loop safe across renders
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cursorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<{
    index: number;
    subIndex: number;
    isDeleting: boolean;
  }>({
    index: 0,
    subIndex: 0,
    isDeleting: false,
  });

  // Cursor blink interval
  useEffect(() => {
    cursorIntervalRef.current = setInterval(() => {
      setIsCursorVisible((prev) => !prev);
    }, 450);

    return () => {
      if (cursorIntervalRef.current) clearInterval(cursorIntervalRef.current);
    };
  }, []);

  // Pick initial random prompt index and run typewriter effect after mount
  useEffect(() => {
    let isCancelled = false;
    const initialRandomIndex = Math.floor(
      Math.random() * examPromptExamples.length
    );

    const tick = () => {
      if (isCancelled) return;
      const { index, subIndex, isDeleting } = stateRef.current;
      const fullText = examPromptExamples[index] || "";

      if (!isDeleting) {
        // Typing forward
        if (subIndex < fullText.length) {
          stateRef.current.subIndex = subIndex + 1;
          setDisplayedText(fullText.substring(0, subIndex + 1));
          typingTimeoutRef.current = setTimeout(tick, 45 + Math.random() * 25);
        } else {
          // Finished typing phrase: pause so user can read with blinking cursor
          typingTimeoutRef.current = setTimeout(() => {
            stateRef.current.isDeleting = true;
            tick();
          }, 2400);
        }
      } else {
        // Deleting backward
        if (subIndex > 0) {
          stateRef.current.subIndex = subIndex - 1;
          setDisplayedText(fullText.substring(0, subIndex - 1));
          typingTimeoutRef.current = setTimeout(tick, 20);
        } else {
          // Finished deleting: pick another random index (different from current)
          let nextIndex = Math.floor(Math.random() * examPromptExamples.length);
          if (nextIndex === index) {
            nextIndex = (index + 1) % examPromptExamples.length;
          }
          stateRef.current.index = nextIndex;
          stateRef.current.isDeleting = false;
          setCurrentPromptIndex(nextIndex);
          typingTimeoutRef.current = setTimeout(tick, 400);
        }
      }
    };

    const startTimer = setTimeout(() => {
      if (isCancelled) return;
      setIsMounted(true);
      setCurrentPromptIndex(initialRandomIndex);
      stateRef.current.index = initialRandomIndex;
      stateRef.current.subIndex = 0;
      stateRef.current.isDeleting = false;
      tick();
    }, 100);

    return () => {
      isCancelled = true;
      clearTimeout(startTimer);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [examPromptExamples]);

  // Manually jump to a random example
  const handleRandomize = () => {
    let nextIndex = Math.floor(Math.random() * examPromptExamples.length);
    if (nextIndex === currentPromptIndex) {
      nextIndex = (currentPromptIndex + 1) % examPromptExamples.length;
    }
    setCurrentPromptIndex(nextIndex);
    stateRef.current.index = nextIndex;
    stateRef.current.subIndex = 0;
    stateRef.current.isDeleting = false;
    setDisplayedText("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  // Adopt current animated prompt into the input
  const handleUseCurrentExample = () => {
    const currentFullText =
      examPromptExamples[currentPromptIndex] || examPromptExamples[0];
    onChange(currentFullText);
  };

  const handleApplyPreset = (presetText: string) => {
    onChange(presetText);
  };

  return (
    <div className="space-y-2.5">
      {/* Label and Helper Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-slate-700" />
          <label htmlFor={id} className="text-xs sm:text-sm font-semibold text-slate-900">
            {resolvedLabel}
          </label>
        </div>
        <div className="flex items-center space-x-2">
          {!value && isMounted && (
            <button
              type="button"
              onClick={handleUseCurrentExample}
              className="inline-flex items-center text-xs font-semibold text-slate-900 hover:text-black bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              title={language === "en" ? "Use currently displayed example" : "ใช้ข้อความตัวอย่างที่กำลังแสดง"}
            >
              <Lightbulb className="w-3.5 h-3.5 mr-1 text-amber-600" />
              {language === "en" ? "Use this example" : "ใช้ข้อความนี้"}
            </button>
          )}
          <button
            type="button"
            onClick={handleRandomize}
            className="inline-flex items-center text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2 py-1 rounded transition-colors cursor-pointer"
            title={language === "en" ? "Shuffle another example prompt" : "สุ่มข้อความตัวอย่างถัดไป"}
          >
            <Shuffle className="w-3.5 h-3.5 mr-1" />
            <span>{language === "en" ? "Shuffle" : "สุ่มตัวอย่างใหม่"}</span>
          </button>
        </div>
      </div>

      {resolvedDesc && (
        <p className="text-xs text-slate-500 leading-relaxed">
          {resolvedDesc}
        </p>
      )}

      {/* Input container with dynamic typewriter overlay */}
      <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 shadow-2xs transition-all overflow-hidden">
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={3}
          className="w-full p-3 sm:p-3.5 text-xs sm:text-sm text-slate-900 bg-transparent outline-none resize-none leading-relaxed relative z-10 font-normal placeholder-transparent"
          placeholder={language === "en" ? "Type exam prompt or condition..." : "พิมพ์เงื่อนไขหรือพรอมต์..."}
        />

        {/* Animated Placeholder with blinking underscore cursor */}
        {!value && (
          <div
            onClick={() => {
              const el = document.getElementById(id);
              if (el) el.focus();
            }}
            className="absolute top-3 left-3 right-3 text-xs sm:text-sm text-slate-400 pointer-events-none select-none z-0 flex items-start flex-wrap leading-relaxed overflow-hidden"
          >
            <span>
              {isMounted ? displayedText : (language === "en" ? "e.g. Focus on realistic scenario-based case studies..." : "เช่น เน้นข้อสอบวิเคราะห์สถานการณ์จำลอง (Case Study)...")}
            </span>
            <span
              className={`inline-block font-extrabold text-slate-700 ml-0.5 animate-cursor-blink transition-opacity duration-100 ${
                isCursorVisible ? "opacity-100" : "opacity-0"
              }`}
              style={{ fontSize: "1.1em", lineHeight: 1 }}
            >
              _
            </span>
          </div>
        )}

        {/* Action icons inside the box */}
        <div className="absolute right-2 bottom-2 z-20 flex items-center space-x-1">
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title={language === "en" ? "Clear prompt" : "ล้างข้อความพรอมต์"}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Preset Badges */}
      <div className="pt-1">
        <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center">
          <Sparkles className="w-3 h-3 mr-1 text-slate-600" />
          <span>{language === "en" ? "Popular Presets — click to apply:" : "เงื่อนไขยอดนิยม แตะเพื่อใส่ทันที:"}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {popularPresets.map((item) => {
            const isSelected = value === item.prompt;
            const IconComponent = item.iconName ? PRESET_ICONS[item.iconName] : null;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleApplyPreset(item.prompt)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-2xs font-semibold"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                {isSelected ? (
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                ) : (
                  IconComponent && (
                    <IconComponent className="w-3 h-3 shrink-0 text-slate-500" />
                  )
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
