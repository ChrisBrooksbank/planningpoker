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
];

const CONFETTI_POSITIONS = [
  { left: "10%", delay: "0s" },
  { left: "20%", delay: "0.1s" },
  { left: "35%", delay: "0.2s" },
  { left: "45%", delay: "0.05s" },
  { left: "55%", delay: "0.15s" },
  { left: "65%", delay: "0.25s" },
  { left: "78%", delay: "0.08s" },
  { left: "88%", delay: "0.18s" },
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

  const isConsensus =
    totalVotes > 1 && distribution.length === 1;
  const consensusValue = isConsensus ? distribution[0][0] : null;

  function getVoteLabel(value: string): string {
    return value;
  }

  return (
    <div className="space-y-6">
      {/* Consensus celebration */}
      {isConsensus && (
        <div className="relative overflow-hidden rounded-lg consensus-banner">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 text-center text-white font-bold text-lg">
            Consensus! Everyone voted{" "}
            <VoteValueDisplay value={consensusValue!} />
          </div>
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          >
            {CONFETTI_POSITIONS.map((pos, i) => (
              <div
                key={i}
                className="absolute top-0 w-2 h-2 rounded-sm confetti-piece"
                style={{
                  left: pos.left,
                  animationDelay: pos.delay,
                  backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Votes section with flip animation */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
          Votes
        </h3>
        {votesArray.length === 0 ? (
          <p className="text-muted-foreground italic">No votes yet</p>
        ) : (
          <ul
            className="space-y-2 flip-card-container"
            aria-label="Individual votes"
          >
            {votesArray.map(({ userId, participantName, vote }, index) => (
              <li
                key={userId}
                className="flex items-center justify-between p-3 rounded-md bg-muted/50 flip-card-animate"
                style={{ animationDelay: `${index * 100}ms` }}
                aria-label={`${participantName} voted ${getVoteLabel(vote.value)}`}
              >
                <span
                  className="font-medium truncate max-w-[140px] sm:max-w-[200px]"
                  title={participantName}
                >
                  {participantName}
                </span>
                <span className="px-3 py-1 rounded-md font-semibold bg-primary/20 text-primary">
                  <VoteValueDisplay value={vote.value} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Vote distribution chart */}
      {distribution.length > 0 && (
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
            Distribution
          </h3>
          <div className="space-y-2">
            {distribution.map(([value, count]) => {
              const pct = Math.round((count / totalVotes) * 100);
              return (
                <div
                  key={value}
                  className="flex items-center gap-3"
                  aria-label={`${value}: ${count} vote${count !== 1 ? "s" : ""} (${pct}%)`}
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
              );
            })}
          </div>
        </div>
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
