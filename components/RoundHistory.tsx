"use client";

import { useState } from "react";
import type { RoundHistoryEntry, DeckType } from "@/lib/types";
import { VoteValueDisplay } from "./VoteValueDisplay";

interface RoundHistoryProps {
  history: RoundHistoryEntry[];
  deckType?: DeckType;
}

export function RoundHistory({ history, deckType = "fibonacci" }: RoundHistoryProps) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const showNumericStats = deckType !== "tshirt";

  // Display most recent first
  const reversedHistory = [...history].reverse();

  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
        Round History ({history.length})
      </h2>
      <div className="space-y-2">
        {reversedHistory.map((entry, displayIndex) => {
          const roundNumber = history.length - displayIndex;
          const isExpanded = expandedRound === roundNumber;
          const voteEntries = Object.entries(entry.votes).sort((a, b) =>
            a[1].participantName.localeCompare(b[1].participantName)
          );

          return (
            <div key={roundNumber} className="border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setExpandedRound(isExpanded ? null : roundNumber)}
                className="w-full flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-muted/50 transition-colors text-left"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    #{roundNumber}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {entry.topic || "No topic"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.statistics.mode && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      <VoteValueDisplay value={entry.statistics.mode} />
                    </span>
                  )}
                  <svg
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-3">
                  {/* Individual votes */}
                  <ul className="space-y-1" aria-label={`Round ${roundNumber} votes`}>
                    {voteEntries.map(([oddsUserId, { participantName, value }]) => (
                      <li
                        key={oddsUserId}
                        className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50 text-sm"
                      >
                        <span className="truncate max-w-[140px] sm:max-w-[200px]" title={participantName}>
                          {participantName}
                        </span>
                        <span
                          className="font-semibold text-primary"
                        >
                          <VoteValueDisplay value={value} />
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Statistics summary */}
                  <div className={`grid gap-2 text-center ${showNumericStats ? "grid-cols-3" : "grid-cols-1"}`}>
                    {showNumericStats && entry.statistics.average !== null && (
                      <div className="p-2 rounded-md bg-muted text-xs">
                        <span className="text-muted-foreground">Avg</span>
                        <p className="font-bold text-sm">{entry.statistics.average.toFixed(1)}</p>
                      </div>
                    )}
                    {entry.statistics.mode !== null && (
                      <div className="p-2 rounded-md bg-muted text-xs">
                        <span className="text-muted-foreground">Mode</span>
                        <p className="font-bold text-sm"><VoteValueDisplay value={entry.statistics.mode} /></p>
                      </div>
                    )}
                    {showNumericStats && entry.statistics.range !== null && (
                      <div className="p-2 rounded-md bg-muted text-xs">
                        <span className="text-muted-foreground">Spread</span>
                        <p className="font-bold text-sm">{entry.statistics.range}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
