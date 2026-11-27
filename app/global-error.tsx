"use client";

import { useEffect } from "react";
import { isChunkLoadError, tryAutoRecoverChunkError } from "@/lib/chunk-recovery";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (chunkError) {
      if (!tryAutoRecoverChunkError()) {
        console.warn("Global chunk load failed after cooldown:", error.message);
      }
      return;
    }
    console.error("Global error boundary caught:", error);
  }, [chunkError, error]);

  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased font-sans bg-[#FAF9F5] text-[#1F1E1D]">
        <div className="min-h-dvh flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center space-y-4">
            <h2 className="text-xl font-semibold text-[#1F1E1D]">
              {chunkError ? "New version available" : "Something went wrong"}
            </h2>
            <p className="text-sm text-[#6B6A65] leading-relaxed">
              Please reload the page to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
