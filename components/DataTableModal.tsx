"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, Search, Table2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  StructuredTableData,
  isNumericColumn,
  tableToTsv,
} from "@/lib/structured-table";
import { useLanguage } from "@/lib/language-context";

interface DataTableModalProps {
  table: StructuredTableData | null;
  onClose: () => void;
}

interface DataTableModalPanelProps {
  table: StructuredTableData;
  onClose: () => void;
}

function DataTableModalPanel({ table, onClose }: DataTableModalPanelProps) {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const numericCols = useMemo(
    () => table.columns.map((_, idx) => isNumericColumn(table.rows, idx)),
    [table]
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return table.rows;
    return table.rows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(q))
    );
  }, [table, searchQuery]);

  const handleCopyData = async () => {
    const tsv = tableToTsv(table, filteredRows);
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <motion.div
      key={`data-table-modal-backdrop-${table.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center sm:p-5 bg-[#1F1E1D]/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={table.title}
    >
      <motion.div
        key={`data-table-modal-panel-${table.id}`}
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full sm:h-[90vh] sm:max-w-6xl sm:rounded-2xl bg-white border border-[#E5E3DC] flex flex-col overflow-hidden shadow-xl"
      >
            {/* Top Modal Header */}
            <div className="px-4 py-3 border-b border-[#E5E3DC] bg-[#FAF9F5] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#EFECE4] border border-[#E5E3DC] flex items-center justify-center shrink-0">
                  <Table2 className="w-4 h-4 text-[#1F1E1D]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-[#1F1E1D] truncate">
                    {table.title}
                  </h3>
                  <p className="text-xs text-[#6B6A65] tabular-nums">
                    {searchQuery.trim()
                      ? language === "en"
                        ? `Showing ${filteredRows.length} of ${table.rows.length} rows · ${table.columns.length} cols`
                        : `พบ ${filteredRows.length} จาก ${table.rows.length} แถว · ${table.columns.length} คอลัมน์`
                      : language === "en"
                        ? `${table.rows.length} rows · ${table.columns.length} columns`
                        : `${table.rows.length} แถว · ${table.columns.length} คอลัมน์`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyData}
                  disabled={filteredRows.length === 0}
                  className="min-h-[44px] px-3.5 rounded-xl border border-[#E5E3DC] bg-white hover:bg-[#EFECE4] disabled:opacity-45 text-[#1F1E1D] text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-[#1F1E1D] shrink-0" />
                      <span>
                        {language === "en" ? "Copied" : "คัดลอกแล้ว"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#6B6A65] shrink-0" />
                      <span>
                        {language === "en" ? "Copy Data" : "คัดลอกข้อมูล"}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="min-w-[44px] min-h-[44px] rounded-xl border border-transparent hover:border-[#E5E3DC] hover:bg-[#EFECE4] text-[#6B6A65] hover:text-[#1F1E1D] inline-flex items-center justify-center transition-colors cursor-pointer"
                  aria-label={language === "en" ? "Close" : "ปิดหน้าต่าง"}
                  title={language === "en" ? "Close" : "ปิด"}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Toolbar */}
            <div className="px-4 py-2.5 border-b border-[#E5E3DC] bg-white flex items-center gap-2.5 shrink-0">
              <Search className="w-4 h-4 text-[#6B6A65] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === "en"
                    ? "Search across all columns..."
                    : "ค้นหาข้อมูลในตาราง..."
                }
                className="flex-1 min-w-0 bg-transparent text-[16px] sm:text-sm text-[#1F1E1D] placeholder:text-[#8C8A84] focus:outline-none"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="min-w-[44px] min-h-[44px] -my-2 rounded-lg text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#EFECE4] inline-flex items-center justify-center transition-colors cursor-pointer"
                  aria-label={
                    language === "en" ? "Clear search" : "ล้างคำค้นหา"
                  }
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Scrollable Fullscreen Table Grid */}
            <div className="flex-1 min-h-0 overflow-auto overscroll-contain bg-white">
              {filteredRows.length === 0 ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-sm font-medium text-[#1F1E1D] mb-1">
                    {language === "en"
                      ? "No matching rows found"
                      : "ไม่พบข้อมูลที่ตรงกับคำค้นหา"}
                  </p>
                  <p className="text-xs text-[#6B6A65] mb-4">
                    {language === "en"
                      ? "Try another keyword or clear your search filter."
                      : "ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองเพื่อดูข้อมูลทั้งหมด"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="min-h-[44px] px-4 rounded-xl border border-[#E5E3DC] bg-[#FAF9F5] hover:bg-[#EFECE4] text-xs font-medium text-[#1F1E1D] transition-colors cursor-pointer"
                  >
                    {language === "en" ? "Show All Rows" : "แสดงข้อมูลทั้งหมด"}
                  </button>
                </div>
              ) : (
                <table className="w-max min-w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-[#EFECE4]">
                    <tr className="border-b border-[#E5E3DC]">
                      {table.columns.map((col, colIdx) => {
                        const isNum = numericCols[colIdx];
                        return (
                          <th
                            key={`${table.id}-modal-h-${colIdx}`}
                            className={`px-4 py-3 font-semibold text-[#1F1E1D] whitespace-nowrap border-r last:border-r-0 border-[#E5E3DC] ${
                              isNum ? "text-right tabular-nums" : "text-left"
                            }`}
                          >
                            {col}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E3DC] bg-white">
                    {filteredRows.map((row, rowIdx) => (
                      <tr
                        key={`${table.id}-modal-r-${rowIdx}`}
                        className="hover:bg-[#FAF9F5] transition-colors"
                      >
                        {row.map((cell, colIdx) => {
                          const isNum = numericCols[colIdx];
                          return (
                            <td
                              key={`${table.id}-modal-r-${rowIdx}-c-${colIdx}`}
                              className={`px-4 py-3 text-[#1F1E1D] align-top whitespace-normal min-w-[120px] max-w-[360px] break-words border-r last:border-r-0 border-[#E5E3DC]/70 ${
                                isNum ? "text-right tabular-nums" : "text-left"
                              }`}
                            >
                              {cell}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {table.summary && (
              <div className="px-4 py-2.5 border-t border-[#E5E3DC] bg-[#FAF9F5] text-xs text-[#6B6A65] shrink-0">
                {table.summary}
              </div>
            )}
      </motion.div>
    </motion.div>
  );
}

export function DataTableModal({ table, onClose }: DataTableModalProps) {
  return (
    <AnimatePresence>
      {table && (
        <DataTableModalPanel
          key={table.id}
          table={table}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}
