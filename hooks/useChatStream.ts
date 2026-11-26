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
import {
  SavedChatSession,
  loadBrowserChats,
  saveBrowserChats,
  sortBrowserChats,
  deriveFallbackChatTitle,
} from "@/lib/browser-chats";
import {
  StructuredTableData,
  sanitizeStructuredTables,
  tableToTsv,
} from "@/lib/structured-table";
import { MathCanvasData, sanitizeMathCanvases } from "@/lib/math-canvas";

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

interface ActivePersonaOption {
  id: string;
  name: string;
  description: string;
}

interface UseChatStreamOptions {
  customApiKey: string | null;
  language: Language;
  userId?: string | null;
  activePersona?: ActivePersonaOption | null;
}

export function useChatStream({
  customApiKey,
  language,
  userId,
  activePersona = null,
}: UseChatStreamOptions) {
  const storageOwnerId = userId || "local";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [savedChats, setSavedChats] = useState<SavedChatSession[]>(() =>
    loadBrowserChats(storageOwnerId)
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const activeChatIdRef = useRef<string | null>(null);
  const savedChatsRef = useRef<SavedChatSession[]>(savedChats);
  const activePersonaRef = useRef<ActivePersonaOption | null>(activePersona);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    savedChatsRef.current = savedChats;
  }, [savedChats]);

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

  const commitBrowserChats = useCallback(
    (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => {
      const next = sortBrowserChats(updater(savedChatsRef.current));
      savedChatsRef.current = next;
      setSavedChats(next);
      saveBrowserChats(storageOwnerId, next);
    },
    [storageOwnerId]
  );

  const generateAiTitleInBackground = useCallback(
    async (
      chatId: string,
      firstUserText: string,
      firstAssistantReply: string
    ) => {
      const existing = savedChatsRef.current.find((c) => c.id === chatId);
      if (!existing || existing.hasAiTitle) return;

      try {
        const res = await fetch("/api/chat-title", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getCustomApiHeaders(customApiKey),
          },
          body: JSON.stringify({
            userMessage: firstUserText,
            assistantReply: firstAssistantReply.slice(0, 800),
            language,
            customApiKey: customApiKey || undefined,
          }),
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const aiTitle =
          typeof data?.title === "string" ? data.title.trim() : "";
        if (!aiTitle) return;

        commitBrowserChats((prev) =>
          prev.map((c) =>
            c.id === chatId ? { ...c, title: aiTitle, hasAiTitle: true } : c
          )
        );
      } catch {
        // Silent fallback keeps initial summarized title
      }
    },
    [commitBrowserChats, customApiKey, language]
  );

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
      let accumulatedTables: StructuredTableData[] = [];
      let accumulatedCanvases: MathCanvasData[] = [];

      const updateTargetContent = (
        content: string,
        status: ChatMessage["status"]
      ) => {
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === targetAiId
              ? {
                  ...m,
                  content,
                  status,
                  ...(accumulatedTables.length > 0
                    ? { tables: accumulatedTables }
                    : {}),
                  ...(accumulatedCanvases.length > 0
                    ? { canvases: accumulatedCanvases }
                    : {}),
                }
              : m
          );
          messagesRef.current = next;
          return next;
        });
      };

      const appendTableToTarget = (table: StructuredTableData) => {
        accumulatedTables = [...accumulatedTables, table];
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === targetAiId ? { ...m, tables: accumulatedTables } : m
          );
          messagesRef.current = next;
          return next;
        });
      };

      const appendCanvasToTarget = (canvas: MathCanvasData) => {
        accumulatedCanvases = [...accumulatedCanvases, canvas];
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === targetAiId ? { ...m, canvases: accumulatedCanvases } : m
          );
          messagesRef.current = next;
          return next;
        });
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
          if (chatIdForPersist && activeChatIdRef.current === chatIdForPersist) {
            const snapshotMessages = messagesRef.current;
            commitBrowserChats((prev) =>
              prev.map((c) =>
                c.id === chatIdForPersist
                  ? { ...c, messages: snapshotMessages, updatedAt: Date.now() }
                  : c
              )
            );
          }
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
                if (parsed?.table) {
                  const validTables = sanitizeStructuredTables([parsed.table]);
                  if (validTables && validTables.length > 0) {
                    appendTableToTarget(validTables[0]);
                  }
                }
                if (parsed?.canvas) {
                  const validCanvases = sanitizeMathCanvases([parsed.canvas]);
                  if (validCanvases && validCanvases.length > 0) {
                    appendCanvasToTarget(validCanvases[0]);
                  }
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
          const hasAnyOutput =
            accumulatedText.length > 0 ||
            accumulatedTables.length > 0 ||
            accumulatedCanvases.length > 0;
          const finalText =
            accumulatedText ||
            (accumulatedTables.length > 0 || accumulatedCanvases.length > 0
              ? ""
              : language === "en"
                ? "No response received. Please try again."
                : "ไม่ได้รับข้อความตอบกลับ กรุณากดลองใหม่อีกครั้ง");
          const finalStatus: ChatMessage["status"] = hasAnyOutput
            ? "done"
            : "error";
          updateTargetContent(finalText, finalStatus);

          if (chatIdForPersist && activeChatIdRef.current === chatIdForPersist) {
            const snapshotMessages = messagesRef.current;
            const now = Date.now();
            commitBrowserChats((prev) =>
              prev.map((c) =>
                c.id === chatIdForPersist
                  ? { ...c, messages: snapshotMessages, updatedAt: now }
                  : c
              )
            );

            if (finalStatus === "done") {
              const firstUserMsg = snapshotMessages.find((m) => m.role === "user");
              const titleInput =
                firstUserMsg?.attachments && firstUserMsg.attachments.length > 0
                  ? `${firstUserMsg.attachments.map((a) => a.title).join(", ")}: ${
                      firstUserMsg.content
                    }`
                  : firstUserMsg?.content || "";
              if (titleInput) {
                generateAiTitleInBackground(chatIdForPersist, titleInput, finalText);
              }
            }
          }

          if (finalStatus === "done" && userId && chatIdForPersist) {
            const firestoreText =
              finalText ||
              [
                ...accumulatedTables.map((t) => `[Table] ${t.title}`),
                ...accumulatedCanvases.map((c) => `[Graph] ${c.title}`),
              ].join("\n") ||
              " ";
            if (isRetryPersist) {
              updateAssistantMessageContent({
                userId,
                chatId: chatIdForPersist,
                messageId: targetAiId,
                content: firestoreText,
              }).catch((err) => console.error("Firestore retry sync error:", err));
            } else {
              persistChatMessage({
                userId,
                chatId: chatIdForPersist,
                messageId: targetAiId,
                role: "assistant",
                content: firestoreText,
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
        if (chatIdForPersist && activeChatIdRef.current === chatIdForPersist) {
          const snapshotMessages = messagesRef.current;
          commitBrowserChats((prev) =>
            prev.map((c) =>
              c.id === chatIdForPersist
                ? { ...c, messages: snapshotMessages, updatedAt: Date.now() }
                : c
            )
          );
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsStreaming(false);
        }
      }
    },
    [
      commitBrowserChats,
      customApiKey,
      generateAiTitleInBackground,
      language,
      userId,
    ]
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

      const attachmentMetas =
        attachedHistory.length > 0
          ? attachedHistory.map((item) => ({
              id: item.id,
              type: item.type,
              title: item.title,
              subject: item.subject,
            }))
          : undefined;

      const userMsgId = makeSafeFirestoreId("user");
      const userMsg: ChatMessage = {
        id: userMsgId,
        role: "user",
        content: displayContent,
        apiContent,
        attachments: attachmentMetas,
        status: "done",
        feedback: null,
      };

      const currentPersona = activePersonaRef.current;
      const aiMsgId = makeSafeFirestoreId("ai");
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        personaId: currentPersona ? currentPersona.id : "",
        personaName: currentPersona ? currentPersona.name : "",
        status: "streaming",
        feedback: null,
      };

      const isFirstMessageInSession = !activeChatIdRef.current;
      const chatId = activeChatIdRef.current || makeSafeFirestoreId("chat");
      activeChatIdRef.current = chatId;
      setActiveChatId(chatId);

      const nextMessages = [...messagesRef.current, userMsg, aiMsg];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);

      // Save immediately to browser localStorage
      const now = Date.now();
      const fallbackTitle = deriveFallbackChatTitle(
        displayContent,
        attachmentMetas
      );
      commitBrowserChats((prev) => {
        const exists = prev.some((c) => c.id === chatId);
        if (exists) {
          return prev.map((c) =>
            c.id === chatId
              ? { ...c, messages: nextMessages, updatedAt: now }
              : c
          );
        }
        return [
          {
            id: chatId,
            title: fallbackTitle,
            hasAiTitle: false,
            isPinned: false,
            pinnedAt: null,
            createdAt: now,
            updatedAt: now,
            messages: nextMessages,
          },
          ...prev,
        ];
      });

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

      const formatMsgForHistory = (m: ChatMessage) => {
        const parts: string[] = [];
        const base = (m.apiContent || m.content).trim();
        if (base) parts.push(base);
        if (m.tables && m.tables.length > 0) {
          parts.push(
            m.tables.map((t) => `[Table: ${t.title}]\n${tableToTsv(t)}`).join("\n\n")
          );
        }
        if (m.canvases && m.canvases.length > 0) {
          parts.push(
            m.canvases
              .map((c) => `[Graph Canvas: ${c.title} (${c.gridMode}, X:[${c.xMin},${c.xMax}], Y:[${c.yMin},${c.yMax}])]`)
              .join("\n")
          );
        }
        return parts.join("\n\n");
      };

      const historyForApi = [
        ...messagesRef.current
          .slice(0, -2)
          .filter(
            (m) =>
              m.status !== "error" && formatMsgForHistory(m).trim().length > 0
          )
          .map((m) => ({ role: m.role, content: formatMsgForHistory(m) })),
        { role: "user" as const, content: apiContent },
      ];

      await streamAssistantReply(aiMsgId, historyForApi, chatId, false);
    },
    [commitBrowserChats, isStreaming, language, streamAssistantReply, userId]
  );

  const retryMessage = useCallback(
    async (aiMessageId: string) => {
      if (isStreaming) return;

      const current = messagesRef.current;
      const targetIndex = current.findIndex((m) => m.id === aiMessageId);
      if (targetIndex === -1) return;

      const targetMsg = current[targetIndex];
      const wasPreviousError = targetMsg.status === "error";

      const formatMsgForHistory = (m: ChatMessage) => {
        const parts: string[] = [];
        const base = (m.apiContent || m.content).trim();
        if (base) parts.push(base);
        if (m.tables && m.tables.length > 0) {
          parts.push(
            m.tables.map((t) => `[Table: ${t.title}]\n${tableToTsv(t)}`).join("\n\n")
          );
        }
        if (m.canvases && m.canvases.length > 0) {
          parts.push(
            m.canvases
              .map((c) => `[Graph Canvas: ${c.title} (${c.gridMode}, X:[${c.xMin},${c.xMax}], Y:[${c.yMin},${c.yMax}])]`)
              .join("\n")
          );
        }
        return parts.join("\n\n");
      };

      const historyUpToPrompt = current
        .slice(0, targetIndex)
        .filter(
          (m) =>
            m.status !== "error" && formatMsgForHistory(m).trim().length > 0
        )
        .map((m) => ({ role: m.role, content: formatMsgForHistory(m) }));

      if (historyUpToPrompt.length === 0) return;

      const currentPersona = activePersonaRef.current;
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === aiMessageId
            ? {
                ...m,
                content: "",
                tables: undefined,
                canvases: undefined,
                personaId: currentPersona ? currentPersona.id : "",
                personaName: currentPersona ? currentPersona.name : "",
                status: "streaming" as const,
                feedback: null,
              }
            : m
        );
        messagesRef.current = next;
        return next;
      });

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
      const nextMessages = messagesRef.current.map((m) => {
        if (m.id !== aiMessageId) return m;
        nextVote = m.feedback === vote ? null : vote;
        return { ...m, feedback: nextVote };
      });
      messagesRef.current = nextMessages;
      setMessages(nextMessages);

      const currentChatId = activeChatIdRef.current;
      if (currentChatId) {
        commitBrowserChats((prev) =>
          prev.map((c) =>
            c.id === currentChatId ? { ...c, messages: nextMessages } : c
          )
        );
      }

      if (userId && currentChatId) {
        updateMessageFeedbackInFirestore({
          userId,
          chatId: currentChatId,
          messageId: aiMessageId,
          feedback: nextVote,
        }).catch((err) => console.error("Firestore feedback sync error:", err));
      }
    },
    [commitBrowserChats, userId]
  );

  const selectChat = useCallback((chatId: string) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);

    const target = savedChatsRef.current.find((c) => c.id === chatId);
    if (!target) return;

    activeChatIdRef.current = target.id;
    setActiveChatId(target.id);
    messagesRef.current = target.messages;
    setMessages(target.messages);
  }, []);

  const togglePinChat = useCallback(
    (chatId: string) => {
      const now = Date.now();
      commitBrowserChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          const nextPinned = !c.isPinned;
          return {
            ...c,
            isPinned: nextPinned,
            pinnedAt: nextPinned ? now : null,
          };
        })
      );
    },
    [commitBrowserChats]
  );

  const deleteChat = useCallback(
    (chatId: string) => {
      commitBrowserChats((prev) => prev.filter((c) => c.id !== chatId));

      if (activeChatIdRef.current === chatId) {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        activeChatIdRef.current = null;
        setActiveChatId(null);
        setIsStreaming(false);
        messagesRef.current = [];
        setMessages([]);
      }
    },
    [commitBrowserChats]
  );

  const clearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    activeChatIdRef.current = null;
    setActiveChatId(null);
    setIsStreaming(false);
    messagesRef.current = [];
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    savedChats,
    activeChatId,
    sendMessage,
    retryMessage,
    toggleFeedback,
    selectChat,
    togglePinChat,
    deleteChat,
    clearChat,
  };
}
