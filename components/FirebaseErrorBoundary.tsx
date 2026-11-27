"use client";

import React from "react";
import { isChunkLoadError, tryAutoRecoverChunkError } from "@/lib/chunk-recovery";

interface FirebaseErrorBoundaryState {
  hasError: boolean;
  isChunkError: boolean;
  isReloading: boolean;
  message: string;
}

export class FirebaseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  FirebaseErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      isChunkError: false,
      isReloading: false,
      message: "",
    };
  }

  static getDerivedStateFromError(error: Error): FirebaseErrorBoundaryState {
    const chunkError = isChunkLoadError(error);
    return {
      hasError: true,
      isChunkError: chunkError,
      isReloading: false,
      message: error?.message || "Unexpected application error",
    };
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      if (tryAutoRecoverChunkError()) {
        this.setState({
          hasError: true,
          isChunkError: true,
          isReloading: true,
          message: "Reloading updated app assets...",
        });
      }
    }
  };

  componentDidMount(): void {
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount(): void {
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (isChunkLoadError(error)) {
      const reloaded = tryAutoRecoverChunkError();
      if (reloaded) {
        this.setState({ isReloading: true });
        return;
      }
      console.warn("Chunk load failed after reload cooldown:", error.message);
      return;
    }
    console.error("Application error boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center bg-[#FAF9F5] text-[#1F1E1D] px-6">
          <div className="max-w-md w-full text-center space-y-4">
            <h2 className="text-xl font-semibold text-[#1F1E1D]">
              {this.state.isReloading
                ? "Updating application..."
                : this.state.isChunkError
                  ? "New version available"
                  : "Something went wrong"}
            </h2>
            <p className="text-sm text-[#6B6A65] leading-relaxed">
              {this.state.isReloading
                ? "Reloading the latest page assets, please wait a moment."
                : this.state.isChunkError
                  ? "The page assets were updated on the server. Please reload the page to continue."
                  : "Unable to complete the database or rendering request. Please reload the page to continue."}
            </p>
            {!this.state.isReloading && (
              <button
                type="button"
                onClick={() => {
                  this.setState({
                    hasError: false,
                    isChunkError: false,
                    isReloading: false,
                    message: "",
                  });
                  window.location.reload();
                }}
                className="px-5 py-2.5 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] text-white text-sm font-medium transition-colors cursor-pointer"
              >
                Reload
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
