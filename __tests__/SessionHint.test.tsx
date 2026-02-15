import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { getSessionHint, SessionHint } from "@/components/SessionHint";

const baseProps = {
  isModerator: false,
  isVotingOpen: false,
  isRevealed: false,
  hasVoted: false,
  moderatorName: "Alice",
  votedCount: 0,
  totalParticipants: 5,
};

describe("getSessionHint", () => {
  // Pre-voting state
  it("shows waiting message with moderator name for participant pre-voting", () => {
    const result = getSessionHint(baseProps);
    expect(result.primary).toBe(
      "Waiting for Alice to start a voting round..."
    );
    expect(result.secondary).toBeUndefined();
  });

  it("shows start vote guidance for moderator pre-voting", () => {
    const result = getSessionHint({ ...baseProps, isModerator: true });
    expect(result.primary).toBe(
      "Enter a topic and click Start Vote to begin a round."
    );
    expect(result.secondary).toBeUndefined();
  });

  // Voting open state — participant hasn't voted
  it("shows urgent call-to-action for participant who hasn't voted", () => {
    const result = getSessionHint({ ...baseProps, isVotingOpen: true });
    expect(result.primary).toBe(
      "Select a card below to cast your vote!"
    );
    expect(result.secondary).toContain("Your vote is private");
    expect(result.secondary).toContain("Alice");
    expect(result.secondary).toContain("? card");
    expect(result.secondary).toContain("coffee card");
    expect(result.urgent).toBe(true);
  });

  // Voting open state — participant has voted
  it("shows vote submitted message for participant who has voted", () => {
    const result = getSessionHint({
      ...baseProps,
      isVotingOpen: true,
      hasVoted: true,
    });
    expect(result.primary).toBe(
      "Vote submitted! Waiting for Alice to reveal votes. You can change your vote by selecting a different card."
    );
    expect(result.secondary).toBeUndefined();
  });

  // Voting open state — moderator
  it("shows vote count for moderator during voting", () => {
    const result = getSessionHint({
      ...baseProps,
      isModerator: true,
      isVotingOpen: true,
      votedCount: 3,
      totalParticipants: 5,
    });
    expect(result.primary).toBe(
      "Click Reveal when the team is ready, or wait for more votes. (3 of 5 voted)"
    );
    expect(result.secondary).toBeUndefined();
  });

  it("shows updated vote count when all participants have voted", () => {
    const result = getSessionHint({
      ...baseProps,
      isModerator: true,
      isVotingOpen: true,
      votedCount: 5,
      totalParticipants: 5,
    });
    expect(result.primary).toContain("(5 of 5 voted)");
  });

  // Revealed state
  it("shows next round message for participant after reveal", () => {
    const result = getSessionHint({
      ...baseProps,
      isRevealed: true,
    });
    expect(result.primary).toBe(
      "Alice will start the next round when ready."
    );
    expect(result.secondary).toBeUndefined();
  });

  it("shows review results guidance for moderator after reveal", () => {
    const result = getSessionHint({
      ...baseProps,
      isModerator: true,
      isRevealed: true,
    });
    expect(result.primary).toBe(
      "Review the results, then enter a new topic and click Start Vote for the next round."
    );
    expect(result.secondary).toBeUndefined();
  });

  // Edge cases
  it("uses moderatorName as provided in all messages", () => {
    const result = getSessionHint({
      ...baseProps,
      moderatorName: "the moderator",
    });
    expect(result.primary).toContain("the moderator");
  });

  it("revealed state takes priority over isVotingOpen", () => {
    const result = getSessionHint({
      ...baseProps,
      isVotingOpen: true,
      isRevealed: true,
    });
    // Should show revealed hint, not voting hint
    expect(result.primary).toBe(
      "Alice will start the next round when ready."
    );
  });

  it("no secondary hint for voted participant", () => {
    const result = getSessionHint({
      ...baseProps,
      isVotingOpen: true,
      hasVoted: true,
    });
    expect(result.secondary).toBeUndefined();
  });

  it("urgent flag is only set for participant who has not voted", () => {
    // Not voted — should be urgent
    const notVoted = getSessionHint({ ...baseProps, isVotingOpen: true });
    expect(notVoted.urgent).toBe(true);

    // Voted — should not be urgent
    const voted = getSessionHint({ ...baseProps, isVotingOpen: true, hasVoted: true });
    expect(voted.urgent).toBeFalsy();

    // Moderator — should not be urgent
    const moderator = getSessionHint({ ...baseProps, isModerator: true, isVotingOpen: true });
    expect(moderator.urgent).toBeFalsy();

    // Pre-voting — should not be urgent
    const preVoting = getSessionHint(baseProps);
    expect(preVoting.urgent).toBeFalsy();
  });

  it("no secondary hint for moderator during voting", () => {
    const result = getSessionHint({
      ...baseProps,
      isModerator: true,
      isVotingOpen: true,
    });
    expect(result.secondary).toBeUndefined();
  });
});

describe("SessionHint component", () => {
  it("renders primary hint text", () => {
    render(<SessionHint {...baseProps} />);
    expect(
      screen.getByText("Waiting for Alice to start a voting round...")
    ).toBeInTheDocument();
  });

  it("renders secondary hint when present", () => {
    render(<SessionHint {...baseProps} isVotingOpen={true} />);
    expect(screen.getByText(/\? card means/)).toBeInTheDocument();
  });

  it("does not render secondary hint when absent", () => {
    render(<SessionHint {...baseProps} />);
    expect(screen.queryByText(/\? card means/)).not.toBeInTheDocument();
  });

  it("has role=status for accessibility", () => {
    render(<SessionHint {...baseProps} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has aria-live=polite", () => {
    render(<SessionHint {...baseProps} />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-live",
      "polite"
    );
  });

  it("renders info icon with aria-hidden", () => {
    const { container } = render(<SessionHint {...baseProps} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
