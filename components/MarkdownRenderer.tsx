"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MathLatexLabel } from "@/components/MathLatexLabel";

interface MarkdownRendererProps {
  content: string;
}

interface ExtractedMathEntry {
  latex: string;
  display: boolean;
}

const MATH_TOKEN_REGEX = /(@@MATH_(?:BLOCK|INLINE)_(\d+)@@)/g;
const TABLE_SEPARATOR_REGEX = /^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/;
const TABLE_ROW_REGEX = /^\s*\|.+\|\s*$/;

function countPipeColumns(line: string): number {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  if (!trimmed) return 0;
  return trimmed.split("|").length;
}

function isMarkdownTableBlock(lines: string[]): boolean {
  const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);
  if (nonEmpty.length < 2) return false;
  if (!nonEmpty[0].includes("|")) return false;
  if (!TABLE_SEPARATOR_REGEX.test(nonEmpty[1])) return false;
  return nonEmpty.slice(2).every((line) => line.includes("|"));
}

/**
 * Extracts LaTeX math blocks and inline math outside fenced code blocks and inline backticks
 * so CommonMark never strips backslashes (e.g. \\, \frac) and KaTeX renders cleanly.
 */
function extractMathPlaceholders(raw: string): {
  text: string;
  mathEntries: ExtractedMathEntry[];
} {
  const mathEntries: ExtractedMathEntry[] = [];
  if (!raw) return { text: "", mathEntries };

  const addEntry = (latex: string, display: boolean): string => {
    const cleaned = latex.trim();
    if (!cleaned) return "";
    const idx = mathEntries.length;
    mathEntries.push({ latex: cleaned, display });
    return display ? `@@MATH_BLOCK_${idx}@@` : `@@MATH_INLINE_${idx}@@`;
  };

  // Split by fenced code blocks and inline backticks first so code snippets are untouched
  const segments = raw.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  const processed = segments.map((seg, segIdx) => {
    // Odd segments are code blocks or inline code
    if (segIdx % 2 === 1) return seg;

    let out = seg;
    // Block math: $$...$$ and \[...\]
    out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, inner: string) =>
      addEntry(inner, true)
    );
    out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_, inner: string) =>
      addEntry(inner, true)
    );
    // Inline math: \(...\) and $...$ (avoid matching currency like $50 or spaced $ a $)
    out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_, inner: string) =>
      addEntry(inner, false)
    );
    out = out.replace(
      /(?<!\\)\$([^\s$](?:[^$\n]*?[^\s$])?)\$/g,
      (full, inner: string) => {
        // Ignore pure currency figures unless they contain math operators/commands
        if (/^\d+(?:[.,]\d+)?$/.test(inner.trim())) {
          return full;
        }
        return addEntry(inner, false);
      }
    );
    return out;
  });

  return { text: processed.join(""), mathEntries };
}

/**
 * Normalizes AI-generated Markdown so headings, GFM tables, and paragraphs parse cleanly:
 * 1. Fixes headings missing a space after # (e.g. "###หัวข้อ" -> "### หัวข้อ").
 * 2. Unwraps fenced code blocks when the AI accidentally puts a Markdown table inside ```markdown ... ```.
 * 3. Ensures blank lines before and after every GFM table outside real code blocks.
 */
function normalizeMarkdownTables(raw: string): string {
  if (!raw) return "";
  const lines = raw.replace(/\r\n/g, "\n").split("\n");

  // Step 1: Unwrap fenced code blocks that purely contain a Markdown table
  const unwrappedLines: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const fenceMatch = lines[i].match(/^\s*```([a-zA-Z0-9_-]*)\s*$/);
    if (fenceMatch) {
      const lang = (fenceMatch[1] || "").toLowerCase();
      let closeIdx = i + 1;
      while (closeIdx < lines.length && !/^\s*```\s*$/.test(lines[closeIdx])) {
        closeIdx++;
      }
      if (
        closeIdx < lines.length &&
        (lang === "" || lang === "markdown" || lang === "md" || lang === "text")
      ) {
        const inner = lines.slice(i + 1, closeIdx);
        if (isMarkdownTableBlock(inner)) {
          unwrappedLines.push("", ...inner, "");
          i = closeIdx + 1;
          continue;
        }
      }
    }
    unwrappedLines.push(lines[i]);
    i++;
  }

  // Step 2: Normalize headings missing spaces and ensure blank lines around GFM tables
  const result: string[] = [];
  let inCodeFence = false;
  let idx = 0;

  while (idx < unwrappedLines.length) {
    let line = unwrappedLines[idx];

    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      result.push(line);
      idx++;
      continue;
    }

    if (!inCodeFence) {
      line = line.replace(/^(\s*#{1,6})([^\s#])/, "$1 $2");
    }

    if (
      !inCodeFence &&
      idx + 1 < unwrappedLines.length &&
      (TABLE_ROW_REGEX.test(line) || line.includes("|")) &&
      TABLE_SEPARATOR_REGEX.test(unwrappedLines[idx + 1])
    ) {
      const headerCols = countPipeColumns(line);
      let sepLine = unwrappedLines[idx + 1].trim();
      if (!sepLine.startsWith("|")) sepLine = `| ${sepLine}`;
      if (!sepLine.endsWith("|")) sepLine = `${sepLine} |`;

      const sepCols = countPipeColumns(sepLine);
      if (headerCols > 1 && sepCols !== headerCols) {
        sepLine = `| ${Array.from({ length: headerCols }, () => "---").join(" | ")} |`;
      }

      if (result.length > 0 && result[result.length - 1].trim() !== "") {
        result.push("");
      }

      let normalizedHeader = line.trim();
      if (!normalizedHeader.startsWith("|")) normalizedHeader = `| ${normalizedHeader}`;
      if (!normalizedHeader.endsWith("|")) normalizedHeader = `${normalizedHeader} |`;

      result.push(normalizedHeader);
      result.push(sepLine);
      idx += 2;

      while (
        idx < unwrappedLines.length &&
        unwrappedLines[idx].trim() !== "" &&
        unwrappedLines[idx].includes("|") &&
        !/^\s*```/.test(unwrappedLines[idx])
      ) {
        let row = unwrappedLines[idx].trim();
        if (!row.startsWith("|")) row = `| ${row}`;
        if (!row.endsWith("|")) row = `${row} |`;
        result.push(row);
        idx++;
      }

      if (idx < unwrappedLines.length && unwrappedLines[idx].trim() !== "") {
        result.push("");
      }
      continue;
    }

    result.push(line);
    idx++;
  }

  return result.join("\n");
}

function renderTextWithMathAndBreaks(
  text: string,
  mathEntries: ExtractedMathEntry[],
  allowBreaks: boolean,
  keyPrefix: string
): React.ReactNode {
  const parts = text.split(/(@@MATH_(?:BLOCK|INLINE)_\d+@@)/g);
  return parts.map((part, pIdx) => {
    const tokenMatch = part.match(/^@@MATH_(BLOCK|INLINE)_(\d+)@@$/);
    if (tokenMatch) {
      const isDisplay = tokenMatch[1] === "BLOCK";
      const entryIdx = Number(tokenMatch[2]);
      const entry = mathEntries[entryIdx];
      if (!entry) return part;

      if (isDisplay) {
        return (
          <span
            key={`${keyPrefix}-m-${pIdx}`}
            className="block my-2.5 py-1 overflow-x-auto text-center"
          >
            <MathLatexLabel
              content={entry.latex}
              isLatex
              displayMode
            />
          </span>
        );
      }

      return (
        <span key={`${keyPrefix}-m-${pIdx}`} className="inline-block align-middle mx-0.5">
          <MathLatexLabel
            content={entry.latex}
            isLatex
            displayMode={false}
          />
        </span>
      );
    }

    if (allowBreaks && /<br\s*\/?>/i.test(part)) {
      const segments = part.split(/<br\s*\/?>/gi);
      return segments.map((seg, segIdx) => (
        <React.Fragment key={`${keyPrefix}-br-${pIdx}-${segIdx}`}>
          {seg}
          {segIdx < segments.length - 1 && <br />}
        </React.Fragment>
      ));
    }

    return part;
  });
}

function renderRichChildren(
  children: React.ReactNode,
  mathEntries: ExtractedMathEntry[],
  allowBreaks = false,
  keyPrefix = "n"
): React.ReactNode {
  return React.Children.map(children, (child, childIdx) => {
    if (typeof child === "string") {
      if (
        !MATH_TOKEN_REGEX.test(child) &&
        (!allowBreaks || !/<br\s*\/?>/i.test(child))
      ) {
        return child;
      }
      MATH_TOKEN_REGEX.lastIndex = 0;
      return renderTextWithMathAndBreaks(
        child,
        mathEntries,
        allowBreaks,
        `${keyPrefix}-${childIdx}`
      );
    }
    if (
      React.isValidElement<{ children?: React.ReactNode }>(child) &&
      child.props?.children
    ) {
      return React.cloneElement(child, {
        ...child.props,
        children: renderRichChildren(
          child.props.children,
          mathEntries,
          allowBreaks,
          `${keyPrefix}-${childIdx}`
        ),
      });
    }
    return child;
  });
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { text: contentWithMathTokens, mathEntries } =
    extractMathPlaceholders(content);
  const normalizedContent = normalizeMarkdownTables(contentWithMathTokens);

  return (
    <div className="w-full text-[#1F1E1D] break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-[#1F1E1D] mt-6 mb-3 first:mt-0 leading-snug tracking-tight">
              {renderRichChildren(children, mathEntries)}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-[#1F1E1D] mt-5 mb-2.5 first:mt-0 leading-snug tracking-tight">
              {renderRichChildren(children, mathEntries)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-[#1F1E1D] mt-4 mb-2 first:mt-0 leading-snug">
              {renderRichChildren(children, mathEntries)}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-[#1F1E1D] mt-3.5 mb-1.5 first:mt-0 leading-snug">
              {renderRichChildren(children, mathEntries)}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-3.5 last:mb-0 text-[15.5px] leading-[1.75] text-[#1F1E1D]">
              {renderRichChildren(children, mathEntries)}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-[#1F1E1D]">
              {renderRichChildren(children, mathEntries)}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[#2D2C29]">
              {renderRichChildren(children, mathEntries)}
            </em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-3.5 last:mb-0 space-y-1.5 text-[15.5px] leading-[1.7] text-[#1F1E1D]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-3.5 last:mb-0 space-y-1.5 text-[15.5px] leading-[1.7] text-[#1F1E1D]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1 [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ul]:mt-1.5 [&>ol]:mt-1.5">
              {renderRichChildren(children, mathEntries)}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-[3px] border-[#CFCBC2] pl-4 my-3.5 text-[#4A4843] italic">
              {renderRichChildren(children, mathEntries)}
            </blockquote>
          ),
          hr: () => <hr className="my-5 border-[#E5E3DC]" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 text-[#1F1E1D] hover:text-[#57554F] transition-colors"
            >
              {renderRichChildren(children, mathEntries)}
            </a>
          ),
          pre: ({ children }) => (
            <pre className="my-3.5 rounded-xl bg-[#EFECE4] border border-[#E2DFD7] overflow-x-auto p-3.5 text-[13.5px] leading-relaxed font-mono text-[#1F1E1D] [&>code]:bg-transparent [&>code]:p-0 [&>code]:rounded-none [&>code]:block [&>code]:whitespace-pre [&>code]:text-[13.5px]">
              {children}
            </pre>
          ),
          code: ({ className, children }) => (
            <code
              className={`px-1.5 py-0.5 rounded-md bg-[#EFECE4] text-[#1F1E1D] font-mono text-[13.5px] ${
                className || ""
              }`}
            >
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="my-4 w-full overflow-x-auto rounded-2xl border border-[#E5E3DC] bg-white shadow-[0_1px_4px_rgba(31,30,29,0.03)]">
              <table className="w-full min-w-full text-sm text-left border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#EFECE4] border-b border-[#E5E3DC]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#ECEAE3] bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="transition-colors hover:bg-[#FAF9F5]/80">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-semibold text-xs sm:text-sm text-[#1F1E1D] align-top min-w-[100px] border-r border-[#E5E3DC]/70 last:border-r-0">
              {renderRichChildren(children, mathEntries, true)}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed text-[#1F1E1D] align-top min-w-[100px] border-r border-[#ECEAE3]/70 last:border-r-0">
              {renderRichChildren(children, mathEntries, true)}
            </td>
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
