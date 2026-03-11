import type { Vote, VoteStatistics, Participant, DeckType } from "@/lib/types";
import { VoteValueDisplay } from "./VoteValueDisplay";
interface VoteResultsProps {
  votes: Record<string, Vote>;
  participants: Participant[];
  statistics: VoteStatistics;
  deckType?: DeckType;
}

function getVoteDistribution(votes: Record<string, Vote>) {
  const counts: Record<string, number> = {};
  for (const vote of Object.values(votes)) {
    counts[vote.value] = (counts[vote.value] || 0) + 1;
  }
  const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);
  const max = entries.length > 0 ? entries[0][1] : 1;
  return { entries, max };
}

const CONFETTI_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#fbbf24",
  "#ffffff",
];

const CONFETTI_PIECES = Array.from({ length: 35 }, (_, i) => ({
  left: `${2 + ((i * 2.8) % 96)}%`,
  delay: `${(i * 0.13) % 2}s`,
  w: i % 3 === 0 ? "w-3" : i % 3 === 1 ? "w-2.5" : "w-2",
  h: i % 3 === 0 ? "h-4" : i % 3 === 1 ? "h-3" : "h-3.5",
}));

const BURST_COLORS = [
  "#fbbf24",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#06b6d4",
  "#ef4444",
];

const BURST_PARTICLES = Array.from({ length: 24 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 24;
  const distance = 80 + (i % 3) * 40; // vary distance
  return {
    bx: `${Math.cos(angle) * distance}px`,
    by: `${Math.sin(angle) * distance}px`,
    delay: `${(i * 0.017).toFixed(3)}s`,
    size: i % 3 === 0 ? 10 : i % 3 === 1 ? 8 : 6,
    color: BURST_COLORS[i % BURST_COLORS.length],
  };
});

const SPARKLE_POSITIONS = [
  { left: "12%", top: "20%", delay: "0.3s" },
  { left: "30%", top: "60%", delay: "0.8s" },
  { left: "50%", top: "15%", delay: "1.2s" },
  { left: "68%", top: "55%", delay: "0.5s" },
  { left: "85%", top: "25%", delay: "1.0s" },
  { left: "20%", top: "40%", delay: "1.5s" },
  { left: "75%", top: "70%", delay: "0.7s" },
];

export function VoteResults({
  votes,
  participants,
  statistics,
  deckType = "fibonacci",
}: VoteResultsProps) {
  const showNumericStats = deckType !== "tshirt";
  const participantMap = new Map(participants.map((p) => [p.id, p.name]));

  const votesArray = Object.entries(votes)
    .map(([userId, vote]) => ({
      userId,
      participantName: participantMap.get(userId) || "Unknown",
      vote,
    }))
    .sort((a, b) => a.participantName.localeCompare(b.participantName));

  const { entries: distribution, max: maxCount } = getVoteDistribution(votes);
  const totalVotes = Object.keys(votes).length;

  // Map vote value → list of participant names (for showing under distribution bars)
  const votersByValue = new Map<string, string[]>();
  for (const { participantName, vote } of votesArray) {
    const names = votersByValue.get(vote.value) || [];
    names.push(participantName);
    votersByValue.set(vote.value, names);
  }

  const isConsensus = totalVotes > 1 && distribution.length === 1;
  const consensusValue = isConsensus ? distribution[0][0] : null;

  return (
    <div className="space-y-6">
      {/* Consensus celebration with fireworks */}
      {isConsensus && (
        <>
          <div role="status" aria-live="polite" className="sr-only">
            Consensus reached! Everyone voted {consensusValue}
          </div>

          {/* Full-screen confetti rain */}
          <div
            className="fixed inset-0 z-40 pointer-events-none"
            aria-hidden="true"
          >
            {CONFETTI_PIECES.map((piece, i) => (
              <div
                key={`confetti-${i}`}
                className={`absolute top-0 ${piece.w} ${piece.h} rounded-sm confetti-piece`}
                style={{
                  left: piece.left,
                  animationDelay: piece.delay,
                  backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                }}
              />
            ))}
          </div>

          {/* Consensus banner */}
          <div className="relative overflow-hidden rounded-xl consensus-banner consensus-glow">
            {/* Main banner */}
            <div className="relative bg-gradient-to-r from-amber-500 via-green-500 to-emerald-500 px-4 py-5 text-center text-white font-bold text-xl sm:text-2xl">
              {/* Shimmer sweep overlay */}
              <div
                className="absolute inset-0 pointer-events-none consensus-shimmer"
                aria-hidden="true"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                  width: "50%",
                }}
              />
              <span className="relative z-10">
                🏆 Consensus! Everyone voted{" "}
                <VoteValueDisplay value={consensusValue!} /> 🎉
              </span>
            </div>

            {/* Burst particles radiating outward */}
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
            >
              {BURST_PARTICLES.map((p, i) => (
                <div
                  key={`burst-${i}`}
                  className="burst-particle"
                  style={
                    {
                      left: "50%",
                      top: "50%",
                      width: p.size,
                      height: p.size,
                      backgroundColor: p.color,
                      animationDelay: p.delay,
                      "--bx": p.bx,
                      "--by": p.by,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>

            {/* Sparkle overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
            >
              {SPARKLE_POSITIONS.map((pos, i) => (
                <div
                  key={`sparkle-${i}`}
                  className="absolute text-yellow-200 text-sm sparkle"
                  style={{
                    left: pos.left,
                    top: pos.top,
                    animationDelay: pos.delay,
                  }}
                >
                  ✦
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Vote distribution chart with voter names */}
      {distribution.length > 0 ? (
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
            Distribution
          </h3>
          <div className="space-y-3">
            {distribution.map(([value, count]) => {
              const pct = Math.round((count / totalVotes) * 100);
              const voters = votersByValue.get(value) || [];
              return (
                <div key={value}>
                  <div
                    className="flex items-center gap-3"
                    aria-label={`${value}: ${count} vote${count !== 1 ? "s" : ""} (${pct}%) — ${voters.join(", ")}`}
                  >
                    <span className="w-10 text-right font-semibold text-sm shrink-0">
                      <VoteValueDisplay value={value} />
                    </span>
                    <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-md transition-all duration-500 ease-out flex items-center justify-end pr-2"
                        style={{
                          width: `${(count / maxCount) * 100}%`,
                          minWidth: "2rem",
                        }}
                      >
                        <span className="text-xs font-medium text-primary-foreground">
                          {count}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-10 shrink-0">
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 pl-[3.25rem]">
                    <span className="text-xs text-muted-foreground">
                      {voters.join(", ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground italic">No votes yet</p>
      )}

      {/* Statistics section */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
          Statistics
        </h3>
        <div
          className={`grid gap-2 sm:gap-4 ${showNumericStats ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {showNumericStats && (
            <div
              className="p-2.5 sm:p-4 rounded-md bg-muted"
              role="group"
              aria-label={`Average: ${statistics.average !== null ? statistics.average.toFixed(1) : "N/A"}`}
            >
              <p className="text-sm text-muted-foreground mb-1">Average</p>
              <p className="text-xl sm:text-2xl font-bold">
                {statistics.average !== null
                  ? statistics.average.toFixed(1)
                  : "N/A"}
              </p>
            </div>
          )}
          <div
            className="p-2.5 sm:p-4 rounded-md bg-muted"
            role="group"
            aria-label={`Most Common: ${statistics.mode !== null ? statistics.mode : "N/A"}`}
          >
            <p className="text-sm text-muted-foreground mb-1">Most Common</p>
            <p className="text-xl sm:text-2xl font-bold">
              {statistics.mode !== null ? (
                <VoteValueDisplay value={statistics.mode} />
              ) : (
                "N/A"
              )}
            </p>
          </div>
          {showNumericStats && (
            <>
              <div
                className="p-2.5 sm:p-4 rounded-md bg-muted"
                role="group"
                aria-label={`Range: ${statistics.min !== null && statistics.max !== null ? `${statistics.min} - ${statistics.max}` : "N/A"}`}
              >
                <p className="text-sm text-muted-foreground mb-1">Range</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {statistics.min !== null && statistics.max !== null
                    ? `${statistics.min} - ${statistics.max}`
                    : "N/A"}
                </p>
              </div>
              <div
                className="p-2.5 sm:p-4 rounded-md bg-muted"
                role="group"
                aria-label={`Spread: ${statistics.range !== null ? statistics.range : "N/A"}`}
              >
                <p className="text-sm text-muted-foreground mb-1">Spread</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {statistics.range !== null ? statistics.range : "N/A"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
