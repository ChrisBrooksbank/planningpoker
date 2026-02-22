interface SessionHintProps {
  isModerator: boolean;
  isVotingOpen: boolean;
  isRevealed: boolean;
  hasVoted: boolean;
  moderatorName: string;
  votedCount: number;
  totalParticipants: number;
  isObserver?: boolean;
}

interface HintResult {
  primary: string;
  secondary?: string;
  urgent?: boolean;
}

export function getSessionHint(props: SessionHintProps): HintResult {
  const {
    isModerator,
    isVotingOpen,
    isRevealed,
    hasVoted,
    moderatorName,
    votedCount,
    totalParticipants,
    isObserver = false,
  } = props;

  // Observer hints take priority for non-moderator observers
  if (isObserver && !isModerator) {
    if (isVotingOpen) {
      return {
        primary: "You are observing. Votes are in progress.",
      };
    }
    return {
      primary: "You are observing this room.",
    };
  }

  // Revealed state
  if (isRevealed) {
    if (isModerator) {
      return {
        primary:
          "Review the results, then enter a new topic and click Next Vote for the next round.",
      };
    }
    return {
      primary: `${moderatorName} will start the next round when ready.`,
    };
  }

  // Voting open
  if (isVotingOpen) {
    if (isModerator) {
      return {
        primary: `Click Reveal when the team is ready, or wait for more votes. (${votedCount} of ${totalParticipants} voted)`,
      };
    }

    if (hasVoted) {
      return {
        primary: `Vote submitted! Waiting for ${moderatorName} to reveal votes. You can change your vote by selecting a different card.`,
      };
    }

    return {
      primary: "Select a card below to cast your vote!",
      secondary: `Your vote is private — ${moderatorName} will reveal all votes together.`,
      urgent: true,
    };
  }

  // Pre-voting (not voting, not revealed)
  if (isModerator) {
    return {
      primary: "Enter a topic and click Start Vote to begin a round.",
    };
  }

  return {
    primary: `Waiting for ${moderatorName} to start a voting round...`,
  };
}

export function SessionHint(props: SessionHintProps) {
  const { primary, secondary, urgent } = getSessionHint(props);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-lg border px-3 py-2.5 sm:px-4 sm:py-3 flex items-start gap-2 sm:gap-3 ${
        urgent
          ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
          : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20"
      }`}
    >
      <svg
        className={`h-5 w-5 mt-0.5 shrink-0 ${
          urgent
            ? "text-amber-500 dark:text-amber-400"
            : "text-blue-500 dark:text-blue-400"
        }`}
        aria-hidden="true"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        {urgent ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 3.75L3.75 20.25h15L11.25 3.75zm.75 6v4.5m0 2.25h.008v.008H12v-.008z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        )}
      </svg>
      <div>
        <p
          className={`text-sm font-medium ${
            urgent
              ? "text-amber-800 dark:text-amber-200"
              : "text-blue-800 dark:text-blue-200"
          }`}
        >
          {primary}
        </p>
        {secondary && (
          <p
            className={`text-xs mt-1 ${
              urgent
                ? "text-amber-600 dark:text-amber-400"
                : "text-blue-600 dark:text-blue-400"
            }`}
          >
            {secondary}
          </p>
        )}
      </div>
    </div>
  );
}
