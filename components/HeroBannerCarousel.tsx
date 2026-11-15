"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  GraduationCap,
  Layers,
  ArrowRight,
  BrainCircuit,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface BannerSlide {
  id: number;
  badge: string;
  badgeEn: string;
  titleTh: string;
  titleEn: string;
  highlightTh: string;
  highlightEn: string;
  descTh: string;
  descEn: string;
  actionTextTh: string;
  actionTextEn: string;
  actionType: "homework" | "exam";
  bgGradient: string;
  icon: React.ElementType;
}

const SLIDES: BannerSlide[] = [
  {
    id: 1,
    badge: "ติวหนังสือกับ QuizCraft",
    badgeEn: "Study with QuizCraft",
    titleTh: "ทบทวนบทเรียนและเสกข้อสอบ",
    titleEn: "Smart Quiz & Flashcard Generator",
    highlightTh: "เก่งขึ้นในคลิกเดียว",
    highlightEn: "Master Any Subject",
    descTh: "แปลงชีทเรียน เลกเชอร์ หรือสรุปยาวๆ เป็นแบบทดสอบปรนัย แฟลชการ์ดจำแม่น และข้อสอบอัตนัยพร้อมเฉลยละเอียดทันที",
    descEn: "Turn long study notes and lecture PDFs into interactive mock quizzes, spaced-repetition flashcards, and instant test banks.",
    actionTextTh: "เริ่มสร้างข้อสอบ",
    actionTextEn: "Create Quiz Now",
    actionType: "exam",
    bgGradient: "from-[#F0F9FF] via-[#E0F2FE]/40 to-white",
    icon: BookOpen,
  },
  {
    id: 2,
    badge: "วิเคราะห์และแก้โจทย์ปัญหา",
    badgeEn: "Step-by-Step Problem Solver",
    titleTh: "วิเคราะห์โจทย์ แสดงวิธีทำละเอียด",
    titleEn: "Step-by-Step Problem Solutions",
    highlightTh: "เข้าใจจริงทุกขั้นตอน",
    highlightEn: "Understand Every Step",
    descTh: "อัปโหลดภาพโจทย์ปัญหา หรือพิมพ์ข้อความคำถาม ระบบจะช่วยวิเคราะห์และแสดงวิธีทำทีละขั้นตอนอย่างเป็นระบบ ครบถ้วน",
    descEn: "Upload problem images or text questions. AI solves with clear step-by-step reasoning, formulas, and 40+ custom prompt presets.",
    actionTextTh: "แก้โจทย์ปัญหาทันที",
    actionTextEn: "Solve Problem Now",
    actionType: "homework",
    bgGradient: "from-[#F8FAFC] via-[#F0F9FF] to-white",
    icon: HelpCircle,
  },
  {
    id: 3,
    badge: "ครบวงจรการเรียนรู้",
    badgeEn: "All-in-One Learning Cycle",
    titleTh: "แก้โจทย์ปัญหา สรุปบทเรียน สู่แบบทดสอบ",
    titleEn: "Solve -> Summarize -> Test",
    highlightTh: "จำแม่นไม่ลืม",
    highlightEn: "Continuous Mastery",
    descTh: "ได้คำตอบและวิธีทำแล้ว สามารถนำไปสรุปย่อหรือแปลงเป็นแบบทดสอบทบทวนต่อได้ทันทีในระบบเดียว",
    descEn: "Seamless flow from solving problems to generating structured study notes, then creating practice exams in one click.",
    actionTextTh: "ทดลองระบบครบวงจร",
    actionTextEn: "Explore Full Cycle",
    actionType: "homework",
    bgGradient: "from-[#E0F2FE]/60 via-[#F0F9FF] to-white",
    icon: BrainCircuit,
  },
];

interface HeroBannerCarouselProps {
  onSelectAction: (actionType: "homework" | "exam") => void;
}

export function HeroBannerCarousel({ onSelectAction }: HeroBannerCarouselProps) {
  const { language } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // Auto slide every 6 seconds
  useEffect(() => {
    if (!isAutoPlay) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlay]);

  const nextSlide = () => {
    setIsAutoPlay(false);
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const prevSlide = () => {
    setIsAutoPlay(false);
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const slide = SLIDES[currentSlide];
  const IconComponent = slide.icon;

  const badgeText = language === "en" ? slide.badgeEn : slide.badge;
  const titleText = language === "en" ? slide.titleEn : slide.titleTh;
  const highlightText = language === "en" ? slide.highlightEn : slide.highlightTh;
  const descText = language === "en" ? slide.descEn : slide.descTh;
  const actionText = language === "en" ? slide.actionTextEn : slide.actionTextTh;

  return (
    <div
      className="relative rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:border-slate-300 transition-all"
      onMouseEnter={() => setIsAutoPlay(false)}
      onMouseLeave={() => setIsAutoPlay(true)}
    >
      {/* Background Graphic Patterns */}
      <div className={`absolute inset-0 bg-gradient-to-r ${slide.bgGradient} opacity-80 transition-all duration-700`} />

      {/* Main Banner Row (Spacious for Desktop & Tablet) */}
      <div className="relative px-5 sm:px-7 lg:px-8 py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        {/* Left: Icon & Concise Headline + Description */}
        <div className="flex items-start sm:items-center space-x-3.5 sm:space-x-4 min-w-0 flex-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase">
                {badgeText}
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">·</span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                {titleText}{" "}
                <span className="text-blue-600 font-semibold">
                  {highlightText}
                </span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 line-clamp-1 sm:line-clamp-2 max-w-3xl leading-relaxed">
              {descText}
            </p>
          </div>
        </div>

        {/* Right: Action CTA & Integrated Slide Controls */}
        <div className="flex items-center justify-between md:justify-end space-x-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          {/* Slide Indicator Dots */}
          <div className="flex items-center space-x-1.5">
            {SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setIsAutoPlay(false);
                  setCurrentSlide(idx);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentSlide
                    ? "w-6 bg-slate-900"
                    : "w-1.5 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Prev / Next Arrows */}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={prevSlide}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Minimalist Primary CTA Button */}
          <button
            type="button"
            onClick={() => onSelectAction(slide.actionType)}
            className="quizlet-btn-primary px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center space-x-2 cursor-pointer shadow-xs"
          >
            <span>{actionText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
