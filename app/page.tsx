"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Header, AppPage } from "@/components/Header";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatMessageList } from "@/components/ChatMessageList";
import { LearningStudio } from "@/components/LearningStudio";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { PersonaModal } from "@/components/PersonaModal";
import { StudyHistoryModal } from "@/components/StudyHistoryModal";
import { FeedbackModal } from "@/components/FeedbackModal";
import { LoginWelcomeView } from "@/components/LoginWelcomeView";
import { useOpenSolverCore } from "@/hooks/useOpenSolverCore";
import { useChatStream } from "@/hooks/useChatStream";
import { usePersonas } from "@/hooks/usePersonas";
import { useStudyHistory } from "@/hooks/useStudyHistory";
import { StudyHistoryItem } from "@/lib/firestore-study-history";
import { useLanguage } from "@/lib/language-context";
import { useFirebase } from "@/lib/firebase-context";

function ChatWorkspace({ userId }: { userId: string }) {
  const { language } = useLanguage();
  const core = useOpenSolverCore();
  const personaState = usePersonas(userId);
  const historyState = useStudyHistory(userId);
  const chat = useChatStream({
    customApiKey: core.customApiKey,
    language,
    userId,
    activePersona: personaState.activePersona
      ? {
          name: personaState.activePersona.name,
          description: personaState.activePersona.description,
        }
      : null,
  });

  const [activePage, setActivePage] = useState<AppPage>("chat");
  const [slideDirection, setSlideDirection] = useState<number>(1);
  const [chatInput, setChatInput] = useState<string>("");
  const [attachedHistoryItems, setAttachedHistoryItems] = useState<
    StudyHistoryItem[]
  >([]);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState<boolean>(false);
  const [isStudyHistoryModalOpen, setIsStudyHistoryModalOpen] =
    useState<boolean>(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);

  const handleChangePage = (page: AppPage) => {
    if (page === activePage) return;
    setSlideDirection(page === "learn" ? 1 : -1);
    setActivePage(page);
  };

  const handleNewChat = () => {
    setSlideDirection(-1);
    setActivePage("chat");
    setChatInput("");
    setAttachedHistoryItems([]);
    chat.clearChat();
    core.handleReset();
  };

  const handleSendMessage = () => {
    const trimmed = chatInput.trim();
    if (
      (!trimmed && attachedHistoryItems.length === 0) ||
      chat.isStreaming
    ) {
      return;
    }
    const attachmentsToSend = attachedHistoryItems;
    setChatInput("");
    setAttachedHistoryItems([]);
    if (trimmed) {
      core.setNotesText(trimmed);
    }
    chat.sendMessage(trimmed, attachmentsToSend);
  };

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-[#FAF9F5] text-[#1F1E1D]">
      {/* Top Bar: Left Hamburger & Language Switcher + Persona Switcher + Right Two-Page Capsule (Chat | Learn) */}
      <Header
        activePage={activePage}
        onChangePage={handleChangePage}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenPersonaModal={() => setIsPersonaModalOpen(true)}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        onNewChat={handleNewChat}
        personas={personaState.personas}
        activePersonaId={personaState.activePersonaId}
        activePersona={personaState.activePersona}
        onSelectPersona={personaState.selectPersona}
      />

      {/* Two-Page Workspace with Smooth Directional Slide */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <AnimatePresence mode="wait" initial={false} custom={slideDirection}>
          {activePage === "chat" ? (
            <motion.div
              key="workspace-page-chat"
              custom={slideDirection}
              initial={{ opacity: 0, x: slideDirection * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: slideDirection * 28 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col justify-between min-h-0 overflow-hidden"
            >
              {chat.messages.length === 0 ? (
                <div className="flex-1" />
              ) : (
                <ChatMessageList
                  messages={chat.messages}
                  onRetry={chat.retryMessage}
                  onFeedback={chat.toggleFeedback}
                />
              )}

              {/* Bottom Chat Input Bar + "+" Popup Menu */}
              <ChatComposer
                value={chatInput}
                onChange={setChatInput}
                onSubmit={handleSendMessage}
                isStreaming={chat.isStreaming}
                attachedItems={attachedHistoryItems}
                onOpenStudyHistory={() => setIsStudyHistoryModalOpen(true)}
                onRemoveAttachedItem={(itemId) =>
                  setAttachedHistoryItems((prev) =>
                    prev.filter((item) => item.id !== itemId)
                  )
                }
              />
            </motion.div>
          ) : (
            <motion.div
              key="workspace-page-learn"
              custom={slideDirection}
              initial={{ opacity: 0, x: slideDirection * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: slideDirection * -28 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              <LearningStudio
                core={core}
                onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                onSaveHistoryItem={historyState.saveHistoryItem}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeyChange={(key) => core.setCustomApiKey(key)}
      />

      <PersonaModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        personas={personaState.personas}
        activePersonaId={personaState.activePersonaId}
        isLoading={personaState.isLoading}
        onCreatePersona={personaState.createPersona}
        onUpdatePersona={personaState.updatePersona}
        onDeletePersona={personaState.deletePersona}
        onSelectPersona={personaState.selectPersona}
      />

      <StudyHistoryModal
        isOpen={isStudyHistoryModalOpen}
        onClose={() => setIsStudyHistoryModalOpen(false)}
        items={historyState.items}
        isLoading={historyState.isLoading}
        alreadySelectedIds={attachedHistoryItems.map((item) => item.id)}
        onConfirmSelection={(selected) =>
          setAttachedHistoryItems((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const uniqueNew = selected.filter(
              (item) => !existingIds.has(item.id)
            );
            return [...prev, ...uniqueNew];
          })
        }
      />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  );
}

export default function HomePage() {
  const { user, authReady } = useFirebase();

  if (!authReady) {
    return (
      <div className="h-dvh flex items-center justify-center bg-[#FAF9F5] text-[#1F1E1D]">
        <Loader2 className="w-5 h-5 animate-spin text-[#6B6A65]" />
      </div>
    );
  }

  if (!user) {
    return <LoginWelcomeView />;
  }

  return <ChatWorkspace key={user.uid} userId={user.uid} />;
}
