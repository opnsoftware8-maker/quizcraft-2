"use client";

import React from "react";

interface FirebaseErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class FirebaseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  FirebaseErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): FirebaseErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || "Unexpected application error",
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Application error boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center bg-[#FAF9F5] text-[#1F1E1D] px-6">
          <div className="max-w-md w-full text-center space-y-4">
            <h2 className="text-xl font-semibold text-[#1F1E1D]">
              Something went wrong
            </h2>
            <p className="text-sm text-[#6B6A65] leading-relaxed">
              Unable to complete the database or rendering request. Please reload the page to continue.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: "" });
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
