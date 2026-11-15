"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Zap,
  ShieldCheck,
  HelpCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  getStoredCustomApiKey,
  setStoredCustomApiKey,
  removeStoredCustomApiKey,
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
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setVerifyStatus({
        type: "error",
        message:
          language === "en"
            ? "Please enter your Gemini API Key before testing"
            : "กรุณากรอก Gemini API Key ก่อนทำการตรวจสอบ",
      });
      return;
    }

    if (!trimmed.startsWith("AIza")) {
      setVerifyStatus({
        type: "error",
        message:
          language === "en"
            ? "Invalid format: Gemini API Keys typically begin with 'AIza...'"
            : "รูปแบบไม่ถูกต้อง: Gemini API Key มักเริ่มต้นด้วย 'AIza...'",
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
              ? "Connection verified! Your custom API Key has been saved locally."
              : "เชื่อมต่อสำเร็จ! บันทึก API Key ส่วนตัวของคุณเรียบร้อยแล้ว",
        });
      } else {
        setVerifyStatus({
          type: "error",
          message:
            data.error ||
            (language === "en"
              ? "Could not verify connection with this API key. Please check key credentials."
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
    return key.slice(0, 6) + "••••••••••••••••" + key.slice(-4);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base leading-tight">
                {language === "en" ? "Custom Gemini API Key Setup" : "ตั้งค่า Gemini API Key ส่วนตัว"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === "en"
                  ? "Unlock unlimited exam generation and study summaries using your personal quota"
                  : "ปลดล็อกการสร้างข้อสอบและสรุปบทเรียนด้วยโควตาของคุณเอง"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Status Badge */}
          {savedKey ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-emerald-900 flex items-center space-x-2">
                  <span>{language === "en" ? "Active: Using your custom API Key" : "กำลังใช้งาน API Key ส่วนตัวของคุณ (Active)"}</span>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5 font-mono">
                  {maskKey(savedKey)}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  {language === "en"
                    ? "All AI generation requests will use this API key quota directly."
                    : "ทุกคำขอสร้างข้อสอบและสรุปบทเรียนจะใช้โควตาของคีย์นี้โดยตรง"}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-100/90 border border-slate-200 flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">
                  {language === "en" ? "Default: Using system quota" : "กำลังใช้โควตาระบบส่วนกลาง (QuizCraft Shared)"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === "en"
                    ? "Add your free Gemini API key to avoid shared traffic limits."
                    : "หากโควตาส่วนกลางหนาแน่น คุณสามารถนำ API Key ฟรีของคุณมาใส่เพื่อใช้งานได้ทันทีแบบไม่มีสะดุด"}
                </p>
              </div>
            </div>
          )}

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-1.5 text-slate-900 font-semibold text-xs">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === "en" ? "Private Quota" : "โควตาแยกอิสระ"}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {language === "en" ? "Enjoy 1,500 daily free requests from your Google account." : "ใช้โควตาฟรีวันละ 1,500 ครั้งของบัญชี Google คุณเอง"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-1.5 text-slate-900 font-semibold text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{language === "en" ? "100% Client-Side" : "ปลอดภัย 100%"}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {language === "en" ? "Saved only in your browser storage. Never sent to any external DB." : "บันทึกในเบราว์เซอร์เครื่องนี้เท่านั้น ไม่ส่งไปเก็บที่ฐานข้อมูลใดๆ"}
              </p>
            </div>
          </div>

          {/* Input Form */}
          <div className="space-y-2">
            <label
              htmlFor="gemini-api-key-input"
              className="block font-medium text-slate-700 text-xs flex items-center justify-between"
            >
              <span>{language === "en" ? "Paste your Gemini API Key" : "วาง Gemini API Key ของคุณ"}</span>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer noopener"
                className="text-slate-600 hover:text-slate-900 font-normal inline-flex items-center space-x-1 hover:underline cursor-pointer"
              >
                <span>{language === "en" ? "Get free key from Google AI Studio" : "กดรับคีย์ฟรีที่ Google AI Studio"}</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </label>

            <div className="relative">
              <input
                id="gemini-api-key-input"
                type={showPassword ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setVerifyStatus({ type: "idle", message: "" });
                }}
                placeholder="AIzaSy..."
                className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all bg-white"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded transition-colors cursor-pointer"
                title={showPassword ? (language === "en" ? "Hide" : "ซ่อนรหัส") : (language === "en" ? "Show" : "แสดงรหัส")}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Verification Feedback Alert */}
          {verifyStatus.type !== "idle" && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start space-x-2.5 ${
                verifyStatus.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {verifyStatus.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <p className="leading-relaxed">{verifyStatus.message}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5 pt-1">
            <button
              type="button"
              onClick={handleTestAndSave}
              disabled={isVerifying || !apiKeyInput.trim()}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs sm:text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-300" />
                  <span>{language === "en" ? "Testing connection..." : "กำลังทดสอบการเชื่อมต่อ..."}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
                  <span>{language === "en" ? "Verify & Save Key" : "ทดสอบและบันทึกใช้งาน"}</span>
                </>
              )}
            </button>

            {savedKey && (
              <button
                type="button"
                onClick={handleRemoveKey}
                className="inline-flex items-center justify-center px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-medium rounded-xl border border-rose-200 transition-colors cursor-pointer"
                title={language === "en" ? "Remove key" : "ลบคีย์และกลับไปใช้โควตาระบบ"}
              >
                <Trash2 className="w-4 h-4 mr-1 text-rose-600" />
                <span>{language === "en" ? "Remove" : "ลบคีย์"}</span>
              </button>
            )}
          </div>

          {/* Step-by-Step Guide Accordion */}
          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between text-xs text-slate-600 hover:text-slate-900 font-medium py-1 transition-colors cursor-pointer"
            >
              <span className="flex items-center space-x-1.5">
                <HelpCircle className="w-4 h-4 text-slate-500" />
                <span>{language === "en" ? "How to obtain a free Gemini API Key (1 minute)" : "วิธีขอรับ Gemini API Key ฟรีใน 1 นาที (คลิกดู)"}</span>
              </span>
              <span className="text-slate-400 text-xs">
                {showGuide ? (language === "en" ? "Hide" : "ซ่อน") : (language === "en" ? "View" : "ดูวิธีทำ")}
              </span>
            </button>

            {showGuide && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <p>
                    {language === "en" ? "Navigate to " : "เข้าไปที่เว็บ "}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-slate-900 underline font-medium hover:text-blue-600"
                    >
                      aistudio.google.com/apikey
                    </a>
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <p>{language === "en" ? "Sign in with your Google account." : "เข้าสู่ระบบด้วยบัญชี Google ของคุณ แล้วกดยอมรับเงื่อนไขการใช้งาน"}</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <p>
                    {language === "en"
                      ? 'Click "Create API key" and select your cloud project.'
                      : 'กดปุ่มสีฟ้า "Create API key" จากนั้นเลือกโปรเจกต์หรือสร้างใหม่'}
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    4
                  </span>
                  <p>
                    {language === "en"
                      ? "Copy the key starting with AIza... and paste it above."
                      : "คัดลอกรหัสที่ขึ้นต้นด้วย AIza... มาวางในช่องด้านบน แล้วกดทดสอบและบันทึก"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{language === "en" ? "Close anytime to continue" : "กดปิดเพื่อใช้งานต่อได้ทันที"}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium transition-colors cursor-pointer"
          >
            {language === "en" ? "Close" : "ปิด"}
          </button>
        </div>
      </div>
    </div>
  );
}
