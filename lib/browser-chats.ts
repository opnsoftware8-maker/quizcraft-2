import { ChatMessage, ChatAttachmentMeta } from "@/components/ChatMessageList";
import { sanitizeStructuredTables } from "@/lib/structured-table";

export interface SavedChatSession {
  id: string;
  title: string;
  hasAiTitle: boolean;
  isPinned: boolean;
  pinnedAt: number | null;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const STORAGE_PREFIX = "opensolver_browser_chats_v1_";
const MAX_CHATS_PER_USER = 100;

function getStorageKey(userId: string): string {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128) || "anon";
  return `${STORAGE_PREFIX}${safeId}`;
}

export function sortBrowserChats(
  chats: SavedChatSession[]
): SavedChatSession[] {
  return [...chats].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    if (a.isPinned && b.isPinned) {
      const aPin = a.pinnedAt ?? a.updatedAt;
      const bPin = b.pinnedAt ?? b.updatedAt;
      if (aPin !== bPin) return bPin - aPin;
    }
    return b.updatedAt - a.updatedAt;
  });
}

export function deriveFallbackChatTitle(
  firstMessage: string,
  attachments?: ChatAttachmentMeta[]
): string {
  const cleaned = firstMessage.replace(/\s+/g, " ").trim();
  const defaultEnPrompt =
    "Help me review and discuss the attached study materials.";
  const defaultThPrompt =
    "ช่วยอธิบายและพูดคุยเกี่ยวกับเนื้อหาที่แนบมานี้";

  if (
    attachments &&
    attachments.length > 0 &&
    (!cleaned || cleaned === defaultEnPrompt || cleaned === defaultThPrompt)
  ) {
    const joined = attachments.map((a) => a.title).join(", ");
    return joined.length > 52 ? `${joined.slice(0, 52).trim()}...` : joined;
  }

  if (!cleaned) {
    return "New chat";
  }

  return cleaned.length > 52 ? `${cleaned.slice(0, 52).trim()}...` : cleaned;
}

export function loadBrowserChats(userId: string): SavedChatSession[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const valid: SavedChatSession[] = parsed
      .filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          Array.isArray(item.messages)
      )
      .map((item) => ({
        id: item.id,
        title: item.title || "New chat",
        hasAiTitle: Boolean(item.hasAiTitle),
        isPinned: Boolean(item.isPinned),
        pinnedAt: typeof item.pinnedAt === "number" ? item.pinnedAt : null,
        createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
        updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now(),
        messages: item.messages.map((m: any) => ({
          id: String(m.id || ""),
          role: m.role === "assistant" ? "assistant" : "user",
          content: typeof m.content === "string" ? m.content : "",
          apiContent: typeof m.apiContent === "string" ? m.apiContent : undefined,
          attachments: Array.isArray(m.attachments) ? m.attachments : undefined,
          tables: sanitizeStructuredTables(m.tables),
          personaId: typeof m.personaId === "string" ? m.personaId : undefined,
          personaName:
            typeof m.personaName === "string" ? m.personaName : undefined,
          status:
            m.status === "error"
              ? "error"
              : m.status === "streaming"
                ? "done"
                : "done",
          feedback:
            m.feedback === "up" || m.feedback === "down" ? m.feedback : null,
        })),
      }));

    return sortBrowserChats(valid);
  } catch {
    return [];
  }
}

export function saveBrowserChats(
  userId: string,
  chats: SavedChatSession[]
): void {
  if (typeof window === "undefined" || !userId) return;
  const key = getStorageKey(userId);
  const sorted = sortBrowserChats(chats).slice(0, MAX_CHATS_PER_USER);

  try {
    window.localStorage.setItem(key, JSON.stringify(sorted));
  } catch {
    // If localStorage quota is tight, keep pinned + most recent unpinned chats
    try {
      const trimmed = sorted.slice(0, Math.max(10, Math.floor(sorted.length / 2)));
      window.localStorage.setItem(key, JSON.stringify(trimmed));
    } catch {
      // ignore unrecoverable storage quota errors
    }
  }
}
