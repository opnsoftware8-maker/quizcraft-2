import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Path for persistence in temporary directory to survive hot reloads
const CACHE_FILE = path.join("/tmp", "quizcraft_real_analytics.json");

interface SessionEntry {
  visitorId: string;
  lastPing: number;
  device: string;
  referrer: string;
}

interface StoredAnalytics {
  totalPageViews: number;
  uniqueVisitors: string[];
  activeSessions: Record<string, SessionEntry>;
  dailyLogs: Record<string, { pageViews: number; uniqueVisitors: string[] }>;
  hourlyLogs: Record<string, number>;
  trafficSources: Record<string, number>;
  deviceCounts: Record<string, number>;
  featureCounts: Record<string, number>;
  createdAt: string;
  lastUpdatedAt: string;
}

// Global in-memory singleton to keep fast state across requests
declare global {
  var __realAnalyticsStore: StoredAnalytics | undefined;
}

function initAnalyticsStore(): StoredAnalytics {
  if (globalThis.__realAnalyticsStore) {
    return globalThis.__realAnalyticsStore;
  }

  // Try reading from file cache
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const fileData = fs.readFileSync(CACHE_FILE, "utf8");
      const parsed: StoredAnalytics = JSON.parse(fileData);
      if (parsed && typeof parsed.totalPageViews === "number") {
        globalThis.__realAnalyticsStore = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not load analytics cache from disk:", e);
  }

  // Start with fresh 100% real tracking
  const initialStore: StoredAnalytics = {
    totalPageViews: 0,
    uniqueVisitors: [],
    activeSessions: {},
    dailyLogs: {},
    hourlyLogs: {},
    trafficSources: {
      "เข้าชมโดยตรง (Direct)": 0,
      "Google Search": 0,
      "โซเชียลมีเดีย (Social)": 0,
      "ลิงก์แนะนำ (Referral)": 0,
    },
    deviceCounts: {
      "คอมพิวเตอร์ (Desktop)": 0,
      "สมาร์ตโฟน (Mobile)": 0,
      "แท็บเล็ต (Tablet)": 0,
    },
    featureCounts: {
      quiz: 0,
      summary: 0,
      flashcard: 0,
      subjective: 0,
    },
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };

  globalThis.__realAnalyticsStore = initialStore;
  return initialStore;
}

function saveAnalyticsStore(store: StoredAnalytics) {
  globalThis.__realAnalyticsStore = store;
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store), "utf8");
  } catch (e) {
    // ignore disk write errors in restricted envs
  }
}

function detectDevice(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    return "แท็บเล็ต (Tablet)";
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return "สมาร์ตโฟน (Mobile)";
  }
  return "คอมพิวเตอร์ (Desktop)";
}

function categorizeReferrer(referrer: string): string {
  if (!referrer || referrer.trim() === "") {
    return "เข้าชมโดยตรง (Direct)";
  }
  const ref = referrer.toLowerCase();
  if (ref.includes("google.")) {
    return "Google Search";
  }
  if (
    ref.includes("facebook.") ||
    ref.includes("instagram.") ||
    ref.includes("t.co") ||
    ref.includes("twitter.") ||
    ref.includes("x.com") ||
    ref.includes("tiktok.") ||
    ref.includes("youtube.")
  ) {
    return "โซเชียลมีเดีย (Social)";
  }
  return "ลิงก์แนะนำ (Referral)";
}

function cleanExpiredSessions(store: StoredAnalytics) {
  const now = Date.now();
  // 45 seconds heartbeat timeout for active online sessions
  const timeoutMs = 45000;
  for (const [sessId, session] of Object.entries(store.activeSessions)) {
    if (now - session.lastPing > timeoutMs) {
      delete store.activeSessions[sessId];
    }
  }
}

function buildClientPayload(store: StoredAnalytics) {
  cleanExpiredSessions(store);

  // Active online users: distinct visitors currently with active sessions
  const activeVisitorSet = new Set(
    Object.values(store.activeSessions).map((s) => s.visitorId)
  );
  // Ensure at least 1 if an active session is making the request
  const activeOnlineUsers = Math.max(activeVisitorSet.size, 1);

  // Current date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];
  const todayLog = store.dailyLogs[todayStr] || { pageViews: 0, uniqueVisitors: [] };

  // Calculate 7 days trailing history
  const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const dailyHistory = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = dayNames[d.getDay()];
    const log = store.dailyLogs[dateStr];

    dailyHistory.push({
      date: dateStr,
      dayLabel,
      pageViews: log ? log.pageViews : 0,
      uniqueVisitors: log ? log.uniqueVisitors.length : 0,
    });
  }

  // 24-hour distribution (00:00 to 22:00 in 2-hour slots)
  const hourlyHistory = [];
  for (let h = 0; h < 24; h += 2) {
    const hourKey = `${h.toString().padStart(2, "0")}:00`;
    const nextHourKey = `${(h + 1).toString().padStart(2, "0")}:00`;
    const count = (store.hourlyLogs[hourKey] || 0) + (store.hourlyLogs[nextHourKey] || 0);
    hourlyHistory.push({
      hour: hourKey,
      visitors: count,
    });
  }

  // Calculate traffic source percentages
  const totalRefHits = Object.values(store.trafficSources).reduce((a, b) => a + b, 0);
  const trafficSources = Object.entries(store.trafficSources).map(([source, count]) => ({
    source,
    visitors: count,
    percentage: totalRefHits > 0 ? Math.round((count / totalRefHits) * 100) : 0,
  }));

  // Calculate device percentages
  const totalDeviceHits = Object.values(store.deviceCounts).reduce((a, b) => a + b, 0);
  const deviceStats = Object.entries(store.deviceCounts).map(([device, count]) => ({
    device,
    count,
    percentage: totalDeviceHits > 0 ? Math.round((count / totalDeviceHits) * 100) : 0,
  }));

  const featureMetrics = [
    { name: "สร้างชุดข้อสอบปรนัย (Mock Exam)", count: store.featureCounts.quiz || 0, unit: "ชุด" },
    { name: "สรุปบทเรียนและวิเคราะห์เนื้อหา (AI Summary)", count: store.featureCounts.summary || 0, unit: "ครั้ง" },
    { name: "ท่องและทบทวนแฟลชการ์ด (Flashcards)", count: store.featureCounts.flashcard || 0, unit: "รอบ" },
    { name: "ทำข้อสอบเขียนอัตนัย (Subjective Exam)", count: store.featureCounts.subjective || 0, unit: "ชุด" },
  ];

  return {
    totalPageViews: store.totalPageViews,
    totalUniqueVisitors: store.uniqueVisitors.length,
    todayPageViews: todayLog.pageViews,
    todayUniqueVisitors: todayLog.uniqueVisitors.length,
    activeOnlineUsers,
    lastUpdated: store.lastUpdatedAt,
    dailyHistory,
    hourlyHistory,
    trafficSources,
    deviceStats,
    featureMetrics,
    isRealData: true,
  };
}

export async function GET() {
  const store = initAnalyticsStore();
  const payload = buildClientPayload(store);
  return NextResponse.json(payload);
}

export async function POST(req: NextRequest) {
  try {
    const store = initAnalyticsStore();
    const body = await req.json();
    const {
      type = "heartbeat",
      visitorId,
      sessionId,
      referrer = "",
      actionName,
    } = body;

    const userAgent = req.headers.get("user-agent") || "";
    const detectedDevice = detectDevice(userAgent);
    const detectedSource = categorizeReferrer(referrer || req.headers.get("referer") || "");
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentHourKey = `${now.getHours().toString().padStart(2, "0")}:00`;

    // 1. Handle heartbeat / session ping
    if (sessionId && visitorId) {
      store.activeSessions[sessionId] = {
        visitorId,
        lastPing: Date.now(),
        device: detectedDevice,
        referrer: detectedSource,
      };
    }

    // 2. Handle actual pageview event
    if (type === "pageview" && visitorId) {
      store.totalPageViews += 1;

      // Track unique visitor in all-time list
      if (!store.uniqueVisitors.includes(visitorId)) {
        store.uniqueVisitors.push(visitorId);
      }

      // Track daily log
      if (!store.dailyLogs[todayStr]) {
        store.dailyLogs[todayStr] = { pageViews: 0, uniqueVisitors: [] };
      }
      store.dailyLogs[todayStr].pageViews += 1;
      if (!store.dailyLogs[todayStr].uniqueVisitors.includes(visitorId)) {
        store.dailyLogs[todayStr].uniqueVisitors.push(visitorId);
      }

      // Track hourly count
      store.hourlyLogs[currentHourKey] = (store.hourlyLogs[currentHourKey] || 0) + 1;

      // Track source & device
      store.trafficSources[detectedSource] = (store.trafficSources[detectedSource] || 0) + 1;
      store.deviceCounts[detectedDevice] = (store.deviceCounts[detectedDevice] || 0) + 1;
    }

    // 3. Handle feature action click
    if (type === "action" && actionName) {
      if (typeof store.featureCounts[actionName] === "number") {
        store.featureCounts[actionName] += 1;
      }
    }

    store.lastUpdatedAt = new Date().toISOString();
    saveAnalyticsStore(store);

    const payload = buildClientPayload(store);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Analytics endpoint error:", error);
    return NextResponse.json({ error: "Failed to record analytics" }, { status: 500 });
  }
}
