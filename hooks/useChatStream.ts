"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessageList";
import { getCustomApiHeaders } from "@/lib/custom-key";
import { Language } from "@/lib/i18n";
import {
  makeSafeFirestoreId,
  persistNewChatWithUserMessage,
  persistChatMessage,
  updateAssistantMessageContent,
  updateMessageFeedbackInFirestore,
} from "@/lib/firestore-chat";
import { StudyHistoryItem } from "@/lib/firestore-study-history";

function formatAttachmentsForApi(
  items: StudyHistoryItem[],
  language: Language
): string {
  return items
    .map((item, idx) => {
      const typeLabel =
        item.type === "summary"
          ? language === "en"
            ? "Summary"
            : "สรุปเนื้อหา"
          : language === "en"
            ? "Quiz"
            : "แบบทดสอบ";
      return `--- ${
        language === "en"
          ? "Attached Study Material"
          : "เนื้อหาจากประวัติการเรียนรู้ที่แนบ"
      } #${idx + 1} (${typeLabel}) ---\n${
        language === "en" ? "Title" : "หัวข้อ"
      }: ${item.title}\n${
        item.subject
          ? `${language === "en" ? "Subject" : "วิชา"}: ${item.subject}\n`
          : ""
      }${item.content}`;
    })
    .join("\n\n");
}

interface UseChatStreamOptions {
  customApiKey: string | null;
  language: Language;
  userId?: string | null;
  activePersona?: { name: string; description: string } | null;
}

export function useChatStream({
  customApiKey,
  language,
  userId,
  activePersona = null,
}: UseChatStreamOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const activeChatIdRef = useRef<string | null>(null);
  const activePersonaRef = useRef<{ name: string; description: string } | null>(
    activePersona
  );

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    activePersonaRef.current = activePersona;
  }, [activePersona]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      activeChatIdRef.current = null;
    };
  }, [userId]);

  const streamAssistantReply = useCallback(
    async (
      targetAiId: string,
      conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
      chatIdForPersist: string | null,
      isRetryPersist: boolean
    ) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsStreaming(true);

      let pendingQueue = "";
      let streamFinished = false;
      let accumulatedText = "";

      const updateTargetContent = (
        content: string,
        status: ChatMessage["status"]
      ) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === targetAiId ? { ...m, content, status } : m))
        );
      };

      const dripPromise = new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          if (controller.signal.aborted) {
            clearInterval(timer);
            resolve();
            return;
          }

          if (pendingQueue.length > 0) {
            const stepSize =
              pendingQueue.length > 180
                ? Math.ceil(pendingQueue.length / 18)
                : pendingQueue.length > 40
                ? 4
                : 2;
            const slice = pendingQueue.slice(0, stepSize);
            pendingQueue = pendingQueue.slice(stepSize);
            accumulatedText += slice;
            updateTargetContent(accumulatedText, "streaming");
          } else if (streamFinished) {
            clearInterval(timer);
            resolve();
          }
        }, 16);
      });

      try {
        const currentPersona = activePersonaRef.current;
        const response = await fetch("/api/chat-stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getCustomApiHeaders(customApiKey),
          },
          body: JSON.stringify({
            messages: conversationHistory,
            language,
            customApiKey: customApiKey || undefined,
            persona: currentPersona
              ? {
                  name: currentPersona.name,
                  description: currentPersona.description,
                }
              : undefined,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          let errMsg =
            language === "en"
              ? "Unable to connect to AI right now. Please check your Gemini API Key."
              : "ไม่สามารถเชื่อมต่อกับ AI ได้ กรุณาตรวจสอบ Gemini API Key แล้วลองใหม่อีกครั้ง";
          try {
            const errJson = await response.json();
            if (errJson?.error) errMsg = errJson.error;
          } catch {
            // ignore non-json body
          }
          streamFinished = true;
          await dripPromise;
          updateTargetContent(errMsg, "error");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const events = sseBuffer.split("\n\n");
          sseBuffer = events.pop() || "";

          for (const evt of events) {
            const lines = evt.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload) continue;
              if (payload === "[DONE]") {
                streamFinished = true;
                continue;
              }
              try {
                const parsed = JSON.parse(payload);
                if (parsed?.error) {
                  throw new Error(parsed.error);
                }
                if (typeof parsed?.chunk === "string" && parsed.chunk.length > 0) {
                  pendingQueue += parsed.chunk;
                }
              } catch (parseErr: any) {
                if (parseErr?.message && !String(parseErr.message).includes("JSON")) {
                  throw parseErr;
                }
              }
            }
          }
        }

        streamFinished = true;
        await dripPromise;

        if (!controller.signal.aborted) {
          const finalText =
            accumulatedText ||
            (language === "en"
              ? "No response received. Please try again."
              : "ไม่ได้รับข้อความตอบกลับ กรุณากดลองใหม่อีกครั้ง");
          const finalStatus: ChatMessage["status"] = accumulatedText ? "done" : "error";
          updateTargetContent(finalText, finalStatus);

          if (finalStatus === "done" && userId && chatIdForPersist) {
            if (isRetryPersist) {
              updateAssistantMessageContent({
                userId,
                chatId: chatIdForPersist,
                messageId: targetAiId,
                content: finalText,
              }).catch((err) => console.error("Firestore retry sync error:", err));
            } else {
              persistChatMessage({
                userId,
                chatId: chatIdForPersist,
                messageId: targetAiId,
                role: "assistant",
                content: finalText,
              }).catch((err) => console.error("Firestore AI message sync error:", err));
            }
          }
        }
      } catch (err: any) {
        streamFinished = true;
        if (err?.name === "AbortError") {
          return;
        }
        await dripPromise;
        const message =
          err?.message ||
          (language === "en"
            ? "An error occurred while streaming response."
            : "เกิดข้อผิดพลาดระหว่างรับคำตอบจาก AI");
        updateTargetContent(
          accumulatedText ? `${accumulatedText}\n\n${message}` : message,
          "error"
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsStreaming(false);
        }
      }
    },
    [customApiKey, language, userId]
  );

  const sendMessage = useCallback(
    async (rawText: string, attachedHistory: StudyHistoryItem[] = []) => {
      const text = rawText.trim();
      if ((!text && attachedHistory.length === 0) || isStreaming) return;

      const displayContent =
        text ||
        (language === "en"
          ? "Help me review and discuss the attached study materials."
          : "ช่วยอธิบายและพูดคุยเกี่ยวกับเนื้อหาที่แนบมานี้");

      const apiContent =
        attachedHistory.length > 0
          ? `${formatAttachmentsForApi(attachedHistory, language)}\n\n${
              language === "en"
                ? "User Message"
                : "คำถามหรือข้อความจากผู้ใช้"
            }:\n${displayContent}`
          : displayContent;

      const firestoreContent =
        attachedHistory.length > 0
          ? `[${attachedHistory.map((i) => i.title).join(", ")}]\n${displayContent}`.slice(
              0,
              45000
            )
          : displayContent;

      const userMsgId = makeSafeFirestoreId("user");
      const userMsg: ChatMessage = {
        id: userMsgId,
        role: "user",
        content: displayContent,
        apiContent,
        attachments:
          attachedHistory.length > 0
            ? attachedHistory.map((item) => ({
                id: item.id,
                type: item.type,
                title: item.title,
                subject: item.subject,
              }))
            : undefined,
        status: "done",
        feedback: null,
      };

      const aiMsgId = makeSafeFirestoreId("ai");
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        status: "streaming",
        feedback: null,
      };

      const isFirstMessageInSession = !activeChatIdRef.current;
      const chatId = activeChatIdRef.current || makeSafeFirestoreId("chat");
      activeChatIdRef.current = chatId;

      if (userId) {
        if (isFirstMessageInSession) {
          persistNewChatWithUserMessage({
            userId,
            chatId,
            userMessageId: userMsgId,
            userContent: firestoreContent,
          }).catch((err) => console.error("Firestore initial chat sync error:", err));
        } else {
          persistChatMessage({
            userId,
            chatId,
            messageId: userMsgId,
            role: "user",
            content: firestoreContent,
          }).catch((err) => console.error("Firestore user message sync error:", err));
        }
      }

      const historyForApi = [
        ...messagesRef.current
          .filter(
            (m) =>
              m.status !== "error" &&
              (m.apiContent || m.content).trim().length > 0
          )
          .map((m) => ({ role: m.role, content: m.apiContent || m.content })),
        { role: "user" as const, content: apiContent },
      ];

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      await streamAssistantReply(aiMsgId, historyForApi, chatId, false);
    },
    [isStreaming, language, streamAssistantReply, userId]
  );

  const retryMessage = useCallback(
    async (aiMessageId: string) => {
      if (isStreaming) return;

      const current = messagesRef.current;
      const targetIndex = current.findIndex((m) => m.id === aiMessageId);
      if (targetIndex === -1) return;

      const targetMsg = current[targetIndex];
      const wasPreviousError = targetMsg.status === "error";

      const historyUpToPrompt = current
        .slice(0, targetIndex)
        .filter(
          (m) =>
            m.status !== "error" &&
            (m.apiContent || m.content).trim().length > 0
        )
        .map((m) => ({ role: m.role, content: m.apiContent || m.content }));

      if (historyUpToPrompt.length === 0) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? { ...m, content: "", status: "streaming", feedback: null }
            : m
        )
      );

      await streamAssistantReply(
        aiMessageId,
        historyUpToPrompt,
        activeChatIdRef.current,
        !wasPreviousError
      );
    },
    [isStreaming, streamAssistantReply]
  );

  const toggleFeedback = useCallback(
    (aiMessageId: string, vote: "up" | "down") => {
      let nextVote: "up" | "down" | null = null;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== aiMessageId) return m;
          nextVote = m.feedback === vote ? null : vote;
          return { ...m, feedback: nextVote };
        })
      );

      if (userId && activeChatIdRef.current) {
        updateMessageFeedbackInFirestore({
          userId,
          chatId: activeChatIdRef.current,
          messageId: aiMessageId,
          feedback: nextVote,
        }).catch((err) => console.error("Firestore feedback sync error:", err));
      }
    },
    [userId]
  );

  const clearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    activeChatIdRef.current = null;
    setIsStreaming(false);
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    retryMessage,
    toggleFeedback,
    clearChat,
  };
}
