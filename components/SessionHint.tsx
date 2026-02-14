interface SessionHintProps {
  isModerator: boolean;
  isVotingOpen: boolean;
  isRevealed: boolean;
  hasVoted: boolean;
  moderatorName: string;
  votedCount: number;
  totalParticipants: number;
}

interface HintResult {
  primary: string;
  secondary?: string;
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
  } = props;

  // Revealed state
  if (isRevealed) {
    if (isModerator) {
      return {
        primary:
          "Review the results, then enter a new topic and click Start Vote for the next round.",
      };
    }
    return {
      primary: `${moderatorName} will start the next round when ready.`,
    };
  }

  // Voting open
  if (isVotingOpen) {
    const cardHint =
      "The ? card means 'unsure' or 'need more info'. The coffee card means 'I need a break'.";

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
      primary: `Your vote is private — ${moderatorName} will reveal all votes together. Select a card to vote.`,
      secondary: cardHint,
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
  const { primary, secondary } = getSessionHint(props);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-2.5 sm:px-4 sm:py-3 flex items-start gap-2 sm:gap-3"
    >
      <svg
        className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0"
        aria-hidden="true"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
        />
      </svg>
      <div>
        <p className="text-sm text-blue-800 dark:text-blue-200">{primary}</p>
        {secondary && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {secondary}
          </p>
        )}
      </div>
    </div>
  );
}
