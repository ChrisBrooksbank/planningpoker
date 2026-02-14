import type { Vote, VoteStatistics, Participant } from "@/lib/types";

interface VoteResultsProps {
  votes: Record<string, Vote>;
  participants: Participant[];
  statistics: VoteStatistics;
}

function VoteValueDisplay({ value }: { value: string }) {
  if (value === "coffee") {
    return (
      <>
        <span aria-hidden="true">☕</span>
        <span className="sr-only">Coffee break</span>
      </>
    );
  }
  return <>{value}</>;
}

export function VoteResults({
  votes,
  participants,
  statistics,
}: VoteResultsProps) {
  // Create a map of userId to participant name for quick lookup
  const participantMap = new Map(participants.map((p) => [p.id, p.name]));

  // Convert votes object to array and sort by participant name
  const votesArray = Object.entries(votes)
    .map(([userId, vote]) => ({
      userId,
      participantName: participantMap.get(userId) || "Unknown",
      vote,
    }))
    .sort((a, b) => a.participantName.localeCompare(b.participantName));

  function getVoteLabel(value: string): string {
    if (value === "coffee") return "coffee break";
    return value;
  }

  return (
    <div className="space-y-6">
      {/* Votes section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Votes</h3>
        {votesArray.length === 0 ? (
          <p className="text-muted-foreground italic">No votes yet</p>
        ) : (
          <ul className="space-y-2" aria-label="Individual votes">
            {votesArray.map(({ userId, participantName, vote }) => (
              <li
                key={userId}
                className="flex items-center justify-between p-3 rounded-md bg-muted"
                aria-label={`${participantName} voted ${getVoteLabel(vote.value)}`}
              >
                <span className="font-medium truncate max-w-[140px] sm:max-w-[200px]" title={participantName}>
                  {participantName}
                </span>
                <span
                  className={`px-3 py-1 rounded-md font-semibold ${
                    vote.value === "?"
                      ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                      : vote.value === "coffee"
                        ? "bg-orange-500/20 text-orange-700 dark:text-orange-400"
                        : "bg-primary/20 text-primary"
                  }`}
                >
                  <VoteValueDisplay value={vote.value} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Statistics section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Statistics</h3>
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="p-2.5 sm:p-4 rounded-md bg-muted" role="group" aria-label={`Average: ${statistics.average !== null ? statistics.average.toFixed(1) : "N/A"}`}>
            <p className="text-sm text-muted-foreground mb-1">Average</p>
            <p className="text-xl sm:text-2xl font-bold">
              {statistics.average !== null
                ? statistics.average.toFixed(1)
                : "N/A"}
            </p>
          </div>
          <div className="p-2.5 sm:p-4 rounded-md bg-muted" role="group" aria-label={`Most Common: ${statistics.mode !== null ? (statistics.mode === "coffee" ? "Coffee break" : statistics.mode) : "N/A"}`}>
            <p className="text-sm text-muted-foreground mb-1">Most Common</p>
            <p className="text-xl sm:text-2xl font-bold">
              {statistics.mode !== null
                ? <VoteValueDisplay value={statistics.mode} />
                : "N/A"}
            </p>
          </div>
          <div className="p-2.5 sm:p-4 rounded-md bg-muted" role="group" aria-label={`Range: ${statistics.min !== null && statistics.max !== null ? `${statistics.min} - ${statistics.max}` : "N/A"}`}>
            <p className="text-sm text-muted-foreground mb-1">Range</p>
            <p className="text-xl sm:text-2xl font-bold">
              {statistics.min !== null && statistics.max !== null
                ? `${statistics.min} - ${statistics.max}`
                : "N/A"}
            </p>
          </div>
          <div className="p-2.5 sm:p-4 rounded-md bg-muted" role="group" aria-label={`Spread: ${statistics.range !== null ? statistics.range : "N/A"}`}>
            <p className="text-sm text-muted-foreground mb-1">Spread</p>
            <p className="text-xl sm:text-2xl font-bold">
              {statistics.range !== null ? statistics.range : "N/A"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
