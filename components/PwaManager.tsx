"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

function subscribeOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerOnlineSnapshot() {
  return true;
}

export function PwaManager() {
  const { language } = useLanguage();
  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineSnapshot,
    getServerOnlineSnapshot
  );

  useEffect(() => {
    // Capture beforeinstallprompt globally as early as possible
    const capturePrompt = (e: Event) => {
      e.preventDefault();
      (
        window as unknown as {
          __quizcraftDeferredInstallPrompt?: Event | null;
        }
      ).__quizcraftDeferredInstallPrompt = e;
      window.dispatchEvent(new Event("quizcraft-pwa-prompt-change"));
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);

    // Register Service Worker for PWA installability
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("Service Worker registration failed:", err);
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#1F1E1D] px-3.5 py-2 text-xs font-medium text-[#FAF9F5] shadow-lg border border-[#3D3C38]"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        {language === "en"
          ? "You are offline — some features require internet."
          : "คุณกำลังออฟไลน์ — บางฟีเจอร์ต้องเชื่อมต่ออินเทอร์เน็ต"}
      </span>
    </div>
  );
}
