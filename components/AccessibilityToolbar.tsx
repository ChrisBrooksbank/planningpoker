"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { FontSizeControl } from "@/components/FontSizeControl";

export function AccessibilityToolbar() {
  return (
    <div
      role="toolbar"
      aria-label="Accessibility controls"
      className="fixed top-2 right-2 sm:top-3 sm:right-3 z-50 flex items-center gap-1 sm:gap-2 rounded-lg border border-border bg-card/80 backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 shadow-sm"
    >
      <FontSizeControl />
      <div className="w-px h-6 bg-border" aria-hidden="true" />
      <ThemeToggle />
    </div>
  );
}
