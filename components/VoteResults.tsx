import type { Vote, VoteStatistics, Participant } from "@/lib/types";

interface VoteResultsProps {
  votes: Record<string, Vote>;
  participants: Participant[];
  statistics: VoteStatistics;
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

  return (
    <div className="space-y-6">
      {/* Votes section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Votes</h3>
        <div className="space-y-2">
          {votesArray.length === 0 ? (
            <p className="text-muted-foreground italic">No votes yet</p>
          ) : (
            votesArray.map(({ userId, participantName, vote }) => (
              <div
                key={userId}
                className="flex items-center justify-between p-3 rounded-md bg-muted"
              >
                <span className="font-medium">{participantName}</span>
                <span
                  className={`px-3 py-1 rounded-md font-semibold ${
                    vote.value === "?"
                      ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                      : vote.value === "coffee"
                        ? "bg-orange-500/20 text-orange-700 dark:text-orange-400"
                        : "bg-primary/20 text-primary"
                  }`}
                >
                  {vote.value === "coffee" ? "☕" : vote.value}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Statistics section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-md bg-muted">
            <p className="text-sm text-muted-foreground mb-1">Average</p>
            <p className="text-2xl font-bold">
              {statistics.average !== null
                ? statistics.average.toFixed(1)
                : "N/A"}
            </p>
          </div>
          <div className="p-4 rounded-md bg-muted">
            <p className="text-sm text-muted-foreground mb-1">Most Common</p>
            <p className="text-2xl font-bold">
              {statistics.mode !== null
                ? statistics.mode === "coffee"
                  ? "☕"
                  : statistics.mode
                : "N/A"}
            </p>
          </div>
          <div className="p-4 rounded-md bg-muted">
            <p className="text-sm text-muted-foreground mb-1">Range</p>
            <p className="text-2xl font-bold">
              {statistics.min !== null && statistics.max !== null
                ? `${statistics.min} - ${statistics.max}`
                : "N/A"}
            </p>
          </div>
          <div className="p-4 rounded-md bg-muted">
            <p className="text-sm text-muted-foreground mb-1">Spread</p>
            <p className="text-2xl font-bold">
              {statistics.range !== null ? statistics.range : "N/A"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
