"use client";

import { useEffect } from "react";

export function ZoomLock() {
  useEffect(() => {
    const preventEvent = (e: Event) => {
      e.preventDefault();
    };

    const handleTouchStartOrMove = (e: TouchEvent) => {
      const scale = (e as TouchEvent & { scale?: number }).scale;
      if (e.touches.length > 1 || (typeof scale === "number" && scale !== 1)) {
        e.preventDefault();
      }
    };

    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      const target = e.target as HTMLElement | null;
      const isInteractive = Boolean(
        target?.closest("button, a, input, textarea, select, label, [role='button']")
      );

      if (now - lastTouchEnd <= 300 && !isInteractive) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const zoomKeys = new Set(["+", "=", "-", "_", "0"]);
      const zoomCodes = new Set([
        "Equal",
        "Minus",
        "Digit0",
        "NumpadAdd",
        "NumpadSubtract",
        "Numpad0",
      ]);
      if (zoomKeys.has(e.key) || zoomCodes.has(e.code)) {
        e.preventDefault();
      }
    };

    document.addEventListener("gesturestart", preventEvent, { passive: false });
    document.addEventListener("gesturechange", preventEvent, { passive: false });
    document.addEventListener("gestureend", preventEvent, { passive: false });
    document.addEventListener("touchstart", handleTouchStartOrMove, { passive: false });
    document.addEventListener("touchmove", handleTouchStartOrMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: false });
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("gesturestart", preventEvent);
      document.removeEventListener("gesturechange", preventEvent);
      document.removeEventListener("gestureend", preventEvent);
      document.removeEventListener("touchstart", handleTouchStartOrMove);
      document.removeEventListener("touchmove", handleTouchStartOrMove);
      document.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}
