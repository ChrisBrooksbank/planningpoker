"use client";

import { useEffect, useState } from "react";

const FONT_SIZES = [14, 16, 18, 20] as const;
const STORAGE_KEY = "planning-poker-font-size";

export function FontSizeControl() {
  const [sizeIndex, setSizeIndex] = useState(1); // default 16px
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const idx = FONT_SIZES.indexOf(Number(stored) as (typeof FONT_SIZES)[number]);
      if (idx !== -1) {
        setSizeIndex(idx);
        document.documentElement.style.fontSize = `${FONT_SIZES[idx]}px`;
      }
    }
    setMounted(true);
  }, []);

  const decrease = () => {
    const next = sizeIndex - 1;
    if (next < 0) return;
    setSizeIndex(next);
    document.documentElement.style.fontSize = `${FONT_SIZES[next]}px`;
    localStorage.setItem(STORAGE_KEY, String(FONT_SIZES[next]));
  };

  const increase = () => {
    const next = sizeIndex + 1;
    if (next >= FONT_SIZES.length) return;
    setSizeIndex(next);
    document.documentElement.style.fontSize = `${FONT_SIZES[next]}px`;
    localStorage.setItem(STORAGE_KEY, String(FONT_SIZES[next]));
  };

  if (!mounted) {
    return (
      <div role="group" aria-label="Font size controls" className="flex items-center gap-1">
        <button className="p-2 rounded-md border border-border bg-card/80 text-sm font-semibold" disabled>
          A-
        </button>
        <button className="p-2 rounded-md border border-border bg-card/80 text-sm font-semibold" disabled>
          A+
        </button>
      </div>
    );
  }

  return (
    <div role="group" aria-label="Font size controls" className="flex items-center gap-1">
      <button
        onClick={decrease}
        disabled={sizeIndex === 0}
        className="p-2 rounded-md border border-border bg-card/80 hover:bg-muted transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Decrease font size${sizeIndex === 0 ? " (minimum)" : ""}`}
      >
        A-
      </button>
      <span className="text-xs text-muted-foreground w-8 text-center" aria-live="polite">
        {FONT_SIZES[sizeIndex]}
      </span>
      <button
        onClick={increase}
        disabled={sizeIndex === FONT_SIZES.length - 1}
        className="p-2 rounded-md border border-border bg-card/80 hover:bg-muted transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Increase font size${sizeIndex === FONT_SIZES.length - 1 ? " (maximum)" : ""}`}
      >
        A+
      </button>
    </div>
  );
}
