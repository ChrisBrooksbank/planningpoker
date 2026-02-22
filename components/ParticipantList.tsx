import { Participant } from "@/lib/types";

interface ParticipantListProps {
  participants: Participant[];
  currentUserId: string;
  votedUserIds?: Set<string>;
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [0, 30, 60, 120, 180, 210, 240, 270, 300, 330];
  const hue = hues[Math.abs(hash) % hues.length];
  return `hsl(${hue}, 65%, 45%)`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ParticipantList({
  participants,
  currentUserId,
  votedUserIds = new Set(),
}: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
          Participants
        </h2>
        <p className="text-sm text-muted-foreground">No participants yet</p>
      </div>
    );
  }

  const votedCount = participants.filter((p) => votedUserIds.has(p.id)).length;

  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
        Participants ({participants.length})
      </h2>
      <span role="status" aria-live="polite" className="sr-only">
        {participants.length} participants, {votedCount} voted
      </span>
      <ul
        className="space-y-2 max-h-[180px] lg:max-h-none overflow-y-auto"
        aria-label="Participant list"
      >
        {participants.map((participant) => {
          const isYou = participant.id === currentUserId;
          const hasVoted = votedUserIds.has(participant.id);
          const connectionStatus = participant.isConnected
            ? "Online"
            : "Offline";
          const ariaLabel = [
            participant.name,
            isYou ? "You" : null,
            participant.isModerator ? "Moderator" : null,
            participant.isObserver ? "Observer" : null,
            hasVoted ? "Voted" : null,
            connectionStatus,
          ]
            .filter(Boolean)
            .join(", ");

          const avatarColor = getAvatarColor(participant.name);
          const initials = getInitials(participant.name);

          return (
            <li
              key={participant.id}
              className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
              aria-label={ariaLabel}
            >
              <div className="flex items-center gap-2">
                <div className="relative shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: avatarColor }}
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                  {hasVoted && (
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <span
                  className="text-base font-medium truncate max-w-[120px] sm:max-w-[160px]"
                  title={participant.name}
                >
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
                {participant.isObserver && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Observer
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    participant.isConnected
                      ? "bg-green-500"
                      : "bg-muted-foreground"
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
