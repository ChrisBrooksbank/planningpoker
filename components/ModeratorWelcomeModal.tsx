"use client";

import { useEffect, useRef, useState } from "react";

interface ModeratorWelcomeModalProps {
  roomId: string;
  onClose: () => void;
}

export function ModeratorWelcomeModal({
  roomId,
  onClose,
}: ModeratorWelcomeModalProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const linkCopiedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const roomUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/session/${roomId}`
      : "";

  // Focus the close button on mount and trap focus
  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (linkCopiedTimeoutRef.current)
        clearTimeout(linkCopiedTimeoutRef.current);
    };
  }, [onClose]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setLinkCopied(true);
      if (linkCopiedTimeoutRef.current)
        clearTimeout(linkCopiedTimeoutRef.current);
      linkCopiedTimeoutRef.current = setTimeout(
        () => setLinkCopied(false),
        2000
      );
    } catch {
      window.prompt("Copy this link to share:", roomUrl);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="moderator-modal-title"
        className="w-full max-w-md mx-4 rounded-lg border border-border bg-card p-6 shadow-lg"
      >
        <h2
          id="moderator-modal-title"
          className="text-xl font-bold mb-4"
        >
          Welcome, Moderator!
        </h2>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            You are the moderator of this room. As moderator you can:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Set the topic for each estimation round</li>
            <li>Start voting rounds and reveal results</li>
            <li>Control the pace of the session</li>
          </ul>

          <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
            <p className="font-medium text-foreground mb-2">
              Invite your team
            </p>
            <p className="mb-3">
              Share this link with your team so they can join this room:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-background px-3 py-2 text-xs font-mono text-foreground border border-input truncate">
                {roomUrl}
              </code>
              <button
                onClick={handleCopyLink}
                className={`shrink-0 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  linkCopied
                    ? "bg-green-100 border border-green-400 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {linkCopied ? "Copied!" : "Copy Link"}
              </button>
              <span role="status" aria-live="polite" className="sr-only">
                {linkCopied ? "Link copied to clipboard" : ""}
              </span>
            </div>
          </div>
        </div>

        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Got it, let&apos;s start!
        </button>
      </div>
    </div>
  );
}
