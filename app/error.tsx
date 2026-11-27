"use client";

import { useEffect } from "react";
import { isChunkLoadError, tryAutoRecoverChunkError } from "@/lib/chunk-recovery";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (chunkError) {
      if (!tryAutoRecoverChunkError()) {
        console.warn("Route chunk load failed after cooldown:", error.message);
      }
      return;
    }
    console.error("Route error boundary caught:", error);
  }, [chunkError, error]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#FAF9F5] text-[#1F1E1D] px-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h2 className="text-xl font-semibold text-[#1F1E1D]">
          {chunkError ? "New version available" : "Something went wrong"}
        </h2>
        <p className="text-sm text-[#6B6A65] leading-relaxed">
          {chunkError
            ? "The page assets were updated on the server. Please reload to continue."
            : "Unable to complete the page request. Please try again or reload."}
        </p>
        <div className="flex items-center justify-center gap-3">
          {!chunkError && (
            <button
              type="button"
              onClick={() => reset()}
              className="px-5 py-2.5 rounded-xl border border-[#E5E3DC] bg-white hover:bg-[#F3F1EC] text-[#1F1E1D] text-sm font-medium transition-colors cursor-pointer"
            >
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] text-white text-sm font-medium transition-colors cursor-pointer"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
