"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="w-full text-[#1F1E1D] break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-[#1F1E1D] mt-6 mb-3 first:mt-0 leading-snug tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-[#1F1E1D] mt-5 mb-2.5 first:mt-0 leading-snug tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-[#1F1E1D] mt-4 mb-2 first:mt-0 leading-snug">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-[#1F1E1D] mt-3.5 mb-1.5 first:mt-0 leading-snug">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-3.5 last:mb-0 text-[15.5px] leading-[1.75] text-[#1F1E1D]">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-[#1F1E1D]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[#2D2C29]">{children}</em>
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
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-[3px] border-[#CFCBC2] pl-4 my-3.5 text-[#4A4843] italic">
              {children}
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
              {children}
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
            <div className="my-3.5 w-full overflow-x-auto rounded-xl border border-[#E5E3DC]">
              <table className="w-full text-sm text-left border-collapse">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-[#EFECE4] font-semibold px-3 py-2 border-b border-[#E5E3DC] text-[#1F1E1D]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-[#ECEAE3] text-[#1F1E1D]">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
