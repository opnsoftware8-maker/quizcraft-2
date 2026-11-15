"use client";

import React, { useState, useRef } from "react";
import {
  HelpCircle,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Shuffle,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Copy,
  Check,
  BrainCircuit,
  MessageSquare,
  FileSpreadsheet,
  X,
  Plus,
} from "lucide-react";
import { HOMEWORK_PROMPT_PRESETS, getHomeworkPromptPresets, getRandomPrompt, PromptPreset } from "@/lib/homework-prompts";
import { getStoredCustomApiKey } from "@/lib/custom-key";
import { notifyUserAction } from "@/lib/analytics";
import { StructuredHomeworkSolution } from "@/types/exam";
import { HomeworkSolutionView } from "./HomeworkSolutionView";
import { useLanguage } from "@/lib/language-context";

interface HomeworkSolverSectionProps {
  onConvertToSummary: (text: string) => void;
  onConvertToQuiz: (text: string) => void;
}

interface UploadedImage {
  id: string;
  dataUrl: string;
  name: string;
  type: string;
}

export function HomeworkSolverSection({
  onConvertToSummary,
  onConvertToQuiz,
}: HomeworkSolverSectionProps) {
  const { language, t } = useLanguage();
  const [problemText, setProblemText] = useState("");
  const [promptInstruction, setPromptInstruction] = useState(() =>
    language === "en"
      ? "Provide detailed solutions showing clear step-by-step calculations and principles."
      : "ตอบเฉลยละเอียด พร้อมแสดงวิธีทำทีละขั้นตอนอย่างชัดเจน"
  );
  const [selectedImages, setSelectedImages] = useState<UploadedImage[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [solutionData, setSolutionData] = useState<StructuredHomeworkSolution | null>(null);
  const [solutionResult, setSolutionResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [prevLang, setPrevLang] = useState(language);
  if (prevLang !== language) {
    setPrevLang(language);
    if (
      promptInstruction === "ตอบเฉลยละเอียด พร้อมแสดงวิธีทำทีละขั้นตอนอย่างชัดเจน" &&
      language === "en"
    ) {
      setPromptInstruction("Provide detailed solutions showing clear step-by-step calculations and principles.");
    } else if (
      promptInstruction === "Provide detailed solutions showing clear step-by-step calculations and principles." &&
      language === "th"
    ) {
      setPromptInstruction("ตอบเฉลยละเอียด พร้อมแสดงวิธีทำทีละขั้นตอนอย่างชัดเจน");
    }
  }

  // Handle Random Prompt from presets
  const handleRandomizePrompt = () => {
    const random = getRandomPrompt(language);
    setPromptInstruction(random.text);
  };

  const handleSelectPreset = (preset: PromptPreset) => {
    setPromptInstruction(preset.text);
  };

  // Image Upload handler (supports multiple files at once or multiple selections)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      setErrorMsg(language === "en" ? "Please select valid image files (JPG, PNG, WebP)" : "กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP)");
      return;
    }

    setErrorMsg(null);

    const readPromises = validFiles.map((file) => {
      return new Promise<UploadedImage>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            dataUrl: event.target?.result as string,
            name: file.name,
            type: file.type || "image/jpeg",
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then((newImages) => {
      setSelectedImages((prev) => [...prev, ...newImages]);
    });

    // Reset input value to allow selecting more files or re-selecting
    e.target.value = "";
  };

  const handleRemoveImage = (id: string) => {
    setSelectedImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Text File Upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setProblemText(content);
          setErrorMsg(null);
        }
      };
      reader.readAsText(file);
    }
  };

  // Submit to Solve Homework API
  const handleSolve = async () => {
    if (!problemText.trim() && selectedImages.length === 0) {
      setErrorMsg(t("solverEmptyError"));
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSolutionResult(null);

    try {
      notifyUserAction(`ขอคำตอบและวิธีแก้โจทย์ปัญหา: "${problemText.slice(0, 30)}..."`).catch(() => {});

      const customApiKey = getStoredCustomApiKey();
      const res = await fetch("/api/solve-homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemText: problemText.trim(),
          promptInstruction: promptInstruction.trim(),
          images: selectedImages.map((img) => ({
            dataUrl: img.dataUrl,
            mimeType: img.type,
            name: img.name,
          })),
          imageBase64: selectedImages[0]?.dataUrl || null,
          imageMimeType: selectedImages[0]?.type || "image/jpeg",
          customApiKey: customApiKey,
          language: language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (language === "en" ? "Processing error" : "เกิดข้อผิดพลาดในการประมวลผล"));
      }

      setSolutionData(data.solution || null);
      setSolutionResult(data.answer || null);
    } catch (err: any) {
      setErrorMsg(err.message || (language === "en" ? "Failed to connect to AI system. Please retry." : "ไม่สามารถเชื่อมต่อกับระบบ AI ได้ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = solutionData?.rawMarkdownExport || solutionResult;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Clear all
  const handleClear = () => {
    setProblemText("");
    setSelectedImages([]);
    setSolutionData(null);
    setSolutionResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 lg:p-10 shadow-xs space-y-6 lg:space-y-8">
      {/* Title Header */}
      <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              {t("solverTitle")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {t("solverSubtitle")}
            </p>
          </div>
        </div>

        {(problemText || selectedImages.length > 0 || solutionResult || solutionData) && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center space-x-1.5 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer self-start sm:self-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t("solverClearBtn")}</span>
          </button>
        )}
      </div>

      {/* Input Grid: Image Upload & Problem Text (Spacious for Desktop & Tablet) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Col: Upload Image / Sheet */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              {language === "en" ? "1. Upload Problem Images / Worksheets" : "1. อัปโหลดภาพโจทย์ปัญหา / เอกสารคำถาม"}
            </label>
            {selectedImages.length > 0 && (
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {selectedImages.length} {language === "en" ? "images selected" : "รูปที่เลือก"}
              </span>
            )}
          </div>

          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageChange}
            accept="image/*"
            multiple
            className="hidden"
          />

          {selectedImages.length === 1 ? (
            <div className="relative rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center">
              <div className="relative max-h-64 overflow-hidden rounded-lg border border-slate-200 bg-white flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImages[0].dataUrl}
                  alt={language === "en" ? "Uploaded problem sheet" : "ภาพโจทย์ปัญหาที่อัปโหลด"}
                  className="max-h-60 object-contain"
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                <span className="font-medium truncate max-w-[220px]">
                  {selectedImages[0].name}
                </span>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === "en" ? "Add more" : "เพิ่มรูปอีก"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedImages([])}
                    className="text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                  >
                    {language === "en" ? "Remove" : "ลบรูป"}
                  </button>
                </div>
              </div>
            </div>
          ) : selectedImages.length > 1 ? (
            <div className="relative rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold flex items-center space-x-1.5">
                  <ImageIcon className="w-4 h-4 text-slate-700" />
                  <span>
                    {language === "en"
                      ? `Selected Images (${selectedImages.length})`
                      : `รูปภาพที่เลือก (${selectedImages.length} รูป)`}
                  </span>
                </span>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === "en" ? "Add more" : "เพิ่มรูปอีก"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedImages([])}
                    className="text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                  >
                    {language === "en" ? "Remove all" : "ลบทั้งหมด"}
                  </button>
                </div>
              </div>

              {/* Thumbnails grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                {selectedImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-4/3 flex items-center justify-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.dataUrl}
                      alt={language === "en" ? `Image ${idx + 1}` : `ภาพที่ ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      title={language === "en" ? "Remove this image" : "ลบรูปนี้"}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[10px] px-1.5 py-0.5 truncate text-center">
                      {language === "en" ? `Page ${idx + 1}` : `รูปที่ ${idx + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-full min-h-[220px] lg:min-h-[260px] border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-700 group-hover:scale-105 flex items-center justify-center transition-transform mb-3 shadow-xs">
                <ImageIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {language === "en"
                  ? "Click or drop problem sheets / photos here"
                  : "คลิกเพื่อถ่ายภาพ หรืออัปโหลดภาพโจทย์ปัญหา"}
              </span>
              <span className="text-xs text-slate-500 mt-1 max-w-sm">
                {language === "en"
                  ? "Supports multiple photos simultaneously (JPG, PNG, WebP) or screenshots"
                  : "รองรับหลายรูปพร้อมกัน JPG, PNG, WebP หรือภาพแคปหน้าจอคำถาม"}
              </span>
            </button>
          )}
        </div>

        {/* Right Col: Problem Text */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              {language === "en" ? "2. Problem Statement / Question Text" : "2. ข้อความโจทย์ / คำถาม"}
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center space-x-1 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{language === "en" ? "Import Text File (.txt)" : "นำเข้าไฟล์ข้อความ (.txt)"}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.md"
              className="hidden"
            />
          </div>

          <textarea
            value={problemText}
            onChange={(e) => setProblemText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSolve();
              }
            }}
            rows={selectedImages.length > 0 ? 6 : 9}
            placeholder={
              language === "en"
                ? "Type or paste the problem statement here (e.g. 'Solve 2x + 5 = 15 with detailed steps' or 'Why do buffer solutions resist pH change?')..."
                : "พิมพ์หรือวางข้อความโจทย์คำถามที่นี่ เช่น 'จงแก้สมการ 2x + 5 = 15 พร้อมอธิบายวิธีทำทีละสเต็ป' หรือ 'ทำไมสารละลายบัฟเฟอร์จึงต้านทานการเปลี่ยนแปลง pH ได้'..."
            }
            className="w-full p-4 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-sm sm:text-base text-slate-900 placeholder-slate-400 outline-hidden resize-none transition-all leading-relaxed bg-white"
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{problemText.length} {language === "en" ? "characters" : "ตัวอักษร"}</span>
            <span className="hidden sm:inline">
              {language === "en" ? "Press ⌘ / Ctrl + Enter to solve" : "กด ⌘ / Ctrl + Enter เพื่อส่งคำถาม"}
            </span>
          </div>
        </div>
      </div>

      {/* AI Prompt Instruction with Minimalist Presets */}
      <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
            <Sparkles className="w-4 h-4 text-slate-700" />
            <span>{language === "en" ? "AI Solving Instructions & Directives" : "แนวทางการตอบของ AI (Prompt Instructions)"}</span>
          </div>

          {/* Random Button */}
          <button
            type="button"
            onClick={handleRandomizePrompt}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === "en" ? "Shuffle Preset" : "สุ่มแนวคำสั่งใหม่"}</span>
          </button>
        </div>

        {/* Prompt Input Box */}
        <input
          type="text"
          value={promptInstruction}
          onChange={(e) => setPromptInstruction(e.target.value)}
          placeholder={
            language === "en"
              ? "Specify solving tone or style, e.g. friendly tutor, concise exam notes, real-life analogies..."
              : "ระบุรูปแบบการอธิบาย เช่น ตอบแบบละเอียด, สรุปสั้นกระชับ, ยกตัวอย่างในชีวิตจริง..."
          }
          className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-xs sm:text-sm text-slate-800 outline-hidden transition-all"
        />

        {/* Quick Suggestion Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 text-xs">
          <span className="text-xs text-slate-500 shrink-0 mr-1">
            {language === "en" ? "Quick presets:" : "เลือกด่วน:"}
          </span>
          {getHomeworkPromptPresets(language).slice(0, 6).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="px-3 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 shrink-0 transition-colors cursor-pointer"
            >
              {preset.tag}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800 flex items-center space-x-2.5">
          <span className="font-semibold">{language === "en" ? "Error:" : "ข้อผิดพลาด:"}</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Large Minimalist Primary Submit Button */}
      <button
        type="button"
        disabled={isLoading || (!problemText.trim() && selectedImages.length === 0)}
        onClick={handleSolve}
        className={`w-full py-4 px-8 rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center space-x-2.5 cursor-pointer transition-all shadow-xs ${
          isLoading || (!problemText.trim() && selectedImages.length === 0)
            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            : "bg-slate-900 hover:bg-slate-800 text-white active:scale-[0.99]"
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span>
              {language === "en"
                ? "Analyzing problem & solving step-by-step..."
                : "ระบบกำลังวิเคราะห์และเรียบเรียงคำตอบ..."}
            </span>
          </>
        ) : (
          <>
            <BrainCircuit className="w-5 h-5" />
            <span>
              {language === "en" ? "Analyze & Solve Step-by-Step" : "วิเคราะห์และแสดงวิธีทำทีละขั้นตอน"}
            </span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </>
        )}
      </button>

      {/* Solution Result View */}
      {solutionData ? (
        <HomeworkSolutionView
          solution={solutionData}
          onConvertToSummary={onConvertToSummary}
          onConvertToQuiz={onConvertToQuiz}
          onClear={handleClear}
        />
      ) : solutionResult ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 space-y-4 animate-fadeIn shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                {language === "en" ? "AI Solution & Explanation" : "ผลการตอบและคำอธิบายจาก AI (Solution)"}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-1.5 cursor-pointer self-start sm:self-center"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">{language === "en" ? "Copied!" : "คัดลอกแล้ว!"}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{language === "en" ? "Copy Solution" : "คัดลอกคำตอบ"}</span>
                </>
              )}
            </button>
          </div>

          {/* Solution Body */}
          <div className="bg-slate-50 p-5 sm:p-6 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans max-h-96 overflow-y-auto">
            {solutionResult}
          </div>

          {/* Next Steps */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
              <BrainCircuit className="w-4 h-4 text-slate-600" />
              <span>{language === "en" ? "Next Learning Actions:" : "ไปต่อยอดความรู้ทันที (Next Learning Steps):"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => onConvertToSummary(solutionResult)}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left cursor-pointer group flex flex-col justify-between transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center space-x-1.5">
                    <BookOpen className="w-4 h-4 text-slate-600" />
                    <span>{language === "en" ? "Convert to Study Summary" : "สรุปเป็นเนื้อหาบทเรียนต่อ"}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  {language === "en"
                    ? "Organize this explanation into structured revision notes and key takeaways."
                    : "นำคำตอบและวิธีทำนี้ไปจัดระเบียบเป็นชีทสรุปบทเรียนและจุดสำคัญที่ต้องจำ"}
                </p>
              </button>

              <button
                type="button"
                onClick={() => onConvertToQuiz(solutionResult)}
                className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-left cursor-pointer group flex flex-col justify-between transition-all text-white"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold text-white flex items-center space-x-1.5">
                    <BrainCircuit className="w-4 h-4 text-slate-300" />
                    <span>{language === "en" ? "Generate Practice Quiz / Flashcards" : "แปลงเป็นแบบทดสอบข้อสอบทันที"}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-xs text-slate-300 mt-1.5">
                  {language === "en"
                    ? "Create 4-choice questions or flashcards from this exercise to test retention."
                    : "สร้างชุดข้อสอบ 4 ตัวเลือก หรือแฟลชการ์ดจำแม่นจากข้อนี้ เพื่อทดสอบความจำ"}
                </p>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
