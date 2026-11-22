import {
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";

const MAX_TITLE_LENGTH = 160;
const MAX_CONTENT_LENGTH = 50000;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export function makeSafeFirestoreId(prefix: string): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16) || "id";
  const rand = Math.random().toString(36).slice(2, 9);
  return `${cleanPrefix}-${Date.now()}-${rand}`;
}

function assertSafeId(id: string): string {
  if (SAFE_ID_PATTERN.test(id)) return id;
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128) || makeSafeFirestoreId("doc");
}

function clampText(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (!trimmed) return " ";
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

export async function persistNewChatWithUserMessage(params: {
  userId: string;
  chatId: string;
  userMessageId: string;
  userContent: string;
}): Promise<void> {
  const uid = assertSafeId(params.userId);
  const cid = assertSafeId(params.chatId);
  const mid = assertSafeId(params.userMessageId);

  const chatPath = `users/${uid}/chats/${cid}`;
  const msgPath = `${chatPath}/messages/${mid}`;

  const safeTitle = clampText(params.userContent.replace(/\s+/g, " "), MAX_TITLE_LENGTH);
  const safeContent = clampText(params.userContent, MAX_CONTENT_LENGTH);

  try {
    const batch = writeBatch(db);
    const chatRef = doc(db, "users", uid, "chats", cid);
    const msgRef = doc(db, "users", uid, "chats", cid, "messages", mid);

    batch.set(chatRef, {
      id: cid,
      userId: uid,
      title: safeTitle,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(msgRef, {
      id: mid,
      userId: uid,
      chatId: cid,
      role: "user",
      content: safeContent,
      feedback: "none",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, msgPath);
  }
}

export async function persistChatMessage(params: {
  userId: string;
  chatId: string;
  messageId: string;
  role: "user" | "assistant";
  content: string;
}): Promise<void> {
  const uid = assertSafeId(params.userId);
  const cid = assertSafeId(params.chatId);
  const mid = assertSafeId(params.messageId);

  const chatPath = `users/${uid}/chats/${cid}`;
  const msgPath = `${chatPath}/messages/${mid}`;
  const safeContent = clampText(params.content, MAX_CONTENT_LENGTH);

  try {
    const msgRef = doc(db, "users", uid, "chats", cid, "messages", mid);
    await setDoc(msgRef, {
      id: mid,
      userId: uid,
      chatId: cid,
      role: params.role,
      content: safeContent,
      feedback: "none",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, msgPath);
  }
}

export async function updateAssistantMessageContent(params: {
  userId: string;
  chatId: string;
  messageId: string;
  content: string;
}): Promise<void> {
  const uid = assertSafeId(params.userId);
  const cid = assertSafeId(params.chatId);
  const mid = assertSafeId(params.messageId);

  const msgPath = `users/${uid}/chats/${cid}/messages/${mid}`;
  const safeContent = clampText(params.content, MAX_CONTENT_LENGTH);

  try {
    const msgRef = doc(db, "users", uid, "chats", cid, "messages", mid);
    await updateDoc(msgRef, {
      content: safeContent,
      feedback: "none",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, msgPath);
  }
}

export async function updateMessageFeedbackInFirestore(params: {
  userId: string;
  chatId: string;
  messageId: string;
  feedback: "up" | "down" | null;
}): Promise<void> {
  const uid = assertSafeId(params.userId);
  const cid = assertSafeId(params.chatId);
  const mid = assertSafeId(params.messageId);

  const msgPath = `users/${uid}/chats/${cid}/messages/${mid}`;
  const mappedFeedback: "up" | "down" | "none" =
    params.feedback === "up" || params.feedback === "down"
      ? params.feedback
      : "none";

  try {
    const msgRef = doc(db, "users", uid, "chats", cid, "messages", mid);
    await updateDoc(msgRef, {
      feedback: mappedFeedback,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, msgPath);
  }
}
