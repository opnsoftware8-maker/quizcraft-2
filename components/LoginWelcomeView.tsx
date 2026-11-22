"use client";

import React from "react";
import { Globe, Chrome, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useFirebase } from "@/lib/firebase-context";

export function LoginWelcomeView() {
  const { language, toggleLanguage } = useLanguage();
  const { signInWithGoogle, isSigningIn, authError, clearAuthError } = useFirebase();

  const topBarItemClass =
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#1F1E1D] hover:bg-[#F0EEE6] transition-colors cursor-pointer whitespace-nowrap shrink-0";

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-[#FAF9F5] text-[#1F1E1D]">
      {/* Top Bar with Language Switcher */}
      <header className="w-full bg-[#FAF9F5]/95 backdrop-blur-xs sticky top-0 z-40">
        <div className="w-full px-3 sm:px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              id="welcome-lang-btn"
              onClick={() => {
                clearAuthError();
                toggleLanguage();
              }}
              className={topBarItemClass}
            >
              <Globe className="w-4 h-4 text-[#1F1E1D] shrink-0" />
              <span>{language === "en" ? "EN / TH" : "TH / EN"}</span>
            </button>
          </div>
          <div aria-hidden="true" />
        </div>
      </header>

      {/* Center Welcome & Google Sign-In Only */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold text-[#1F1E1D] tracking-tight">
            {language === "en" ? "Welcome" : "ยินดีต้อนรับ"}
          </h1>

          <p className="mt-2.5 text-sm text-[#6B6A65] leading-relaxed">
            {language === "en"
              ? "Sign in or sign up with your Google account"
              : "เข้าสู่ระบบหรือสมัครใช้งานด้วยบัญชี Google ของคุณ"}
          </p>

          <button
            type="button"
            id="continue-with-google-btn"
            onClick={signInWithGoogle}
            disabled={isSigningIn}
            className="mt-7 w-full inline-flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white hover:bg-[#F2F0EA] border border-[#DFDDD6] shadow-[0_2px_10px_rgba(31,30,29,0.05)] text-[15px] font-medium text-[#1F1E1D] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSigningIn ? (
              <Loader2 className="w-5 h-5 text-[#1F1E1D] animate-spin shrink-0" />
            ) : (
              <Chrome className="w-5 h-5 text-[#1F1E1D] shrink-0" />
            )}
            <span>
              {isSigningIn
                ? language === "en"
                  ? "Signing in..."
                  : "กำลังเข้าสู่ระบบ..."
                : language === "en"
                ? "Continue with Google"
                : "ดำเนินการต่อด้วยกูเกิ้ล"}
            </span>
          </button>

          {authError && (
            <p className="mt-4 text-xs text-[#1F1E1D] bg-[#EFECE4] border border-[#E5E3DC] rounded-xl px-4 py-2.5 leading-relaxed w-full">
              {authError}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
