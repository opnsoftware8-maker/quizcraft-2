"use client";

import React, { useState, useEffect } from "react";
import { X, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  getStoredCustomApiKey,
  setStoredCustomApiKey,
  removeStoredCustomApiKey,
  isValidGeminiApiKeyFormat,
} from "@/lib/custom-key";
import { useLanguage } from "@/lib/language-context";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyChange: (key: string | null) => void;
}

export function ApiKeyModal({ isOpen, onClose, onKeyChange }: ApiKeyModalProps) {
  const { language } = useLanguage();
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const current = getStoredCustomApiKey();
      setSavedKey(current);
      setApiKeyInput(current || "");
      setVerifyStatus({ type: "idle", message: "" });
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setVerifyStatus({
        type: "error",
        message:
          language === "en"
            ? "Please enter your Gemini API Key before testing."
            : "กรุณากรอก Gemini API Key ก่อนทำการตรวจสอบ",
      });
      return;
    }

    if (!isValidGeminiApiKeyFormat(trimmed)) {
      setVerifyStatus({
        type: "error",
        message:
          language === "en"
            ? "Invalid format: Gemini API Keys typically begin with 'AQ.' or 'AIza...'."
            : "รูปแบบไม่ถูกต้อง: Gemini API Key มักเริ่มต้นด้วย 'AQ.' หรือ 'AIza...'",
      });
      return;
    }

    setIsVerifying(true);
    setVerifyStatus({ type: "idle", message: "" });

    try {
      const res = await fetch("/api/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        setStoredCustomApiKey(trimmed);
        setSavedKey(trimmed);
        onKeyChange(trimmed);
        setVerifyStatus({
          type: "success",
          message:
            language === "en"
              ? "Connection verified. Your custom API Key has been saved."
              : "เชื่อมต่อสำเร็จ บันทึก API Key ส่วนตัวเรียบร้อยแล้ว",
        });
      } else {
        setVerifyStatus({
          type: "error",
          message:
            data.error ||
            (language === "en"
              ? "Could not verify this API key. Please check your credentials."
              : "ไม่สามารถเชื่อมต่อด้วย API Key นี้ได้ กรุณาตรวจสอบรหัสใหม่อีกครั้ง"),
        });
      }
    } catch (err: any) {
      setVerifyStatus({
        type: "error",
        message:
          err.message ||
          (language === "en"
            ? "An error occurred during verification. Please try again."
            : "เกิดข้อผิดพลาดในการตรวจสอบ กรุณาลองใหม่"),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveKey = () => {
    removeStoredCustomApiKey();
    setSavedKey(null);
    setApiKeyInput("");
    onKeyChange(null);
    setVerifyStatus({
      type: "idle",
      message: "",
    });
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 6) + "••••••••" + key.slice(-4);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1E1D]/30 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF9F5] rounded-2xl border border-[#E5E3DC] shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-modal-title"
      >
        {/* Minimal Header */}
        <div className="px-6 py-4 border-b border-[#E5E3DC] flex items-center justify-between">
          <h3
            id="api-key-modal-title"
            className="text-base font-semibold text-[#1F1E1D]"
          >
            Gemini API Key
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer"
            aria-label={language === "en" ? "Close" : "ปิด"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-[#1F1E1D]">
          {/* Simple Heading & Summary (replaces previous status and 2-column cards) */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold text-[#1F1E1D]">
              {savedKey
                ? language === "en"
                  ? "Custom API Key Active"
                  : "กำลังใช้งาน API Key ส่วนตัว"
                : language === "en"
                ? "Private Quota & Local Storage"
                : "ใช้งานโควตาส่วนตัวและบันทึกในเบราว์เซอร์"}
            </h4>
            <p className="text-xs leading-relaxed text-[#6B6A65]">
              {savedKey
                ? `${language === "en" ? "Active key: " : "คีย์ที่ใช้งาน: "}${maskKey(savedKey)}`
                : language === "en"
                ? "Add your own free Gemini API Key to use your personal quota. Stored only in this browser."
                : "ระบุ Gemini API Key ของคุณเพื่อใช้โควตาส่วนตัว ข้อมูลจะบันทึกไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น"}
            </p>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="gemini-api-key-input"
                className="text-xs font-medium text-[#1F1E1D]"
              >
                {language === "en" ? "API Key" : "รหัส API Key"}
              </label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-[#6B6A65] hover:text-[#1F1E1D] underline underline-offset-2 transition-colors cursor-pointer"
              >
                {language === "en" ? "Get API Key" : "รับคีย์ฟรีจาก Google AI Studio"}
              </a>
            </div>

            <div className="relative">
              <input
                id="gemini-api-key-input"
                type={showPassword ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setVerifyStatus({ type: "idle", message: "" });
                }}
                placeholder="AQ.Ab8RN6... / AIza..."
                className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-[#DFDDD6] bg-white text-[#1F1E1D] text-[16px] font-mono placeholder:text-[#8C8A84] focus:outline-none focus:border-[#1F1E1D] transition-colors"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#6B6A65] hover:text-[#1F1E1D] transition-colors cursor-pointer"
                aria-label={
                  showPassword
                    ? language === "en"
                      ? "Hide key"
                      : "ซ่อนรหัส"
                    : language === "en"
                    ? "Show key"
                    : "แสดงรหัส"
                }
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Simple Monochrome Feedback Text */}
          {verifyStatus.type !== "idle" && (
            <p className="text-xs leading-relaxed text-[#1F1E1D] bg-[#EFECE4] px-3.5 py-2.5 rounded-xl border border-[#E5E3DC]">
              {verifyStatus.message}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTestAndSave}
              disabled={isVerifying || !apiKeyInput.trim()}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-[#1F1E1D] hover:bg-[#33322F] disabled:bg-[#DFDDD6] disabled:text-[#8C8A84] text-white text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>
                    {language === "en" ? "Verifying..." : "กำลังตรวจสอบ..."}
                  </span>
                </>
              ) : (
                <span>
                  {language === "en" ? "Verify & Save" : "ตรวจสอบและบันทึก"}
                </span>
              )}
            </button>

            {savedKey && (
              <button
                type="button"
                onClick={handleRemoveKey}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-[#EFECE4] hover:bg-[#E5E3DC] text-[#1F1E1D] text-sm font-medium rounded-xl transition-colors cursor-pointer"
              >
                {language === "en" ? "Remove" : "ลบคีย์"}
              </button>
            )}
          </div>

          {/* Minimal Text Guide Toggle */}
          <div className="pt-2 border-t border-[#E5E3DC]">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between text-xs font-medium text-[#6B6A65] hover:text-[#1F1E1D] py-1 transition-colors cursor-pointer"
            >
              <span>
                {language === "en"
                  ? "How to get a Gemini API Key"
                  : "วิธีขอรับ Gemini API Key"}
              </span>
              <span>
                {showGuide
                  ? language === "en"
                    ? "Hide"
                    : "ซ่อน"
                  : language === "en"
                  ? "Show"
                  : "ดูวิธีทำ"}
              </span>
            </button>

            {showGuide && (
              <ol className="mt-2.5 pl-4 list-decimal space-y-1.5 text-xs text-[#6B6A65] leading-relaxed">
                <li>
                  {language === "en" ? "Open " : "เข้าไปที่ "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[#1F1E1D] underline underline-offset-2"
                  >
                    aistudio.google.com/apikey
                  </a>
                </li>
                <li>
                  {language === "en"
                    ? "Sign in with your Google account."
                    : "เข้าสู่ระบบด้วยบัญชี Google ของคุณ"}
                </li>
                <li>
                  {language === "en"
                    ? 'Click "Create API key" and copy your key (e.g. AQ.... or AIza...).'
                    : 'กด "Create API key" แล้วคัดลอกรหัสคีย์ที่ได้ (เช่น AQ.... หรือ AIza...)'}
                </li>
                <li>
                  {language === "en"
                    ? "Paste the key above and click Verify & Save."
                    : "นำมาวางในช่องด้านบนแล้วกดตรวจสอบและบันทึก"}
                </li>
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
