import { Participant } from "@/lib/types";

interface ParticipantListProps {
  participants: Participant[];
  currentUserId: string;
  votedUserIds?: Set<string>;
}

export function ParticipantList({
  participants,
  currentUserId,
  votedUserIds = new Set(),
}: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-semibold mb-4">Participants</h2>
        <p className="text-sm text-muted-foreground">No participants yet</p>
      </div>
    );
  }

  const votedCount = participants.filter(p => votedUserIds.has(p.id)).length;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold mb-4">
        Participants ({participants.length})
      </h2>
      <span role="status" aria-live="polite" className="sr-only">
        {participants.length} participants, {votedCount} voted
      </span>
      <ul className="space-y-2" aria-label="Participant list">
        {participants.map((participant) => {
          const isYou = participant.id === currentUserId;
          const hasVoted = votedUserIds.has(participant.id);
          const connectionStatus = participant.isConnected ? "Online" : "Offline";
          const ariaLabel = [
            participant.name,
            isYou ? "You" : null,
            participant.isModerator ? "Moderator" : null,
            hasVoted ? "Voted" : null,
            connectionStatus,
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <li
              key={participant.id}
              className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
              aria-label={ariaLabel}
            >
              <div className="flex items-center gap-2">
                <span className="text-base font-medium truncate max-w-[160px]" title={participant.name}>
                  {participant.name}
                </span>
                {isYou && (
                  <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    You
                  </span>
                )}
                {participant.isModerator && (
                  <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Moderator
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasVoted && (
                  <span className="text-xs text-muted-foreground" aria-hidden="true">Voted</span>
                )}
                <div
                  className={`h-2 w-2 rounded-full ${
                    participant.isConnected ? "bg-green-500" : "bg-gray-400"
                  }`}
                  aria-hidden="true"
                />
                <span className="sr-only">{connectionStatus}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
