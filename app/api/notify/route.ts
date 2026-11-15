import { NextRequest, NextResponse } from "next/server";

// Keep recent notification logs in memory so admin can view them on the dashboard
interface NotificationRecord {
  id: string;
  timestamp: string;
  eventType: "visit" | "name_registered" | "exam_started" | "test";
  userName: string;
  visitorId: string;
  device: string;
  source: string;
  actionDetails: string;
  emailSent: boolean;
  emailDestination: string;
  deliveryStatus: string;
}

declare global {
  var __notificationLogs: NotificationRecord[] | undefined;
  var __lastNotifiedTimeMap: Record<string, number> | undefined;
}

function getNotificationLogs(): NotificationRecord[] {
  if (!globalThis.__notificationLogs) {
    globalThis.__notificationLogs = [];
  }
  return globalThis.__notificationLogs;
}

function getLastNotifiedMap(): Record<string, number> {
  if (!globalThis.__lastNotifiedTimeMap) {
    globalThis.__lastNotifiedTimeMap = {};
  }
  return globalThis.__lastNotifiedTimeMap;
}

function detectDevice(userAgent: string): string {
  const ua = (userAgent || "").toLowerCase();
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
    return "เข้าชมโดยตรง (Direct Link)";
  }
  const ref = referrer.toLowerCase();
  if (ref.includes("tiktok.")) return "TikTok";
  if (ref.includes("t.co") || ref.includes("twitter.") || ref.includes("x.com")) return "X (Twitter)";
  if (ref.includes("facebook.") || ref.includes("fb.")) return "Facebook";
  if (ref.includes("instagram.")) return "Instagram";
  if (ref.includes("google.")) return "Google Search";
  if (ref.includes("youtube.")) return "YouTube";
  return `ลิงก์แนะนำ (${ref.substring(0, 30)})`;
}

// Format date to Thai localized format
function formatThaiTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

// Send email using Resend HTTP API (No heavy SDK required, 100% compatible with Vercel Edge/Serverless)
async function sendEmailViaResend(
  apiKey: string,
  toEmail: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "QuizCraft Alert <onboarding@resend.dev>",
        to: [toEmail.trim()],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, error: `Resend API Error: ${res.status} - ${errBody}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to call Resend" };
  }
}

// Send webhook push notification (Discord / Telegram / Slack)
async function sendWebhookNotification(webhookUrl: string, message: string) {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: message,
        text: message, // for Slack/Telegram compatibility
      }),
    });
  } catch (err) {
    console.warn("Webhook delivery error:", err);
  }
}

export async function GET() {
  const logs = getNotificationLogs();
  const targetEmail = process.env.NOTIFICATION_EMAIL || "numheng543@gmail.com";
  const hasResendKey = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== "");
  const hasWebhook = Boolean(process.env.NOTIFICATION_WEBHOOK_URL && process.env.NOTIFICATION_WEBHOOK_URL.trim() !== "");

  return NextResponse.json({
    configuredEmail: targetEmail,
    hasResendKey,
    hasWebhook,
    recentLogs: logs.slice(0, 30),
    totalLogged: logs.length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventType = "visit",
      userName = "",
      visitorId = "",
      referrer = "",
      actionDetails = "เปิดเข้าชมหน้าแรก",
      isTest = false,
    } = body;

    const userAgent = req.headers.get("user-agent") || "";
    const detectedDevice = detectDevice(userAgent);
    const detectedSource = categorizeReferrer(referrer || req.headers.get("referer") || "");
    const now = new Date();
    const thaiFormattedTime = formatThaiTime(now);

    // Rate-limiting check (Avoid spamming email on rapid refreshes)
    // Same visitor will not trigger an email notification more than once every 3 minutes, unless isTest is true
    const lastNotifiedMap = getLastNotifiedMap();
    const nowMs = Date.now();
    const cooldownPeriodMs = 3 * 60 * 1000; // 3 minutes
    const throttleKey = `${visitorId || "anon"}_${eventType}`;

    if (!isTest && lastNotifiedMap[throttleKey] && (nowMs - lastNotifiedMap[throttleKey] < cooldownPeriodMs)) {
      return NextResponse.json({
        success: true,
        throttled: true,
        message: "แจ้งเตือนถูกหน่วงเวลาเพื่อป้องกันการส่งอีเมลซ้ำซ้อน",
      });
    }

    lastNotifiedMap[throttleKey] = nowMs;

    // Determine user display label
    let displayName = userName.trim();
    if (!displayName) {
      const shortId = (visitorId || "").slice(-5).toUpperCase();
      displayName = `ผู้เข้าชมเครื่อง [${detectedDevice}] ${shortId ? `#${shortId}` : ""}`.trim();
    }
    const targetEmail = process.env.NOTIFICATION_EMAIL || "numheng543@gmail.com";
    const resendApiKey = process.env.RESEND_API_KEY || "";
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL || "";

    // Email Subject
    let subject = `🔔 มีคนกดเข้าเว็บ QuizCraft: ${displayName} (ผ่าน ${detectedSource})`;
    if (eventType === "exam_started") {
      subject = `📝 ผู้ใช้ [${detectedDevice}] เริ่มทำข้อสอบ (${actionDetails})`;
    } else if (isTest) {
      subject = `🧪 [ทดสอบระบบ] การแจ้งเตือนอีเมล QuizCraft ใช้งานได้สมบูรณ์!`;
    }

    // Modern, highly readable HTML email template with clear hierarchy
    const htmlEmail = `
      <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;">
        <div style="background-color: #0f172a; padding: 24px; text-align: left; border-bottom: 3px solid #0284c7;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">
            QuizCraft • มีคนกดเข้าใช้งานเว็บไซต์
          </h1>
          <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">
            ระบบตรวจจับผู้เข้าชมอัตโนมัติแบบเรียลไทม์ (ไม่ต้องกรอกข้อมูล)
          </p>
        </div>

        <div style="padding: 24px;">
          <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #0284c7; margin-bottom: 4px;">
              สถานะผู้เข้าชม
            </div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a;">
              ${displayName}
            </div>
            <div style="font-size: 13px; color: #0369a1; margin-top: 4px;">
              กิจกรรม: <strong>${actionDetails}</strong>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 150px;">⏰ วันที่และเวลา:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #0f172a;">${thaiFormattedTime}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">📱 ชนิดอุปกรณ์:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #0f172a;">${detectedDevice}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">🌐 แหล่งที่มา (Traffic):</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #0284c7;">${detectedSource}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">🆔 Visitor Machine ID:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-family: monospace; font-size: 12px; color: #475569;">${visitorId || "ไม่ระบุ"}</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 24px;">
            <a href="https://quizcarft.vercel.app" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">
              เปิดดูหน้าเว็บ QuizCraft
            </a>
          </div>
        </div>

        <div style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
          การแจ้งเตือนนี้ส่งอัตโนมัติจากระบบ QuizCraft บน Vercel ไปยัง ${targetEmail}
        </div>
      </div>
    `;

    let emailSent = false;
    let deliveryStatus = "Logged in server (Awaiting RESEND_API_KEY for SMTP dispatch)";

    // Send real email if Resend key is provided
    if (resendApiKey) {
      const emailResult = await sendEmailViaResend(resendApiKey, targetEmail, subject, htmlEmail);
      if (emailResult.success) {
        emailSent = true;
        deliveryStatus = `ส่งอีเมลสำเร็จไปยัง ${targetEmail}`;
      } else {
        deliveryStatus = `ส่งอีเมลไม่สำเร็จ: ${emailResult.error}`;
      }
    } else {
      deliveryStatus = `บันทึกข้อมูลแล้ว (เพิ่ม RESEND_API_KEY ใน Vercel เพื่อส่งตรงเข้ากล่องจดหมาย)`;
    }

    // If webhook is provided, also send push message
    if (webhookUrl) {
      const webhookMsg = `🔔 **QuizCraft Alert:** ${displayName} กำลังเข้าใช้งาน (${actionDetails}) ผ่าน ${detectedDevice} จาก ${detectedSource} เวลา ${thaiFormattedTime}`;
      sendWebhookNotification(webhookUrl, webhookMsg);
    }

    // Save to in-memory notification records
    const logs = getNotificationLogs();
    const newRecord: NotificationRecord = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: thaiFormattedTime,
      eventType,
      userName: displayName,
      visitorId,
      device: detectedDevice,
      source: detectedSource,
      actionDetails,
      emailSent,
      emailDestination: targetEmail,
      deliveryStatus,
    };

    logs.unshift(newRecord);
    // Keep max 50 recent records in memory
    if (logs.length > 50) {
      logs.pop();
    }

    return NextResponse.json({
      success: true,
      record: newRecord,
      deliveryStatus,
      targetEmail,
    });
  } catch (error: any) {
    console.error("Notification API error:", error);
    return NextResponse.json(
      { error: "Failed to process notification", details: error.message },
      { status: 500 }
    );
  }
}
