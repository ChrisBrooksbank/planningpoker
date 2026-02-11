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

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold mb-4">
        Participants ({participants.length})
      </h2>
      <ul className="space-y-2">
        {participants.map((participant) => (
          <li
            key={participant.id}
            className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {participant.name}
                {participant.id === currentUserId && (
                  <span className="text-muted-foreground"> (You)</span>
                )}
              </span>
              {participant.isModerator && (
                <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  Moderator
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {votedUserIds.has(participant.id) && (
                <span className="text-xs text-muted-foreground">✓ Voted</span>
              )}
              <div
                className={`h-2 w-2 rounded-full ${
                  participant.isConnected ? "bg-green-500" : "bg-gray-400"
                }`}
                title={participant.isConnected ? "Online" : "Offline"}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
