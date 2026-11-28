"use client";

import React, { useState } from "react";
import { Download, Share, MoreVertical, X } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useLanguage } from "@/lib/language-context";

interface PWAInstallButtonProps {
  variant?: "topbar" | "menu";
  onAction?: () => void;
}

export function PWAInstallButton({
  variant = "topbar",
  onAction,
}: PWAInstallButtonProps) {
  const { language } = useLanguage();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Never show install UI when already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  // In topbar, only render when native prompt is ready or on iOS Safari
  if (variant === "topbar" && !isInstallable && !isIOS) {
    return null;
  }

  const label = language === "en" ? "Install App" : "ติดตั้งแอป";

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      onAction?.();
      return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      {variant === "menu" ? (
        <button
          type="button"
          id="sidebar-install-pwa-btn"
          onClick={handleClick}
          className="w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-sm font-medium text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer text-left"
        >
          <Download className="w-4 h-4 text-[#1F1E1D] shrink-0" />
          <span>{label}</span>
        </button>
      ) : (
        <button
          type="button"
          id="header-install-pwa-btn"
          onClick={handleClick}
          title={label}
          aria-label={label}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-sm font-medium text-[#1F1E1D] hover:bg-[#F0EEE6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4 text-[#1F1E1D] shrink-0" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1E1D]/40 backdrop-blur-[1px] p-4"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#FAF9F5] border border-[#E5E3DC] p-5 shadow-2xl text-[#1F1E1D]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-[#1F1E1D]">
                {language === "en"
                  ? "Install QuizCraft App"
                  : "ติดตั้งแอป QuizCraft"}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label={language === "en" ? "Close" : "ปิด"}
                className="p-1.5 rounded-lg text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="mt-3 space-y-2.5 text-sm text-[#4A4945] leading-relaxed">
                <p>
                  {language === "en"
                    ? "Install this app on your iPhone or iPad:"
                    : "ขั้นตอนการติดตั้งบน iPhone / iPad:"}
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm">
                  <li>
                    {language === "en" ? (
                      <>
                        Tap the{" "}
                        <span className="inline-flex items-center gap-1 font-semibold text-[#1F1E1D]">
                          <Share className="w-3.5 h-3.5" /> Share
                        </span>{" "}
                        button in Safari.
                      </>
                    ) : (
                      <>
                        แตะปุ่ม{" "}
                        <span className="inline-flex items-center gap-1 font-semibold text-[#1F1E1D]">
                          <Share className="w-3.5 h-3.5" /> แชร์ (Share)
                        </span>{" "}
                        ใน Safari
                      </>
                    )}
                  </li>
                  <li>
                    {language === "en" ? (
                      <>
                        Scroll down and tap{" "}
                        <strong className="text-[#1F1E1D]">
                          Add to Home Screen
                        </strong>
                        .
                      </>
                    ) : (
                      <>
                        เลื่อนลงแล้วแตะ{" "}
                        <strong className="text-[#1F1E1D]">
                          เพิ่มไปยังหน้าจอโฮม
                        </strong>
                      </>
                    )}
                  </li>
                </ol>
              </div>
            ) : (
              <div className="mt-3 space-y-2.5 text-sm text-[#4A4945] leading-relaxed">
                <p>
                  {language === "en"
                    ? "Install this app from Google Chrome:"
                    : "ขั้นตอนการติดตั้งผ่าน Google Chrome:"}
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm">
                  <li>
                    {language === "en" ? (
                      <>
                        Tap the{" "}
                        <span className="inline-flex items-center gap-0.5 font-semibold text-[#1F1E1D]">
                          <MoreVertical className="w-3.5 h-3.5" /> menu
                        </span>{" "}
                        button in the top-right of Chrome.
                      </>
                    ) : (
                      <>
                        กดปุ่ม{" "}
                        <span className="inline-flex items-center gap-0.5 font-semibold text-[#1F1E1D]">
                          <MoreVertical className="w-3.5 h-3.5" /> สามจุด
                        </span>{" "}
                        มุมขวาบนของ Google Chrome
                      </>
                    )}
                  </li>
                  <li>
                    {language === "en" ? (
                      <>
                        Scroll down and select{" "}
                        <strong className="text-[#1F1E1D]">
                          Install app
                        </strong>{" "}
                        or{" "}
                        <strong className="text-[#1F1E1D]">
                          Add to Home screen
                        </strong>
                        .
                      </>
                    ) : (
                      <>
                        เลื่อนลงแล้วกด{" "}
                        <strong className="text-[#1F1E1D]">ติดตั้งแอป</strong>{" "}
                        หรือ{" "}
                        <strong className="text-[#1F1E1D]">เพิ่มทางลัด</strong>
                      </>
                    )}
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowGuideModal(false);
                onAction?.();
              }}
              className="mt-4 w-full rounded-xl bg-[#1F1E1D] py-2.5 text-sm font-medium text-[#FAF9F5] hover:bg-[#33312F] transition-colors cursor-pointer"
            >
              {language === "en" ? "Got it" : "เข้าใจแล้ว"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
