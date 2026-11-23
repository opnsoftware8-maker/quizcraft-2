"use client";

import React, { useMemo } from "react";
import { Maximize2, Table2 } from "lucide-react";
import {
  StructuredTableData,
  isNumericColumn,
} from "@/lib/structured-table";
import { useLanguage } from "@/lib/language-context";

interface DataTableCardProps {
  table: StructuredTableData;
  onExpand: (table: StructuredTableData) => void;
}

export function DataTableCard({ table, onExpand }: DataTableCardProps) {
  const { language } = useLanguage();

  const numericCols = useMemo(
    () =>
      table.columns.map((_, idx) => isNumericColumn(table.rows, idx)),
    [table.columns, table.rows]
  );

  const totalRows = table.rows.length;
  const totalCols = table.columns.length;
  const hasMoreRows = totalRows > 5;

  return (
    <div className="my-3 w-full rounded-2xl border border-[#E5E3DC] bg-white overflow-hidden">
      {/* Compact Card Header */}
      <div className="px-3.5 py-2.5 border-b border-[#E5E3DC] bg-[#FAF9F5] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Table2 className="w-4 h-4 text-[#6B6A65] shrink-0" />
          <h4 className="text-[13.5px] font-semibold text-[#1F1E1D] truncate">
            {table.title}
          </h4>
        </div>
        <span className="text-[11.5px] text-[#6B6A65] tabular-nums whitespace-nowrap shrink-0">
          {language === "en"
            ? `${totalRows} rows · ${totalCols} cols`
            : `${totalRows} แถว · ${totalCols} คอลัมน์`}
        </span>
      </div>

      {/* Relative Viewport with Floating Translucent Expand Button + 2D Scroll (Capped at Header + 5 Rows) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => onExpand(table)}
          className="absolute top-1.5 right-1.5 z-20 min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-[34px] rounded-xl bg-white/80 backdrop-blur-md border border-[#E5E3DC] text-[#1F1E1D] hover:bg-[#FAF9F5] shadow-sm inline-flex items-center justify-center transition-colors cursor-pointer"
          aria-label={
            language === "en" ? "Open table fullscreen" : "ขยายตารางเต็มจอ"
          }
          title={
            language === "en" ? "Fullscreen" : "ขยายเต็มจอ"
          }
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="max-h-[246px] overflow-auto overscroll-contain">
          <table className="w-max min-w-full border-collapse text-[13.5px]">
            <thead className="sticky top-0 z-10 bg-[#EFECE4]">
              <tr className="border-b border-[#E5E3DC]">
                {table.columns.map((col, colIdx) => {
                  const isNum = numericCols[colIdx];
                  const isLast = colIdx === table.columns.length - 1;
                  return (
                    <th
                      key={`${table.id}-h-${colIdx}`}
                      className={`h-[38px] px-3.5 py-2 font-semibold text-[#1F1E1D] whitespace-nowrap border-r last:border-r-0 border-[#E5E3DC] ${
                        isNum ? "text-right tabular-nums" : "text-left"
                      } ${isLast ? "pr-14 sm:pr-12" : ""}`}
                    >
                      {col}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E3DC] bg-white">
              {table.rows.map((row, rowIdx) => (
                <tr
                  key={`${table.id}-r-${rowIdx}`}
                  className="hover:bg-[#FAF9F5] transition-colors"
                >
                  {row.map((cell, colIdx) => {
                    const isNum = numericCols[colIdx];
                    return (
                      <td
                        key={`${table.id}-r-${rowIdx}-c-${colIdx}`}
                        className={`px-3.5 py-2.5 text-[#1F1E1D] align-top whitespace-nowrap max-w-[260px] truncate border-r last:border-r-0 border-[#E5E3DC]/70 ${
                          isNum ? "text-right tabular-nums" : "text-left"
                        }`}
                        title={cell}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subtle Footer Hint when > 5 rows or summary exists */}
      {(hasMoreRows || table.summary) && (
        <div className="px-3.5 py-2 border-t border-[#E5E3DC] bg-[#FAF9F5]/80 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#6B6A65]">
          <span className="truncate">
            {table.summary ||
              (language === "en"
                ? `Showing first 5 of ${totalRows} rows — scroll or expand`
                : `แสดง 5 จาก ${totalRows} แถว — เลื่อนดูหรือกดขยายเต็มจอ`)}
          </span>
          {hasMoreRows && (
            <button
              type="button"
              onClick={() => onExpand(table)}
              className="text-[12px] font-medium text-[#1F1E1D] hover:underline whitespace-nowrap cursor-pointer shrink-0"
            >
              {language === "en" ? "View all" : "ดูทั้งหมด"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
