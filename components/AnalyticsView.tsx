"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Users,
  Activity,
  Eye,
  TrendingUp,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  ArrowLeft,
  RotateCw,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  AnalyticsData,
  getAnalyticsData,
  fetchRealAnalytics,
  sendHeartbeat,
} from "@/lib/analytics";
import { useLanguage } from "@/lib/language-context";

interface AnalyticsViewProps {
  onBack: () => void;
}

export function AnalyticsView({ onBack }: AnalyticsViewProps) {
  const { language } = useLanguage();
  const [data, setData] = useState<AnalyticsData>(() => getAnalyticsData());
  const [activeTab, setActiveTab] = useState<"daily" | "hourly">("daily");
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    views: number;
    visitors: number;
    x: number;
    y: number;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const fresh = await fetchRealAnalytics();
      setData(fresh);
    } catch (e) {
      console.warn("Refresh failed:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Fetch live verified stats from server on mount
    fetchRealAnalytics()
      .then((fresh) => {
        setData(fresh);
      })
      .catch((e) => console.warn("Init analytics error:", e));

    // Send heartbeat and retrieve updated stats every 15s
    const interval = setInterval(() => {
      sendHeartbeat()
        .then((refreshed) => {
          setData(refreshed);
        })
        .catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 text-center">
        <div className="inline-flex items-center space-x-2 text-[#64748B] text-sm">
          <RotateCw className="w-4 h-4 animate-spin text-[#0284C7]" />
          <span>{language === "en" ? "Loading real-time visitor telemetry..." : "กำลังโหลดข้อมูลสถิติผู้เข้าชมจริง..."}</span>
        </div>
      </div>
    );
  }

  // Calculate SVG chart coordinates for Daily Traffic
  const chartHeight = 220;
  const chartWidth = 640;
  const paddingX = 40;
  const paddingY = 30;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  // Dynamic scale ensuring at least 5 for clean intervals
  const rawMaxViews = Math.max(...data.dailyHistory.map((d) => d.pageViews), 1);
  const maxViews = Math.max(rawMaxViews, 5);

  const points = data.dailyHistory.map((item, idx) => {
    const x = paddingX + (idx / Math.max(data.dailyHistory.length - 1, 1)) * innerWidth;
    const y = chartHeight - paddingY - (item.pageViews / maxViews) * innerHeight;
    const yVisitors =
      chartHeight - paddingY - (item.uniqueVisitors / maxViews) * innerHeight;
    return { ...item, x, y, yVisitors };
  });

  const pathViewsD = points.reduce((acc, pt, idx) => {
    return `${acc} ${idx === 0 ? "M" : "L"} ${pt.x},${pt.y}`;
  }, "");

  const areaViewsD = `${pathViewsD} L ${points[points.length - 1].x},${
    chartHeight - paddingY
  } L ${points[0].x},${chartHeight - paddingY} Z`;

  const pathVisitorsD = points.reduce((acc, pt, idx) => {
    return `${acc} ${idx === 0 ? "M" : "L"} ${pt.x},${pt.yVisitors}`;
  }, "");

  // Max for hourly bar chart
  const rawMaxHourly = Math.max(...data.hourlyHistory.map((h) => h.visitors), 1);
  const maxHourly = Math.max(rawMaxHourly, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#0F172A] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#64748B]" />
            <span>{language === "en" ? "Back to Workspace" : "กลับสู่หน้าหลัก"}</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-[#0284C7]" />
              <span>{language === "en" ? "System Analytics & Web Telemetry" : "ระบบสถิติและการเข้าชมเว็บไซต์ (Real-time Web Telemetry)"}</span>
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {language === "en"
                ? "Live telemetry tracking with Heartbeat Sessions and Browser Device analytics."
                : "ตรวจวัดทราฟฟิกจริงด้วยอัลกอริทึม Heartbeat Session และ Browser Telemetry"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Live Indicator */}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#F0F9FF] border border-[#BAE6FD] text-xs font-medium text-[#0369A1]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0284C7] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0284C7]"></span>
            </span>
            <span>
              {language === "en"
                ? `Online Now: ${data.activeOnlineUsers} users`
                : `ออนไลน์ขณะนี้: ${data.activeOnlineUsers} คน`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-medium text-[#475569] transition-colors cursor-pointer disabled:opacity-50"
            title={language === "en" ? "Refresh live analytics" : "รีเฟรชข้อมูลสถิติจริงจากเซิร์ฟเวอร์"}
          >
            <RotateCw
              className={`w-3.5 h-3.5 text-[#0284C7] ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            <span>{language === "en" ? "Refresh" : "รีเฟรช"}</span>
          </button>
        </div>
      </div>

      {/* Algorithm Verification & Integrity Banner */}
      <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 text-xs text-[#334155] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 font-bold text-[#0F172A]">
            <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
            <span>
              {language === "en"
                ? "Data Integrity Guarantee: 100% verified real sessions and device telemetry (Zero Mock Data)"
                : "ยืนยันความถูกต้องของข้อมูล: ใช้อัลกอริทึมตรวจจับจากอุปกรณ์และเซสชันจริง 100% (Zero Mock Data)"}
            </span>
          </div>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] font-medium text-[11px]">
            <CheckCircle2 className="w-3 h-3 text-[#2563EB]" />
            <span>{language === "en" ? "Real-time Verification" : "ตรวจจับแบบเรียลไทม์"}</span>
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-[11px] text-[#475569]">
          <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
            <strong className="text-[#0F172A] block mb-0.5">
              {language === "en" ? "1. Active Online Now" : "1. ผู้ใช้ออนไลน์ (Active Now)"}
            </strong>
            {language === "en"
              ? "Calculated from 15-second heartbeat pings. Sessions timeout after 45s of inactivity."
              : "นับจาก Heartbeat Ping ทุก 15 วินาที หากหยุดส่งสัญญาณเกิน 45 วินาทีระบบจะตัดเซสชันออกทันที"}
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
            <strong className="text-[#0F172A] block mb-0.5">
              {language === "en" ? "2. Unique Visitors" : "2. ผู้เข้าชมเฉพาะคน (Unique)"}
            </strong>
            {language === "en"
              ? "Identified by browser UUID cookie/localStorage token to prevent duplicate inflation."
              : "ระบุตัวตนด้วย Client UUID เฉพาะของแต่ละเบราว์เซอร์ ไม่นับซ้ำแม้จะเปิดปิดเว็บใหม่"}
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
            <strong className="text-[#0F172A] block mb-0.5">
              {language === "en" ? "3. Device Breakdown" : "3. อุปกรณ์ (Device Detection)"}
            </strong>
            {language === "en"
              ? "Extracted from verified browser User-Agent headers (Desktop, Mobile, Tablet)."
              : "วิเคราะห์จาก Header User-Agent ของอุปกรณ์จริง (Desktop, Mobile, Tablet)"}
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
            <strong className="text-[#0F172A] block mb-0.5">
              {language === "en" ? "4. Page Views" : "4. ยอดเปิดหน้า (Pageviews)"}
            </strong>
            {language === "en"
              ? "Logged directly on live server-side requests with rate limiting protection."
              : "บันทึกการส่ง Request เข้าสู่อัปเดตบน Node.js Backend จริงทุกครั้ง"}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Online Users */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              {language === "en" ? "Active Now" : "ผู้เข้าใช้ตอนนี้ (Active Now)"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F0F9FF] border border-[#BAE6FD] flex items-center justify-center text-[#0284C7]">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {data.activeOnlineUsers.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-[#0284C7]">{language === "en" ? "online" : "คนบนเว็บ"}</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1 flex items-center space-x-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0284C7]"></span>
            <span>{language === "en" ? "Sessions pinging heartbeat right now" : "เซสชันที่กำลังส่ง Ping อยู่ในขณะนี้"}</span>
          </p>
        </div>

        {/* Card 2: Today's Visitors & Views */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              {language === "en" ? "Today's Views" : "ยอดเข้าชมวันนี้ (Today Views)"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center text-[#334155]">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {data.todayPageViews.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-[#64748B]">{language === "en" ? "views" : "วิว"}</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">
            {language === "en"
              ? `Today's unique visitors: ${data.todayUniqueVisitors.toLocaleString()}`
              : `ผู้เข้าชมเฉพาะคนวันนี้: ${data.todayUniqueVisitors.toLocaleString()} คน`}
          </p>
        </div>

        {/* Card 3: Total Cumulative Visitors */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              {language === "en" ? "Cumulative Unique" : "ผู้เข้าใช้ในอดีตสะสม (Unique)"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F0F9FF] border border-[#BAE6FD] flex items-center justify-center text-[#0369A1]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {data.totalUniqueVisitors.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-[#64748B]">{language === "en" ? "users" : "ผู้ใช้งานจริง"}</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">
            {language === "en" ? "Deduplicated browser visitor IDs" : "คำนวณจาก Visitor UUID ที่ไม่ซ้ำกันในระบบ"}
          </p>
        </div>

        {/* Card 4: Total Page Views */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              {language === "en" ? "Total Page Views" : "ยอดเปิดดูหน้าสะสม (Total Views)"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center text-[#0F172A]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {data.totalPageViews.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-[#64748B]">{language === "en" ? "times" : "ครั้ง"}</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">
            {language === "en"
              ? `Avg ${(data.totalPageViews / Math.max(data.totalUniqueVisitors, 1)).toFixed(1)} pages per user`
              : `เฉลี่ย ${(data.totalPageViews / Math.max(data.totalUniqueVisitors, 1)).toFixed(1)} หน้าต่อผู้ใช้ 1 คน`}
          </p>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 sm:p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#0284C7]" />
              <span>{language === "en" ? "Traffic Trends & Activity" : "กราฟประวัติการเข้าชม (Traffic Trends)"}</span>
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {language === "en" ? "Verified telemetry data recorded over time" : "แสดงสถิติที่ถูกบันทึกจริงตามช่วงเวลาและวันจริง"}
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-[#CBD5E1] p-0.5 bg-[#F8FAFC]">
            <button
              type="button"
              onClick={() => setActiveTab("daily")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "daily"
                  ? "bg-white text-[#0F172A] shadow-2xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {language === "en" ? "Daily (Past 7 days)" : "รายวัน (7 วันย้อนหลัง)"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("hourly")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "hourly"
                  ? "bg-white text-[#0F172A] shadow-2xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {language === "en" ? "Hourly (24 hours)" : "รายชั่วโมง (24 ชม.)"}
            </button>
          </div>
        </div>

        {activeTab === "daily" ? (
          <div>
            {/* Legend */}
            <div className="flex items-center justify-end space-x-4 mb-2 text-xs text-[#64748B]">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#0284C7]"></span>
                <span>{language === "en" ? "Pageviews" : "ยอดเปิดดูหน้า (Pageviews)"}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#64748B]"></span>
                <span>{language === "en" ? "Unique Visitors" : "ผู้เข้าชมที่ไม่ซ้ำ (Unique Visitors)"}</span>
              </div>
            </div>

            {/* SVG Interactive Trend Chart */}
            <div className="relative w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto max-h-[300px] overflow-visible"
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284C7" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = chartHeight - paddingY - ratio * innerHeight;
                  const value = Math.round(ratio * maxViews);
                  return (
                    <g key={i}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        stroke="#E2E8F0"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={paddingX - 8}
                        y={y + 3}
                        fontSize="10"
                        fill="#94A3B8"
                        textAnchor="end"
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}

                {/* Area fill for Views */}
                <path d={areaViewsD} fill="url(#areaGradient)" />

                {/* Line for Views */}
                <path
                  d={pathViewsD}
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Line for Unique Visitors */}
                <path
                  d={pathVisitorsD}
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points and X-Axis Labels */}
                {points.map((pt, idx) => (
                  <g key={idx}>
                    {/* X axis date label */}
                    <text
                      x={pt.x}
                      y={chartHeight - 10}
                      fontSize="11"
                      fill="#64748B"
                      textAnchor="middle"
                      fontWeight="500"
                    >
                      {pt.dayLabel}
                    </text>

                    {/* View point dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      fill="#FFFFFF"
                      stroke="#0284C7"
                      strokeWidth="2"
                      className="cursor-pointer hover:r-6 transition-all"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          date: `${pt.dayLabel} (${pt.date})`,
                          views: pt.pageViews,
                          visitors: pt.uniqueVisitors,
                          x: pt.x,
                          y: pt.y,
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                    />

                    {/* Visitor point dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.yVisitors}
                      r="3.5"
                      fill="#FFFFFF"
                      stroke="#64748B"
                      strokeWidth="1.5"
                      className="cursor-pointer hover:r-5 transition-all"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          date: `${pt.dayLabel} (${pt.date})`,
                          views: pt.pageViews,
                          visitors: pt.uniqueVisitors,
                          x: pt.x,
                          y: pt.yVisitors,
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                ))}
              </svg>

              {/* Hover Tooltip */}
              {hoveredPoint && (
                <div
                  className="absolute z-10 pointer-events-none bg-[#0F172A] text-white text-xs rounded-lg px-3 py-2 shadow-lg border border-[#334155] -translate-x-1/2 -translate-y-full mb-2"
                  style={{
                    left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                    top: `${(hoveredPoint.y / chartHeight) * 100}%`,
                  }}
                >
                  <div className="font-semibold border-b border-[#334155] pb-1 mb-1">
                    {hoveredPoint.date}
                  </div>
                  <div className="text-[#38BDF8]">
                    {language === "en" ? "Pageviews: " : "เปิดดูหน้า: "}
                    {hoveredPoint.views.toLocaleString()} {language === "en" ? "views" : "ครั้ง"}
                  </div>
                  <div className="text-[#CBD5E1]">
                    {language === "en" ? "Unique Visitors: " : "ผู้เข้าชม: "}
                    {hoveredPoint.visitors.toLocaleString()} {language === "en" ? "visitors" : "คน"}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Hourly Distribution Bar Chart */
          <div>
            <div className="flex items-center justify-between mb-3 text-xs text-[#64748B]">
              <span>
                {language === "en" ? "Traffic Density across 24 Hours" : "ความหนาแน่นของผู้เข้าชมตามช่วงเวลา 24 ชั่วโมง"}
              </span>
              <span>
                {language === "en" ? "Unit: Visitors (Users)" : "หน่วย: จำนวนผู้เข้าชม (คน)"}
              </span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 h-48 items-end pt-6 pb-2 border-b border-[#E2E8F0]">
              {data.hourlyHistory.map((item, idx) => {
                const heightPercent = Math.max(
                  Math.round((item.visitors / maxHourly) * 100),
                  item.visitors > 0 ? 12 : 3
                );
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-end h-full group"
                  >
                    <div className="text-[10px] text-[#64748B] opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-bold">
                      {item.visitors}
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-sm transition-all relative ${
                        item.visitors > 0
                          ? "bg-[#0284C7]"
                          : "bg-[#E2E8F0] group-hover:bg-[#CBD5E1]"
                      }`}
                    ></div>
                    <div className="text-[10px] text-[#64748B] mt-2 font-medium">
                      {item.hour}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-[#64748B] mt-2 text-center">
              {language === "en"
                ? "Logged from verified live requests and heartbeat signals received."
                : "บันทึกตามช่วงเวลาจริงที่มีการส่ง Request หรือ Heartbeat เข้าสู่ระบบ"}
            </p>
          </div>
        )}
      </div>

      {/* Secondary Breakdown: Traffic Sources & Device Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#E2E8F0] pb-3">
            <Globe className="w-4 h-4 text-[#0284C7]" />
            <h3 className="text-sm font-bold text-[#0F172A]">
              {language === "en" ? "Traffic Sources (Verified Referrer)" : "แหล่งที่มาของการเข้าชม (Traffic Sources - Real Referrer)"}
            </h3>
          </div>

          <div className="space-y-3">
            {data.trafficSources.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-[#0F172A]">
                  <span>{item.source}</span>
                  <span className="text-[#64748B]">
                    {item.visitors.toLocaleString()} {language === "en" ? "visits" : "ครั้ง"} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#0284C7] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Stats */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#E2E8F0] pb-3">
            <Monitor className="w-4 h-4 text-[#0284C7]" />
            <h3 className="text-sm font-bold text-[#0F172A]">
              {language === "en" ? "Device Breakdown (Real User-Agent)" : "อุปกรณ์ที่ใช้งาน (Device Breakdown - Real User-Agent)"}
            </h3>
          </div>

          <div className="space-y-3">
            {data.deviceStats.map((item, idx) => {
              const Icon =
                item.device.includes("Desktop")
                  ? Monitor
                  : item.device.includes("Mobile")
                  ? Smartphone
                  : Tablet;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium text-[#0F172A]">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>{item.device}</span>
                    </div>
                    <span className="text-[#64748B]">
                      {item.count.toLocaleString()} {language === "en" ? "times" : "ครั้ง"} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#334155] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feature Usage Metrics */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-[#E2E8F0] pb-3">
          <Layers className="w-4 h-4 text-[#0284C7]" />
          <h3 className="text-sm font-bold text-[#0F172A]">
            {language === "en" ? "Feature Usage Telemetry" : "สถิติการใช้งานฟังก์ชันจริงภายในระบบ (Feature Usage Telemetry)"}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.featureMetrics.map((feat, idx) => {
            const featName =
              language === "en"
                ? feat.name.includes("โจทย์")
                  ? "Problem Solver Sessions"
                  : feat.name.includes("ปรนัย")
                  ? "Mock Exams Generated"
                  : feat.name.includes("แฟลชการ์ด")
                  ? "Flashcards Generated"
                  : feat.name.includes("ข้อเขียน")
                  ? "Subjective Exams Evaluated"
                  : feat.name
                : feat.name;
            const featUnit =
              language === "en"
                ? feat.unit.includes("ข้อ")
                  ? "problems"
                  : feat.unit.includes("ชุด")
                  ? "sets"
                  : feat.unit.includes("แผ่น")
                  ? "cards"
                  : feat.unit
                : feat.unit;

            return (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] space-y-1"
              >
                <span className="text-xs text-[#64748B] block font-medium">
                  {featName}
                </span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-xl font-bold text-[#0F172A]">
                    {feat.count.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#64748B]">{featUnit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


