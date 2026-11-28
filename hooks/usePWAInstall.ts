"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __quizcraftDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

function subscribeStandalone(callback: () => void) {
  const mediaQuery = window.matchMedia("(display-mode: standalone)");
  window.addEventListener("appinstalled", callback);
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", callback);
  }
  return () => {
    window.removeEventListener("appinstalled", callback);
    if (typeof mediaQuery.removeEventListener === "function") {
      mediaQuery.removeEventListener("change", callback);
    }
  };
}

function getStandaloneSnapshot() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function subscribeNoop() {
  return () => {};
}

function getIsIOSSnapshot() {
  const ua = window.navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function getFalseSnapshot() {
  return false;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const isInstalled = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getFalseSnapshot
  );

  const isIOS = useSyncExternalStore(
    subscribeNoop,
    getIsIOSSnapshot,
    getFalseSnapshot
  );

  useEffect(() => {
    const syncPrompt = () => {
      setDeferredPrompt(window.__quizcraftDeferredInstallPrompt ?? null);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__quizcraftDeferredInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      window.__quizcraftDeferredInstallPrompt = null;
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("quizcraft-pwa-prompt-change", syncPrompt);

    // Sync once asynchronously in case prompt fired prior to mount
    const raf = window.requestAnimationFrame(syncPrompt);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("quizcraft-pwa-prompt-change", syncPrompt);
    };
  }, []);

  const install = useCallback(async () => {
    const promptEvent =
      deferredPrompt || window.__quizcraftDeferredInstallPrompt;
    if (!promptEvent) return false;

    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    window.__quizcraftDeferredInstallPrompt = null;
    setDeferredPrompt(null);

    return outcome === "accepted";
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}
