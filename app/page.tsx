"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { InputSection } from "@/components/InputSection";
import { ModeSelector, ModeType } from "@/components/ModeSelector";
import { MockExamView } from "@/components/MockExamView";
import { ExamResultView } from "@/components/ExamResultView";
import { FlashcardsView } from "@/components/FlashcardsView";
import { SubjectiveExamView } from "@/components/SubjectiveExamView";
import { SummaryReadingView } from "@/components/SummaryReadingView";
import { HistoryModal } from "@/components/HistoryModal";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { AnalyticsView } from "@/components/AnalyticsView";
import { HeroBannerCarousel } from "@/components/HeroBannerCarousel";
import { HomeworkSolverSection } from "@/components/HomeworkSolverSection";
import {
  ExamQuestion,
  Flashcard,
  SubjectiveQuestion,
  ExamHistoryRecord,
  StudySummaryData,
} from "@/types/exam";
import { Loader2, AlertCircle, Key, BookOpen, HelpCircle, Sparkles } from "lucide-react";
import { getStoredCustomApiKey, getCustomApiHeaders } from "@/lib/custom-key";
import { trackPageView, trackFeatureAction, sendHeartbeat } from "@/lib/analytics";
import { useLanguage } from "@/lib/language-context";

type FlowStep =
  | "input"
  | "summary"
  | "mode-select"
  | "quiz-active"
  | "quiz-result"
  | "flashcards"
  | "subjective"
  | "analytics";

export default function HomePage() {
  const { language, t } = useLanguage();

  // Input State
  const [notesText, setNotesText] = useState<string>("");

  // Hub Primary Tab State: "homework" or "exam"
  const [activeTab, setActiveTab] = useState<"homework" | "exam">("homework");

  // Flow State
  const [currentStep, setCurrentStep] = useState<FlowStep>("input");
  const [previousStep, setPreviousStep] = useState<FlowStep>("input");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null);

  // Quiz State
  const [examTitle, setExamTitle] = useState<string>("");
  const [subjectArea, setSubjectArea] = useState<string>("");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [quizTimerMinutes, setQuizTimerMinutes] = useState<number>(10);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number>(0);

  // Flashcards State
  const [flashcardTopic, setFlashcardTopic] = useState<string>("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  // Subjective State
  const [subjectiveTitle, setSubjectiveTitle] = useState<string>("");
  const [subjectiveQuestions, setSubjectiveQuestions] = useState<SubjectiveQuestion[]>([]);

  // AI Summary State
  const [summaryData, setSummaryData] = useState<StudySummaryData | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);

  // Custom Prompt / Exam Conditions
  const [customPrompt, setCustomPrompt] = useState<string>("");

  // History & LocalStorage
  const [historyRecords, setHistoryRecords] = useState<ExamHistoryRecord[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isStorageLoaded, setIsStorageLoaded] = useState<boolean>(false);

  // Custom Gemini API Key State
  const [customApiKey, setCustomApiKey] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);

  // Load from LocalStorage once on client mount (prevents SSR hydration mismatch)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedNotes = localStorage.getItem("noteexam_last_notes_v1");
        if (savedNotes) {
          setNotesText(savedNotes);
        }
        const savedHistory = localStorage.getItem("noteexam_history_v1");
        if (savedHistory) {
          setHistoryRecords(JSON.parse(savedHistory));
        }
        const savedKey = getStoredCustomApiKey();
        if (savedKey) {
          setCustomApiKey(savedKey);
        }

        // Track page view for web analytics
        trackPageView();
      } catch (e) {
        console.warn("Could not read from localStorage:", e);
      } finally {
        setIsStorageLoaded(true);
      }
    }, 0);

    // Continuous heartbeat every 15s to keep real-time active user session alive
    const heartbeatTimer = setInterval(() => {
      sendHeartbeat();
    }, 15000);

    return () => {
      clearTimeout(timer);
      clearInterval(heartbeatTimer);
    };
  }, []);

  // Save notes to LocalStorage only after initial mount has loaded
  useEffect(() => {
    if (!isStorageLoaded) return;
    try {
      if (notesText) {
        localStorage.setItem("noteexam_last_notes_v1", notesText);
      } else {
        localStorage.removeItem("noteexam_last_notes_v1");
      }
    } catch (e) {
      // ignore quota errors
    }
  }, [notesText, isStorageLoaded]);

  const saveHistoryRecord = (record: ExamHistoryRecord) => {
    try {
      const updated = [record, ...historyRecords].slice(0, 30);
      setHistoryRecords(updated);
      localStorage.setItem("noteexam_history_v1", JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  };

  const handleClearHistory = () => {
    try {
      localStorage.removeItem("noteexam_history_v1");
      setHistoryRecords([]);
    } catch (e) {}
  };

  // Reset to initial input
  const handleReset = () => {
    setCurrentStep("input");
    setUserAnswers({});
    setTimeSpentSeconds(0);
    setApiError(null);
  };

  // Step 1 -> Step 2
  const handleContinueToModes = () => {
    if (notesText.trim().length < 20) return;
    setCurrentStep("mode-select");
    setApiError(null);
  };

  // Step 1 -> AI Summary Reading View
  const handleSummarizeNotes = async (summaryCustomPrompt?: string) => {
    if (notesText.trim().length < 20) return;
    setIsSummarizing(true);
    setApiError(null);

    const promptToSend = summaryCustomPrompt !== undefined ? summaryCustomPrompt : "";

    try {
      const res = await fetch("/api/summarize-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCustomApiHeaders(customApiKey),
        },
        body: JSON.stringify({
          notes: notesText,
          customPrompt: promptToSend,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            (language === "en"
              ? "Unable to generate study summary."
              : "ไม่สามารถสร้างสรุปเนื้อหาได้")
        );
      }

      setSummaryData(data);
      trackFeatureAction("summary");
      setCurrentStep("summary");
    } catch (err: any) {
      setRetryAction(() => () => handleSummarizeNotes(summaryCustomPrompt));
      setApiError(
        err.message ||
          (language === "en"
            ? "An error occurred while generating the summary."
            : "เกิดข้อผิดพลาดในการสร้างสรุปเนื้อหา")
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  // Convert solution from Homework Solver to Study Summary
  const handleHomeworkConvertToSummary = async (solutionText: string) => {
    setNotesText(solutionText);
    setIsSummarizing(true);
    setApiError(null);

    try {
      const res = await fetch("/api/summarize-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCustomApiHeaders(customApiKey),
        },
        body: JSON.stringify({
          notes: solutionText,
          customPrompt:
            language === "en"
              ? "Synthesize key academic concepts and fundamental principles from this solution."
              : "สรุปเนื้อหาและหลักการสำคัญจากคำตอบและวิธีแก้โจทย์ปัญหานี้",
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            (language === "en"
              ? "Unable to generate summary from solution."
              : "ไม่สามารถสร้างสรุปเนื้อหาได้")
        );
      }

      setSummaryData(data);
      trackFeatureAction("summary");
      setCurrentStep("summary");
    } catch (err: any) {
      setRetryAction(() => () => handleHomeworkConvertToSummary(solutionText));
      setApiError(
        err.message ||
          (language === "en"
            ? "An error occurred while generating study summary from problem solution."
            : "เกิดข้อผิดพลาดในการสร้างสรุปเนื้อหาจากโจทย์ปัญหา")
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  // Convert solution from Homework Solver directly to Quiz Mode Selector
  const handleHomeworkConvertToQuiz = (solutionText: string) => {
    setNotesText(solutionText);
    setActiveTab("exam");
    setCurrentStep("mode-select");
  };

  // Start Mode A: Mock Exam
  const handleStartQuiz = async (opts: {
    questionCount: number;
    difficulty: "recall" | "analysis" | "mixed" | "olympiad";
    timerMinutes: number;
    customPrompt?: string;
  }) => {
    setIsLoading(true);
    setApiError(null);

    const promptToSend = opts.customPrompt !== undefined ? opts.customPrompt : customPrompt;

    try {
      const res = await fetch("/api/generate-exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCustomApiHeaders(customApiKey),
        },
        body: JSON.stringify({
          notes: notesText,
          questionCount: opts.questionCount,
          difficulty: opts.difficulty,
          customPrompt: promptToSend,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            (language === "en" ? "Unable to generate exam." : "ไม่สามารถสร้างข้อสอบได้")
        );
      }

      setExamTitle(
        data.title ||
          (language === "en" ? "Practice Examination" : "ชุดข้อสอบจำลองเสมือนจริง")
      );
      setSubjectArea(
        data.summarySubject ||
          (language === "en" ? "Lesson Study" : "สรุปบทเรียน")
      );
      setQuestions(data.questions || []);
      setQuizTimerMinutes(opts.timerMinutes);
      setUserAnswers({});
      setTimeSpentSeconds(0);
      trackFeatureAction("quiz");
      setCurrentStep("quiz-active");
    } catch (err: any) {
      setRetryAction(() => () => handleStartQuiz(opts));
      setApiError(
        err.message ||
          (language === "en"
            ? "An error occurred while creating the exam."
            : "เกิดข้อผิดพลาดในการสร้างข้อสอบ")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Quiz
  const handleSubmitQuiz = (
    answers: Record<number, number>,
    spentSeconds: number
  ) => {
    setUserAnswers(answers);
    setTimeSpentSeconds(spentSeconds);

    // Calculate score
    let correct = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) correct++;
    });
    const percentage = Math.round((correct / questions.length) * 100);

    let rating: ExamHistoryRecord["readinessRating"] =
      language === "en" ? "Knowledge Gaps (<60%)" : "มีช่องว่างความรู้ (<60%)";
    if (percentage >= 90)
      rating =
        language === "en" ? "Highly Prepared (90-100%)" : "พร้อมสอบสูงมาก (90-100%)";
    else if (percentage >= 75)
      rating = language === "en" ? "Well Prepared (75-89%)" : "พร้อมสอบดี (75-89%)";
    else if (percentage >= 60)
      rating =
        language === "en"
          ? "Moderate Review Needed (60-74%)"
          : "พอใช้ ควรทวนซ้ำ (60-74%)";

    const record: ExamHistoryRecord = {
      id: `rec-${Date.now()}`,
      timestamp: Date.now(),
      dateFormatted: new Date().toLocaleDateString(
        language === "en" ? "en-US" : "th-TH",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
      noteTitle:
        examTitle ||
        (language === "en" ? "Practice Exam" : "สนามสอบจำลอง"),
      mode: "quiz",
      score: correct,
      total: questions.length,
      percentage,
      readinessRating: rating,
      durationSeconds: spentSeconds,
      commonMisconceptions: [],
    };

    saveHistoryRecord(record);
    setCurrentStep("quiz-result");
  };

  // Start Mode B: Flashcards
  const handleStartFlashcards = async (cardCount: number, promptOverride?: string) => {
    setIsLoading(true);
    setApiError(null);

    const promptToSend = promptOverride !== undefined ? promptOverride : customPrompt;

    try {
      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCustomApiHeaders(customApiKey),
        },
        body: JSON.stringify({
          notes: notesText,
          count: cardCount,
          customPrompt: promptToSend,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            (language === "en" ? "Unable to generate flashcards." : "ไม่สามารถสร้างแฟลชการ์ดได้")
        );
      }

      setFlashcardTopic(
        data.topic ||
          (language === "en" ? "Key Concept Flashcards" : "แฟลชการ์ดคีย์เวิร์ด")
      );
      setFlashcards(data.cards || []);
      trackFeatureAction("flashcard");
      setCurrentStep("flashcards");
    } catch (err: any) {
      setRetryAction(() => () => handleStartFlashcards(cardCount, promptOverride));
      setApiError(
        err.message ||
          (language === "en"
            ? "An error occurred while generating flashcards."
            : "เกิดข้อผิดพลาดในการสกัดแฟลชการ์ด")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Start Mode C: Subjective
  const handleStartSubjective = async (count: number, promptOverride?: string) => {
    setIsLoading(true);
    setApiError(null);

    const promptToSend = promptOverride !== undefined ? promptOverride : customPrompt;

    try {
      const res = await fetch("/api/generate-subjective", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCustomApiHeaders(customApiKey),
        },
        body: JSON.stringify({
          notes: notesText,
          count,
          customPrompt: promptToSend,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            (language === "en"
              ? "Unable to generate subjective questions."
              : "ไม่สามารถสร้างข้อสอบข้อเขียนได้")
        );
      }

      setSubjectiveTitle(
        data.title ||
          (language === "en"
            ? "Subjective Analysis & Rubric"
            : "ข้อสอบข้อเขียน & Rubric")
      );
      setSubjectiveQuestions(data.questions || []);
      trackFeatureAction("subjective");
      setCurrentStep("subjective");
    } catch (err: any) {
      setRetryAction(() => () => handleStartSubjective(count, promptOverride));
      setApiError(
        err.message ||
          (language === "en"
            ? "An error occurred while generating subjective questions."
            : "เกิดข้อผิดพลาดในการสร้างข้อสอบข้อเขียน")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Record subjective grade to history
  const handleRecordSubjectiveHistory = (score: number, total: number) => {
    const percentage = Math.round((score / total) * 100);
    let rating: ExamHistoryRecord["readinessRating"] =
      language === "en" ? "Knowledge Gaps (<60%)" : "มีช่องว่างความรู้ (<60%)";
    if (percentage >= 90)
      rating =
        language === "en" ? "Highly Prepared (90-100%)" : "พร้อมสอบสูงมาก (90-100%)";
    else if (percentage >= 75)
      rating = language === "en" ? "Well Prepared (75-89%)" : "พร้อมสอบดี (75-89%)";
    else if (percentage >= 60)
      rating =
        language === "en"
          ? "Moderate Review Needed (60-74%)"
          : "พอใช้ ควรทวนซ้ำ (60-74%)";

    const record: ExamHistoryRecord = {
      id: `rec-sub-${Date.now()}`,
      timestamp: Date.now(),
      dateFormatted: new Date().toLocaleDateString(
        language === "en" ? "en-US" : "th-TH",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
      noteTitle:
        subjectiveTitle ||
        (language === "en" ? "Subjective Exam" : "ข้อสอบข้อเขียน"),
      mode: "subjective",
      score,
      total,
      percentage,
      readinessRating: rating,
      durationSeconds: 0,
      commonMisconceptions: [],
    };
    saveHistoryRecord(record);
  };

  const hasActiveSession = currentStep !== "input";

  return (
    <div className="min-h-full flex flex-col bg-[#F8FAFC]">
      {/* Header */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenAnalytics={() => {
          setPreviousStep(currentStep);
          setCurrentStep("analytics");
        }}
        onReset={handleReset}
        hasActiveSession={hasActiveSession}
        historyCount={historyRecords.length}
        hasCustomKey={!!customApiKey}
        isAnalyticsView={currentStep === "analytics"}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Global Loading Overlay */}
        {(isLoading || isSummarizing) && (
          <div className="fixed inset-0 z-50 bg-[#0F172A]/40 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-xl p-6 shadow-2xl border border-[#E2E8F0] flex flex-col items-center space-y-4 max-w-sm text-center">
              <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin" />
              <div className="space-y-1">
                <h4 className="font-bold text-[#0F172A] text-base">
                  {isSummarizing
                    ? (language === "en" ? "Synthesizing Executive Study Guide..." : "AI กำลังสังเคราะห์สรุปเนื้อหาบทเรียน...")
                    : (language === "en" ? "Gemini is generating examination..." : "Gemini กำลังประมวลผลข้อสอบ...")}
                </h4>
                <p className="text-xs text-[#64748B]">
                  {isSummarizing
                    ? (language === "en"
                        ? "Distilling core principles, zero fluff, structuring key takeaways and exam traps."
                        : "กลั่นกรองแก่นสำคัญ เอาเนื้อไม่เอาน้ำ จัดระเบียบหัวข้อและจุดดักข้อสอบ")
                    : (language === "en"
                        ? "Extracting knowledge strictly grounded in source notes with authentic distractors."
                        : "สกัดความรู้จากบทเรียน วางตัวเลือกหลอก และตรวจทานการอ้างอิงเนื้อหา 100%")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {apiError && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-red-800">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{apiError}</span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {retryAction && (
                <button
                  onClick={() => {
                    setApiError(null);
                    retryAction();
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  {language === "en" ? "Retry" : "ลองใหม่อีกครั้ง"}
                </button>
              )}
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className="inline-flex items-center px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded font-medium text-xs shadow-2xs transition-colors cursor-pointer"
                title={language === "en" ? "Set custom Gemini API Key" : "ตั้งค่า Gemini API Key ส่วนตัว"}
              >
                <Key className="w-3 h-3 mr-1 text-amber-500" />
                <span>{language === "en" ? "API Key Settings" : "ตั้งค่า API Key"}</span>
              </button>
              <button
                onClick={() => setApiError(null)}
                className="text-xs font-semibold underline text-red-700 hover:text-red-900 px-2 py-1 cursor-pointer"
              >
                {language === "en" ? "Dismiss" : "ปิด"}
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Step View */}
        {currentStep === "input" && (
          <div className="space-y-6 lg:space-y-8">
            {/* Top Interactive Hero Banner Slider */}
            <HeroBannerCarousel onSelectAction={(type) => setActiveTab(type)} />

            {/* Minimalist Segmented Workspace Hub Selector for Desktop & Tablet */}
            <div className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-2.5 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {/* Tab 1: Problem Solver Workspace */}
                <button
                  type="button"
                  onClick={() => setActiveTab("homework")}
                  className={`p-4 sm:p-5 lg:p-6 rounded-xl text-left transition-all cursor-pointer flex items-center space-x-4 ${
                    activeTab === "homework"
                      ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10"
                      : "bg-white text-slate-800 border border-transparent hover:border-slate-200 hover:bg-slate-50/80"
                  }`}
                >
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      activeTab === "homework"
                        ? "bg-white/15 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`text-sm sm:text-base lg:text-lg font-bold block ${
                      activeTab === "homework" ? "text-white" : "text-slate-900"
                    }`}>
                      {language === "en" ? "Academic Problem Solver & Steps" : "แก้โจทย์ปัญหา & วิเคราะห์คำตอบ"}
                    </span>
                    <p className={`text-xs sm:text-sm mt-0.5 line-clamp-1 ${
                      activeTab === "homework" ? "text-slate-300 font-normal" : "text-slate-500"
                    }`}>
                      {language === "en"
                        ? "Upload worksheet photos or enter problem statements with step-by-step reasoning"
                        : "อัปโหลดภาพโจทย์ หรือพิมพ์คำถาม วิเคราะห์และแสดงวิธีทำเป็นขั้นตอน"}
                    </p>
                  </div>
                </button>

                {/* Tab 2: Quiz & Exam Generator */}
                <button
                  type="button"
                  onClick={() => setActiveTab("exam")}
                  className={`p-4 sm:p-5 lg:p-6 rounded-xl text-left transition-all cursor-pointer flex items-center space-x-4 ${
                    activeTab === "exam"
                      ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10"
                      : "bg-white text-slate-800 border border-transparent hover:border-slate-200 hover:bg-slate-50/80"
                  }`}
                >
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      activeTab === "exam"
                        ? "bg-white/15 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`text-sm sm:text-base lg:text-lg font-bold block ${
                      activeTab === "exam" ? "text-white" : "text-slate-900"
                    }`}>
                      {language === "en" ? "Exam Generator & Study Guides" : "สร้างแบบทดสอบ & สรุปบทเรียน"}
                    </span>
                    <p className={`text-xs sm:text-sm mt-0.5 line-clamp-1 ${
                      activeTab === "exam" ? "text-slate-300 font-normal" : "text-slate-500"
                    }`}>
                      {language === "en"
                        ? "Import study notes or pick topics to generate realistic mock exams & flashcards"
                        : "นำเข้าสรุป เลกเชอร์ หรือเลือกตัวอย่างเพื่อสร้างข้อสอบและแฟลชการ์ด"}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Active Content Body */}
            {activeTab === "homework" ? (
              <HomeworkSolverSection
                onConvertToSummary={handleHomeworkConvertToSummary}
                onConvertToQuiz={handleHomeworkConvertToQuiz}
              />
            ) : (
              <InputSection
                notesText={notesText}
                setNotesText={setNotesText}
                onContinue={handleContinueToModes}
                onSummarize={handleSummarizeNotes}
                isLoading={isLoading}
                isSummarizing={isSummarizing}
              />
            )}
          </div>
        )}

        {currentStep === "summary" && summaryData && (
          <SummaryReadingView
            summary={summaryData}
            onBack={() => setCurrentStep("input")}
            onProceedToModes={() => setCurrentStep("mode-select")}
          />
        )}

        {currentStep === "mode-select" && (
          <ModeSelector
            onBack={() => setCurrentStep("input")}
            customPrompt={customPrompt}
            setCustomPrompt={setCustomPrompt}
            onStartQuiz={handleStartQuiz}
            onStartFlashcards={handleStartFlashcards}
            onStartSubjective={handleStartSubjective}
            isLoading={isLoading}
            hasCustomKey={!!customApiKey}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        )}

        {currentStep === "quiz-active" && (
          <MockExamView
            examTitle={examTitle}
            subject={subjectArea}
            questions={questions}
            initialMinutes={quizTimerMinutes}
            onSubmitExam={handleSubmitQuiz}
            onExit={handleReset}
          />
        )}

        {currentStep === "quiz-result" && (
          <ExamResultView
            examTitle={examTitle}
            subject={subjectArea}
            questions={questions}
            userAnswers={userAnswers}
            timeSpentSeconds={timeSpentSeconds}
            onRetry={() => {
              setUserAnswers({});
              setTimeSpentSeconds(0);
              setCurrentStep("quiz-active");
            }}
            onNewExam={handleReset}
            hasCustomKey={!!customApiKey}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        )}

        {currentStep === "flashcards" && (
          <FlashcardsView
            topic={flashcardTopic}
            cards={flashcards}
            onExit={handleReset}
            hasCustomKey={!!customApiKey}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        )}

        {currentStep === "subjective" && (
          <SubjectiveExamView
            title={subjectiveTitle}
            notes={notesText}
            questions={subjectiveQuestions}
            onExit={handleReset}
            onRecordHistory={handleRecordSubjectiveHistory}
          />
        )}

        {currentStep === "analytics" && (
          <AnalyticsView
            onBack={() => {
              setCurrentStep(previousStep === "analytics" ? "input" : previousStep);
            }}
          />
        )}
      </main>

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        records={historyRecords}
        onClearHistory={handleClearHistory}
      />

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeyChange={(key) => setCustomApiKey(key)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-medium text-slate-600">
            {t("appFooter")}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {t("appFooterSub")}
          </span>
        </div>
      </footer>
    </div>
  );
}
