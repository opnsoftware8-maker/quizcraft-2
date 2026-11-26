"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Header, AppPage, ChatMode } from "@/components/Header";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatMessageList } from "@/components/ChatMessageList";
import { LoginWelcomeView } from "@/components/LoginWelcomeView";
import { useOpenSolverCore } from "@/hooks/useOpenSolverCore";
import { useChatStream } from "@/hooks/useChatStream";
import { usePersonas } from "@/hooks/usePersonas";
import { useStudyHistory } from "@/hooks/useStudyHistory";
import type { StudyHistoryItem } from "@/lib/firestore-study-history";
import { useLanguage } from "@/lib/language-context";
import { useFirebase } from "@/lib/firebase-context";

const LearningStudio = dynamic(
  () => import("@/components/LearningStudio").then((m) => m.LearningStudio),
  { ssr: false }
);
const ApiKeyModal = dynamic(
  () => import("@/components/ApiKeyModal").then((m) => m.ApiKeyModal),
  { ssr: false }
);
const PersonaModal = dynamic(
  () => import("@/components/PersonaModal").then((m) => m.PersonaModal),
  { ssr: false }
);
const StudyHistoryModal = dynamic(
  () => import("@/components/StudyHistoryModal").then((m) => m.StudyHistoryModal),
  { ssr: false }
);
const FeedbackModal = dynamic(
  () => import("@/components/FeedbackModal").then((m) => m.FeedbackModal),
  { ssr: false }
);

function ChatWorkspace({ userId }: { userId: string }) {
  const { language } = useLanguage();
  const core = useOpenSolverCore();
  const personaState = usePersonas(userId);
  const historyState = useStudyHistory(userId);
  const [chatMode, setChatMode] = useState<ChatMode>(() => {
    if (typeof window === "undefined") return "tutor";
    try {
      const saved = window.localStorage.getItem("opensolver_chat_mode_v1");
      return saved === "casual" ? "casual" : "tutor";
    } catch {
      return "tutor";
    }
  });

  const handleChangeChatMode = (mode: ChatMode) => {
    setChatMode(mode);
    try {
      window.localStorage.setItem("opensolver_chat_mode_v1", mode);
    } catch {
      // ignore storage errors
    }
  };

  const chat = useChatStream({
    customApiKey: core.customApiKey,
    language,
    userId,
    chatMode,
    activePersona: personaState.activePersona
      ? {
          id: personaState.activePersona.id,
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

  const handleSelectSavedChat = (chatId: string) => {
    setSlideDirection(-1);
    setActivePage("chat");
    setChatInput("");
    setAttachedHistoryItems([]);
    chat.selectChat(chatId);
  };

  const { isStreaming: isChatStreaming, sendMessage: sendChatMessage } = chat;
  const { setNotesText } = core;

  const handleOpenStudyHistory = useCallback(() => {
    setIsStudyHistoryModalOpen(true);
  }, []);

  const handleRemoveAttachedItem = useCallback((itemId: string) => {
    setAttachedHistoryItems((prev) =>
      prev.filter((item) => item.id !== itemId)
    );
  }, []);

  const handleSendMessage = useCallback(() => {
    const trimmed = chatInput.trim();
    if (
      (!trimmed && attachedHistoryItems.length === 0) ||
      isChatStreaming
    ) {
      return;
    }
    const attachmentsToSend = attachedHistoryItems;
    setChatInput("");
    setAttachedHistoryItems([]);
    if (trimmed) {
      setNotesText(trimmed);
    }
    sendChatMessage(trimmed, attachmentsToSend);
  }, [
    attachedHistoryItems,
    chatInput,
    isChatStreaming,
    sendChatMessage,
    setNotesText,
  ]);

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-[#FAF9F5] text-[#1F1E1D]">
      {/* Top Bar: Left Hamburger & Quick New Chat & Language + Persona Switcher + Right Two-Page Capsule (Chat | Learn) */}
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
        savedChats={chat.savedChats}
        activeChatId={chat.activeChatId}
        onSelectChat={handleSelectSavedChat}
        onTogglePinChat={chat.togglePinChat}
        onDeleteChat={chat.deleteChat}
        chatMode={chatMode}
        onChangeChatMode={handleChangeChatMode}
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
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {chat.messages.length === 0 ? (
                  <div className="flex-1" aria-hidden="true" />
                ) : (
                  <ChatMessageList
                    messages={chat.messages}
                    onRetry={chat.retryMessage}
                    onFeedback={chat.toggleFeedback}
                    personas={personaState.personas}
                    activePersona={personaState.activePersona}
                  />
                )}
              </div>

              {/* Bottom Chat Input Bar + "+" Popup Menu (always pinned to bottom) */}
              <div className="shrink-0 w-full">
                <ChatComposer
                  value={chatInput}
                  onChange={setChatInput}
                  onSubmit={handleSendMessage}
                  isStreaming={chat.isStreaming}
                  attachedItems={attachedHistoryItems}
                  onOpenStudyHistory={handleOpenStudyHistory}
                  onRemoveAttachedItem={handleRemoveAttachedItem}
                />
              </div>
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
