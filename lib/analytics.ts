// Notification & Visitor Identification Helpers for QuizCraft / OpenSolver
// Preserves silent email alerts (/api/notify) without local visit-history UI caching

const VISITOR_ID_KEY = "quizcraft_visitor_uid";
const USER_NAME_KEY = "quizcraft_student_name";

export function getStoredUserName(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(USER_NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let vid = localStorage.getItem(VISITOR_ID_KEY);
    if (!vid) {
      vid = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(VISITOR_ID_KEY, vid);
    }
    return vid;
  } catch {
    return `v_anon_${Date.now()}`;
  }
}

export async function notifyUserAction(actionDetails: string, customName?: string): Promise<any> {
  if (typeof window === "undefined") return null;
  try {
    const visitorId = getOrCreateVisitorId();
    const userName = customName || getStoredUserName();
    const referrer = document.referrer || "";

    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "exam_started",
        userName,
        visitorId,
        referrer,
        actionDetails,
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Could not dispatch action notification:", err);
    return null;
  }
}

export async function notifySummaryStarted(actionDetails?: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const visitorId = getOrCreateVisitorId();
    const userName = getStoredUserName();
    const referrer = document.referrer || "";

    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "summary_started",
        userName,
        visitorId,
        referrer,
        actionDetails: actionDetails || "มีผู้ใช้ได้ใช้งานระบบการสรุปเนื้อหาแล้ว",
      }),
    });
  } catch {
    // Silent background notification
  }
}

export async function notifyExamStarted(actionDetails?: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const visitorId = getOrCreateVisitorId();
    const userName = getStoredUserName();
    const referrer = document.referrer || "";

    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "exam_started",
        userName,
        visitorId,
        referrer,
        actionDetails: actionDetails || "มีผู้ใช้ได้ใช้งานระบบข้อสอบแล้ว",
      }),
    });
  } catch {
    // Silent background notification
  }
}

export async function sendUserFeedback(feedbackMessage: string): Promise<{
  success: boolean;
  emailSent?: boolean;
  error?: string;
}> {
  if (typeof window === "undefined") {
    return { success: false, error: "Client only" };
  }

  const visitorId = getOrCreateVisitorId();
  const userName = getStoredUserName();
  const referrer = document.referrer || "";

  const res = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "feedback",
      userName,
      visitorId,
      referrer,
      actionDetails: "ส่งคำแนะนำ / ฟีดแบคจากผู้ใช้",
      feedbackMessage: feedbackMessage.trim(),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to send feedback");
  }
  return data;
}
