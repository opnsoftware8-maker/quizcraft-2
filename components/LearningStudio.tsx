"use client";

import React, { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { InputSection } from "@/components/InputSection";
import { ModeSelector } from "@/components/ModeSelector";
import { SummaryReadingView } from "@/components/SummaryReadingView";
import { MockExamView } from "@/components/MockExamView";
import { ExamResultView } from "@/components/ExamResultView";
import { FlashcardsView } from "@/components/FlashcardsView";
import { SubjectiveExamView } from "@/components/SubjectiveExamView";
import { useOpenSolverCore } from "@/hooks/useOpenSolverCore";
import { useLanguage } from "@/lib/language-context";
import {
  StudyHistoryType,
  formatSummaryForHistory,
  formatQuizForHistory,
  formatFlashcardsForHistory,
  formatSubjectiveForHistory,
} from "@/lib/firestore-study-history";

interface LearningStudioProps {
  core: ReturnType<typeof useOpenSolverCore>;
  onOpenApiKeyModal: () => void;
  onSaveHistoryItem: (input: {
    type: StudyHistoryType;
    title: string;
    subject: string;
    content: string;
  }) => Promise<string>;
}

export function LearningStudio({
  core,
  onOpenApiKeyModal,
  onSaveHistoryItem,
}: LearningStudioProps) {
  const { language } = useLanguage();
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});

  const summaryKey = core.summaryData
    ? `summary:${core.summaryData.title}:${core.summaryData.sections?.length || 0}`
    : "";
  const quizKey = core.questions.length
    ? `quiz:${core.examTitle}:${core.questions.length}:${core.questions[0]?.question?.slice(0, 32) || ""}`
    : "";
  const flashcardsKey = core.flashcards.length
    ? `flashcards:${core.flashcardTopic}:${core.flashcards.length}:${core.flashcards[0]?.term?.slice(0, 32) || ""}`
    : "";
  const subjectiveKey = core.subjectiveQuestions.length
    ? `subjective:${core.subjectiveTitle}:${core.subjectiveQuestions.length}:${core.subjectiveQuestions[0]?.question?.slice(0, 32) || ""}`
    : "";

  const handleSaveSummary = async () => {
    if (!core.summaryData || !summaryKey) return;
    const formatted = formatSummaryForHistory(core.summaryData, language);
    await onSaveHistoryItem({
      type: "summary",
      ...formatted,
    });
    setSavedKeys((prev) => ({ ...prev, [summaryKey]: true }));
  };

  const handleSaveQuiz = async (includeAnswers: boolean) => {
    if (!core.questions.length || !quizKey) return;
    const formatted = formatQuizForHistory({
      examTitle: core.examTitle,
      subject: core.subjectArea,
      questions: core.questions,
      userAnswers: includeAnswers ? core.userAnswers : undefined,
      language,
    });
    await onSaveHistoryItem({
      type: "quiz",
      ...formatted,
    });
    setSavedKeys((prev) => ({ ...prev, [quizKey]: true }));
  };

  const handleSaveFlashcards = async () => {
    if (!core.flashcards.length || !flashcardsKey) return;
    const formatted = formatFlashcardsForHistory({
      topic: core.flashcardTopic,
      cards: core.flashcards,
      language,
    });
    await onSaveHistoryItem({
      type: "quiz",
      ...formatted,
    });
    setSavedKeys((prev) => ({ ...prev, [flashcardsKey]: true }));
  };

  const handleSaveSubjective = async () => {
    if (!core.subjectiveQuestions.length || !subjectiveKey) return;
    const formatted = formatSubjectiveForHistory({
      title: core.subjectiveTitle,
      questions: core.subjectiveQuestions,
      language,
    });
    await onSaveHistoryItem({
      type: "quiz",
      ...formatted,
    });
    setSavedKeys((prev) => ({ ...prev, [subjectiveKey]: true }));
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-5 sm:py-8">
      <div className="w-full max-w-5xl mx-auto space-y-5">
        {/* Minimal API Error Banner */}
        {core.apiError && (
          <div className="max-w-3xl mx-auto bg-[#EFECE4] border border-[#DFDDD6] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-[#1F1E1D] leading-relaxed">
              {core.apiError}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {core.retryAction && (
                <button
                  type="button"
                  onClick={() => core.retryAction?.()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{language === "en" ? "Retry" : "ลองใหม่"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => core.setApiError(null)}
                className="px-3 py-2 rounded-xl bg-white hover:bg-[#FAF9F5] border border-[#DFDDD6] text-xs font-medium text-[#1F1E1D] transition-colors cursor-pointer"
              >
                {language === "en" ? "Dismiss" : "ปิด"}
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay Banner */}
        {(core.isLoading || core.isSummarizing) && (
          <div className="max-w-3xl mx-auto bg-white border border-[#E5E3DC] rounded-2xl p-6 flex items-center justify-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-[#1F1E1D]" />
            <span className="text-sm font-medium text-[#1F1E1D]">
              {core.isSummarizing
                ? language === "en"
                  ? "Generating summary..."
                  : "กำลังสรุปเนื้อหา..."
                : language === "en"
                ? "Preparing your learning module..."
                : "กำลังประมวลผลข้อมูล..."}
            </span>
          </div>
        )}

        {/* Preserved Learning & Exam Flow */}
        {core.currentStep === "input" && (
          <InputSection
            notesText={core.notesText}
            setNotesText={core.setNotesText}
            onContinue={core.handleContinueToModes}
            onSummarize={core.handleSummarizeNotes}
            isLoading={core.isLoading}
            isSummarizing={core.isSummarizing}
          />
        )}

        {core.currentStep === "summary" && core.summaryData && (
          <SummaryReadingView
            summary={core.summaryData}
            onBack={() => core.setCurrentStep("input")}
            onProceedToModes={() => core.setCurrentStep("mode-select")}
            onSaveToHistory={handleSaveSummary}
            isSavedToHistory={Boolean(savedKeys[summaryKey])}
          />
        )}

        {core.currentStep === "mode-select" && (
          <ModeSelector
            onBack={() => core.setCurrentStep("input")}
            customPrompt={core.customPrompt}
            setCustomPrompt={core.setCustomPrompt}
            onStartQuiz={core.handleStartQuiz}
            onStartFlashcards={core.handleStartFlashcards}
            onStartSubjective={core.handleStartSubjective}
            isLoading={core.isLoading}
            hasCustomKey={Boolean(core.customApiKey)}
            onOpenApiKeyModal={onOpenApiKeyModal}
          />
        )}

        {core.currentStep === "quiz-active" && (
          <MockExamView
            examTitle={core.examTitle}
            subject={core.subjectArea}
            questions={core.questions}
            initialMinutes={core.quizTimerMinutes}
            onSubmitExam={core.handleSubmitQuiz}
            onExit={() => core.setCurrentStep("mode-select")}
            onSaveToHistory={() => handleSaveQuiz(false)}
            isSavedToHistory={Boolean(savedKeys[quizKey])}
          />
        )}

        {core.currentStep === "quiz-result" && (
          <ExamResultView
            examTitle={core.examTitle}
            subject={core.subjectArea}
            questions={core.questions}
            userAnswers={core.userAnswers}
            timeSpentSeconds={core.timeSpentSeconds}
            onRetry={() => {
              core.setUserAnswers({});
              core.setTimeSpentSeconds(0);
              core.setCurrentStep("quiz-active");
            }}
            onNewExam={() => core.setCurrentStep("input")}
            hasCustomKey={Boolean(core.customApiKey)}
            onOpenApiKeyModal={onOpenApiKeyModal}
            onSaveToHistory={() => handleSaveQuiz(true)}
            isSavedToHistory={Boolean(savedKeys[quizKey])}
          />
        )}

        {core.currentStep === "flashcards" && (
          <FlashcardsView
            topic={core.flashcardTopic}
            cards={core.flashcards}
            onExit={() => core.setCurrentStep("mode-select")}
            hasCustomKey={Boolean(core.customApiKey)}
            onOpenApiKeyModal={onOpenApiKeyModal}
            onSaveToHistory={handleSaveFlashcards}
            isSavedToHistory={Boolean(savedKeys[flashcardsKey])}
          />
        )}

        {core.currentStep === "subjective" && (
          <SubjectiveExamView
            title={core.subjectiveTitle}
            notes={core.notesText}
            questions={core.subjectiveQuestions}
            onExit={() => core.setCurrentStep("mode-select")}
            onSaveToHistory={handleSaveSubjective}
            isSavedToHistory={Boolean(savedKeys[subjectiveKey])}
          />
        )}
      </div>
    </div>
  );
}
