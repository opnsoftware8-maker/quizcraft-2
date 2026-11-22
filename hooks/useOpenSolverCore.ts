"use client";

import { useState, useEffect } from "react";
import {
  ExamQuestion,
  Flashcard,
  SubjectiveQuestion,
  StudySummaryData,
} from "@/types/exam";
import { getStoredCustomApiKey, getCustomApiHeaders } from "@/lib/custom-key";
import { notifySummaryStarted, notifyExamStarted } from "@/lib/analytics";
import { useLanguage } from "@/lib/language-context";

export type FlowStep =
  | "input"
  | "summary"
  | "mode-select"
  | "quiz-active"
  | "quiz-result"
  | "flashcards"
  | "subjective";

/**
 * Preserved core AI & processing state/handlers for OpenSolver / QuizCraft.
 * Kept intact while the presentation layer transitions to the minimalist chat UI.
 */
export function useOpenSolverCore() {
  const { language } = useLanguage();

  const [notesText, setNotesText] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"homework" | "exam">("homework");
  const [currentStep, setCurrentStep] = useState<FlowStep>("input");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null);

  const [examTitle, setExamTitle] = useState<string>("");
  const [subjectArea, setSubjectArea] = useState<string>("");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [quizTimerMinutes, setQuizTimerMinutes] = useState<number>(10);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number>(0);

  const [flashcardTopic, setFlashcardTopic] = useState<string>("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  const [subjectiveTitle, setSubjectiveTitle] = useState<string>("");
  const [subjectiveQuestions, setSubjectiveQuestions] = useState<SubjectiveQuestion[]>([]);

  const [summaryData, setSummaryData] = useState<StudySummaryData | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>("");

  const [customApiKey, setCustomApiKey] = useState<string | null>(null);
  const [isStorageLoaded, setIsStorageLoaded] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedNotes = localStorage.getItem("noteexam_last_notes_v1");
        if (savedNotes) {
          setNotesText(savedNotes);
        }
        const savedKey = getStoredCustomApiKey();
        if (savedKey) {
          setCustomApiKey(savedKey);
        }
      } catch (e) {
        console.warn("Could not read from localStorage:", e);
      } finally {
        setIsStorageLoaded(true);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isStorageLoaded) return;
    try {
      if (notesText) {
        localStorage.setItem("noteexam_last_notes_v1", notesText);
      } else {
        localStorage.removeItem("noteexam_last_notes_v1");
      }
    } catch {
      // ignore quota errors
    }
  }, [notesText, isStorageLoaded]);

  const handleReset = () => {
    setCurrentStep("input");
    setUserAnswers({});
    setTimeSpentSeconds(0);
    setApiError(null);
  };

  const handleContinueToModes = () => {
    if (notesText.trim().length < 20) return;
    setCurrentStep("mode-select");
    setApiError(null);
  };

  const handleSummarizeNotes = async (summaryCustomPrompt?: string) => {
    if (notesText.trim().length < 20) return;
    setIsSummarizing(true);
    setApiError(null);

    notifySummaryStarted("มีผู้ใช้ได้ใช้งานระบบการสรุปเนื้อหาแล้ว");

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

  const handleHomeworkConvertToSummary = async (solutionText: string) => {
    setNotesText(solutionText);
    setIsSummarizing(true);
    setApiError(null);

    notifySummaryStarted("มีผู้ใช้ได้ใช้งานระบบการสรุปเนื้อหาแล้ว (จากเฉลยโจทย์ปัญหา)");

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

  const handleHomeworkConvertToQuiz = (solutionText: string) => {
    setNotesText(solutionText);
    setActiveTab("exam");
    setCurrentStep("mode-select");
  };

  const handleStartQuiz = async (opts: {
    questionCount: number;
    difficulty: "recall" | "analysis" | "mixed" | "olympiad";
    timerMinutes: number;
    customPrompt?: string;
  }) => {
    setIsLoading(true);
    setApiError(null);

    notifyExamStarted(`มีผู้ใช้ได้ใช้งานระบบข้อสอบแล้ว (ปรนัย ${opts.questionCount} ข้อ)`);

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

  const handleSubmitQuiz = (
    answers: Record<number, number>,
    spentSeconds: number
  ) => {
    setUserAnswers(answers);
    setTimeSpentSeconds(spentSeconds);
    setCurrentStep("quiz-result");
  };

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

  const handleStartSubjective = async (count: number, promptOverride?: string) => {
    setIsLoading(true);
    setApiError(null);

    notifyExamStarted(`มีผู้ใช้ได้ใช้งานระบบข้อสอบแล้ว (อัตนัย ${count} ข้อ)`);

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

  return {
    notesText,
    setNotesText,
    activeTab,
    setActiveTab,
    currentStep,
    setCurrentStep,
    isLoading,
    isSummarizing,
    apiError,
    setApiError,
    retryAction,
    examTitle,
    subjectArea,
    questions,
    quizTimerMinutes,
    userAnswers,
    setUserAnswers,
    timeSpentSeconds,
    setTimeSpentSeconds,
    flashcardTopic,
    flashcards,
    subjectiveTitle,
    subjectiveQuestions,
    summaryData,
    customPrompt,
    setCustomPrompt,
    customApiKey,
    setCustomApiKey,
    handleReset,
    handleContinueToModes,
    handleSummarizeNotes,
    handleHomeworkConvertToSummary,
    handleHomeworkConvertToQuiz,
    handleStartQuiz,
    handleSubmitQuiz,
    handleStartFlashcards,
    handleStartSubjective,
  };
}
