"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpenCheck,
  History,
  RotateCcw,
  Key,
  BarChart3,
  Activity,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Layers,
  Globe,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  getAnalyticsData,
  fetchRealAnalytics,
} from "@/lib/analytics";
import { useLanguage } from "@/lib/language-context";

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenApiKeyModal: () => void;
  onOpenAnalytics: () => void;
  onOpenFeedback: () => void;
  onReset: () => void;
  hasActiveSession: boolean;
  historyCount: number;
  hasCustomKey: boolean;
  isAnalyticsView?: boolean;
}

export function Header({
  onOpenHistory,
  onOpenApiKeyModal,
  onOpenAnalytics,
  onOpenFeedback,
  onReset,
  hasActiveSession,
  historyCount,
  hasCustomKey,
  isAnalyticsView = false,
}: HeaderProps) {
  const { language, toggleLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const [quickOnline, setQuickOnline] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        return getAnalyticsData().activeOnlineUsers || 1;
      } catch (e) {
        return 1;
      }
    }
    return 1;
  });

  const toggleOpen = () => {
    const next = !isOpen;
    if (next) {
      try {
        setQuickOnline(getAnalyticsData().activeOnlineUsers || 1);
        fetchRealAnalytics().then((res) => {
          if (res && res.activeOnlineUsers) {
            setQuickOnline(res.activeOnlineUsers);
          }
        }).catch(() => {});
      } catch (e) {
        // ignore
      }
    }
    setIsOpen(next);
  };

  // Close drawer on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <header className="bg-white border-b border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.04)] sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Zone 1: Logo & Brand (Clean single wordmark) */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none group"
            onClick={onReset}
            title={language === "en" ? "Return to QuizCraft home" : "กลับสู่หน้าหลัก QuizCraft"}
          >
            <div className="w-9 h-9 rounded-lg bg-[#0F172A] flex items-center justify-center text-white shadow-xs group-hover:bg-[#1E293B] transition-colors">
              <BookOpenCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-[#0F172A] tracking-tight group-hover:text-[#2563EB] transition-colors">
                QuizCraft
              </span>
              <p className="text-[11px] text-[#64748B] hidden lg:block -mt-0.5">
                {t("appTagline")}
              </p>
            </div>
          </div>

          {/* Zone 2: Desktop & Tablet Direct Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              type="button"
              onClick={onOpenHistory}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              title={language === "en" ? "View exam history" : "ดูประวัติการทำข้อสอบ"}
            >
              <History className="w-3.5 h-3.5 text-[#64748B]" />
              <span>{t("navHistory")}</span>
              {historyCount > 0 && (
                <span className="text-[10px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.2 rounded-full">
                  {historyCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenAnalytics}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                isAnalyticsView
                  ? "bg-[#EFF6FF] text-[#1D4ED8]"
                  : "text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
              title={language === "en" ? "View system analytics" : "เปิดดูสถิติระบบ"}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0284C7] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0284C7]"></span>
              </span>
              <span>{t("navAnalytics")}</span>
              <span className="text-[11px] font-mono text-[#0284C7]">
                {quickOnline}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenApiKeyModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              title={language === "en" ? "Set custom Gemini API key" : "ตั้งค่า Gemini API Key"}
            >
              <Key
                className={`w-3.5 h-3.5 ${
                  hasCustomKey ? "text-[#059669]" : "text-[#64748B]"
                }`}
              />
              <span>{t("navApiKey")}</span>
              {hasCustomKey && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" title={t("apiKeyStatusCustom")} />
              )}
            </button>

            {/* Language Switcher Button (Desktop & Tablet) */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer ml-1"
              title={t("navLangTitle")}
              aria-label={t("navLangTitle")}
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span className={language === "en" ? "font-bold text-slate-900" : "text-slate-400"}>EN</span>
              <span className="text-slate-300 text-[10px]">/</span>
              <span className={language === "th" ? "font-bold text-slate-900" : "text-slate-400"}>TH</span>
            </button>
          </nav>

          {/* Zone 3: Desktop Actions & Mobile Menu Button */}
          <div className="flex items-center space-x-2">
            {/* Language Switcher (Mobile button) */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="md:hidden inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title={t("navLangTitle")}
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-bold">{language === "en" ? "EN" : "ไทย"}</span>
            </button>

            {hasActiveSession && (
              <button
                type="button"
                onClick={onReset}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                title={language === "en" ? "Reset / New session" : "กลับสู่หน้าหลัก / เคลียร์เซสชัน"}
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
                <span>{t("navReset")}</span>
              </button>
            )}

            {/* Top-right Hamburger Menu Toggle */}
            <button
              type="button"
              id="header-hamburger-menu-btn"
              onClick={toggleOpen}
              className={`relative p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                isOpen
                  ? "bg-[#0F172A] text-white border-[#0F172A]"
                  : "bg-white text-[#0F172A] hover:bg-[#F8FAFC] border-[#E2E8F0]"
              }`}
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                {isOpen && (
                  <line x1="4" y1="4" x2="20" y2="20" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
                )}
              </svg>
              {!isOpen && historyCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#2563EB] rounded-full"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Menu Drawer Card with Smooth Motion */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden no-print">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-[2px]"
            />

            {/* Sliding Card Container from Right */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: "100%", opacity: 0.5 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="w-screen max-w-sm bg-white shadow-2xl border-l border-[#E2E8F0] flex flex-col"
              >
                {/* Drawer Header */}
                <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-white">
                      <BookOpenCheck className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-base text-[#0F172A] block leading-tight">
                        QuizCraft
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        {t("appTagline")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                    title={language === "en" ? "Close menu" : "ปิดการ์ดเมนู"}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <line
                        x1="4"
                        y1="6"
                        x2="20"
                        y2="6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="4"
                        y1="12"
                        x2="20"
                        y2="12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="4"
                        y1="18"
                        x2="20"
                        y2="18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="4"
                        y1="4"
                        x2="20"
                        y2="20"
                        stroke="#0284C7"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                {/* Drawer Body Items */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {/* Language Switcher in Drawer */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                      <Globe className="w-4 h-4 text-slate-500" />
                      <span>{t("navLangTitle")}</span>
                    </div>
                    <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => toggleLanguage()}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                          language === "en" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleLanguage()}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                          language === "th" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        ไทย
                      </button>
                    </div>
                  </div>

                  {/* Item 1: Web Analytics Dashboard (Highlight) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenAnalytics();
                    }}
                    className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer group relative ${
                      isAnalyticsView
                        ? "border-[#0284C7] bg-[#F0F9FF] ring-1 ring-[#0284C7]"
                        : "border-[#BAE6FD] bg-[#F0F9FF]/70 hover:bg-[#F0F9FF] hover:border-[#0284C7]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-[#0284C7] text-white flex items-center justify-center shadow-xs">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-white border border-[#BAE6FD] text-[11px] font-semibold text-[#0369A1]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]"></span>
                        <span>{t("navAnalytics")}</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-sm font-bold text-[#0F172A] flex items-center justify-between">
                        <span>{language === "en" ? "Web Traffic & Analytics" : "ระบบสถิติการเข้าชมเว็บ"}</span>
                        <ChevronRight className="w-4 h-4 text-[#0284C7] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                        {language === "en"
                          ? "Real-time active users, historical session charts, and cumulative visits"
                          : "กราฟประวัติการเข้าใช้งาน, จำนวนผู้เข้าใช้ตอนนี้ (ออนไลน์เรียลไทม์), และยอดสะสม"}
                      </p>
                    </div>

                    {/* Quick Stat Pill */}
                    <div className="mt-3 pt-3 border-t border-[#BAE6FD]/60 flex items-center justify-between text-xs">
                      <span className="text-[#64748B] flex items-center space-x-1">
                        <Activity className="w-3.5 h-3.5 text-[#0284C7]" />
                        <span>{language === "en" ? "Active Now:" : "ออนไลน์ตอนนี้:"}</span>
                      </span>
                      <span className="font-bold text-[#0369A1]">
                        {quickOnline} {language === "en" ? "users" : "คน"}
                      </span>
                    </div>
                  </button>

                  {/* Item 2: Exam History */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenHistory();
                    }}
                    className="w-full p-4 rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] flex items-center justify-center">
                        <History className="w-5 h-5 text-[#334155]" />
                      </div>
                      {historyCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[11px] font-bold border border-[#DBEAFE]">
                          {historyCount} {language === "en" ? "sets" : "ชุด"}
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-bold text-[#0F172A] flex items-center justify-between">
                        <span>{t("historyTitle")}</span>
                        <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-xs text-[#64748B] mt-1">
                        {language === "en"
                          ? "Review past test results, scores, and answered questions"
                          : "ดูผลสอบย้อนหลัง บันทึกคะแนน และชุดข้อสอบที่เคยทำ"}
                      </p>
                    </div>
                  </button>

                  {/* Item 3: API Key Configuration */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenApiKeyModal();
                    }}
                    className="w-full p-4 rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] flex items-center justify-center">
                        <Key className="w-5 h-5 text-[#334155]" />
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          hasCustomKey
                            ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                            : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]"
                        }`}
                      >
                        {hasCustomKey
                          ? language === "en" ? "Custom Key" : "ใช้งานคีย์ส่วนตัว"
                          : language === "en" ? "System Default" : "คีย์มาตรฐานระบบ"}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-bold text-[#0F172A] flex items-center justify-between">
                        <span>{t("apiKeyTitle")}</span>
                        <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-xs text-[#64748B] mt-1">
                        {language === "en"
                          ? "Configure personal Gemini API Key for higher rate limits"
                          : "ใส่ Gemini API Key ส่วนตัวเพื่อการใช้งานที่ต่อเนื่อง"}
                      </p>
                    </div>
                  </button>

                  {/* Item 4: Send Feedback */}
                  <button
                    type="button"
                    id="menu-send-feedback-btn"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenFeedback();
                    }}
                    className="w-full p-4 rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-[#0F172A] text-white flex items-center justify-center shadow-xs">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-bold text-[#0F172A] flex items-center justify-between">
                        <span>{language === "en" ? "Send Feedback" : "ส่งคำแนะนำ"}</span>
                        <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-xs text-[#64748B] mt-1">
                        {language === "en"
                          ? "Share suggestions, report bugs, or send a message to the team"
                          : "ส่งข้อเสนอแนะ ติชม หรือแจ้งปัญหาการใช้งานถึงผู้พัฒนาโดยตรง"}
                      </p>
                    </div>
                  </button>
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-6 border-t border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
                  {hasActiveSession && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onReset();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t("navReset")}</span>
                    </button>
                  )}

                  <div className="text-center text-[11px] text-[#94A3B8]">
                    QuizCraft Studio • v2.0
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
