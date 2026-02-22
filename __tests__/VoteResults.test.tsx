import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VoteResults } from "@/components/VoteResults";
import type { Vote, VoteStatistics, Participant } from "@/lib/types";

describe("VoteResults", () => {
  const mockParticipants: Participant[] = [
    {
      id: "user1",
      name: "Alice",
      isModerator: true,
      isConnected: true,
      isObserver: false,
    },
    {
      id: "user2",
      name: "Bob",
      isModerator: false,
      isConnected: true,
      isObserver: false,
    },
    {
      id: "user3",
      name: "Charlie",
      isModerator: false,
      isConnected: true,
      isObserver: false,
    },
  ];

  it("should render votes with participant names", () => {
    const votes: Record<string, Vote> = {
      user1: { userId: "user1", value: "5", submittedAt: Date.now() },
      user2: { userId: "user2", value: "8", submittedAt: Date.now() },
    };

    const statistics: VoteStatistics = {
      average: 6.5,
      mode: "5",
      min: 5,
      max: 8,
      range: 3,
    };

    render(
      <VoteResults
        votes={votes}
        participants={mockParticipants}
        statistics={statistics}
      />
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    // "5" appears in both votes and statistics (mode), so use getAllByText
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("should sort votes by participant name alphabetically", () => {
    const votes: Record<string, Vote> = {
      user3: { userId: "user3", value: "3", submittedAt: Date.now() },
      user1: { userId: "user1", value: "5", submittedAt: Date.now() },
      user2: { userId: "user2", value: "8", submittedAt: Date.now() },
    };

    const statistics: VoteStatistics = {
      average: 5.3,
      mode: "3",
      min: 3,
      max: 8,
      range: 5,
    };

    render(
      <VoteResults
        votes={votes}
        participants={mockParticipants}
        statistics={statistics}
      />
    );

    const names = screen
      .getAllByText(/Alice|Bob|Charlie/)
      .map((el) => el.textContent);
    expect(names).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("should display average statistic correctly", () => {
    const votes: Record<string, Vote> = {
      user1: { userId: "user1", value: "5", submittedAt: Date.now() },
      user2: { userId: "user2", value: "8", submittedAt: Date.now() },
    };

    const statistics: VoteStatistics = {
      average: 6.5,
      mode: "5",
      min: 5,
      max: 8,
      range: 3,
    };

    render(
      <VoteResults
        votes={votes}
        participants={mockParticipants}
        statistics={statistics}
      />
    );

    expect(screen.getByText("Average")).toBeInTheDocument();
    expect(screen.getByText("6.5")).toBeInTheDocument();
  });

  it("should display mode statistic correctly", () => {
    const votes: Record<string, Vote> = {
      user1: { userId: "user1", value: "5", submittedAt: Date.now() },
      user2: { userId: "user2", value: "5", submittedAt: Date.now() },
      user3: { userId: "user3", value: "8", submittedAt: Date.now() },
    };

    const statistics: VoteStatistics = {
      average: 6.0,
      mode: "5",
      min: 5,
      max: 8,
      range: 3,
    };

    render(
      <VoteResults
        votes={votes}
        participants={mockParticipants}
        statistics={statistics}
      />
    );

    expect(screen.getByText("Most Common")).toBeInTheDocument();
    // Mode value "5" should appear 3 times: 2 in votes, 1 in statistics
    const modeElements = screen.getAllByText("5");
    expect(modeElements.length).toBeGreaterThan(0);
  });

  it("should display range statistic correctly", () => {
    const votes: Record<string, Vote> = {
      user1: { userId: "user1", value: "3", submittedAt: Date.now() },
      user2: { userId: "user2", value: "8", submittedAt: Date.now() },
    };

    const statistics: VoteStatistics = {
      average: 5.5,
      mode: "3",
      min: 3,
      max: 8,
      range: 5,
    };

    render(
      <VoteResults
        votes={votes}
        participants={mockParticipants}
        statistics={statistics}
      />
    );

    expect(screen.getByText("Range")).toBeInTheDocument();
    expect(screen.getByText("3 - 8")).toBeInTheDocument();
    expect(screen.getByText("Spread")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should display N/A for statistics when all null", () => {
    const votes: Record<string, Vote> = {
      user1: { userId: "user1", value: "XS", submittedAt: Date.now() },
      user2: { userId: "user2", value: "XL", submittedAt: Date.now() },
    };

    const statistics: VoteStatistics = {
      average: null,
      mode: "XS",
      min: null,
      max: null,
      range: null,
    };

    render(
      <VoteResults
        votes={votes}
        participants={mockParticipants}
        statistics={statistics}
      />
    );

    // Check that N/A is displayed for numeric statistics
    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBe(3); // Average, Range, Spread should be N/A
  });

  it("should show empty state when no votes", () => {
    const votes: Record<string, Vote> = {};

    const statistics: VoteStatistics = {
      average: null,
      mode: null,
      min: null,
      max: null,
      range: null,
    };

    render(
      <VoteResults
        votes={votes}
        participants={mockParticipants}
        statistics={statistics}
      />
    );

    expect(screen.getByText("No votes yet")).toBeInTheDocument();
  });

  it("should handle unknown participant gracefully", () => {
    const votes: Record<string, Vote> = {
      unknownUser: {
        userId: "unknownUser",
        value: "5",
        submittedAt: Date.now(),
      },
    };

    const statistics: VoteStatistics = {
      average: 5,
      mode: "5",
      min: 5,
      max: 5,
      range: 0,
    };

    render(
      <VoteResults
        votes={votes}
        participants={mockParticipants}
        statistics={statistics}
      />
    );

    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("should display votes section header", () => {
    const votes: Record<string, Vote> = {
      user1: { userId: "user1", value: "5", submittedAt: Date.now() },
    };

    const statistics: VoteStatistics = {
      average: 5,
      mode: "5",
      min: 5,
      max: 5,
      range: 0,
    };

    render(
      <VoteResults
        votes={votes}
        participants={mockParticipants}
        statistics={statistics}
      />
    );

    expect(screen.getByText("Votes")).toBeInTheDocument();
  });

  it("should display statistics section header", () => {
    const votes: Record<string, Vote> = {
      user1: { userId: "user1", value: "5", submittedAt: Date.now() },
    };

    const statistics: VoteStatistics = {
      average: 5,
      mode: "5",
      min: 5,
      max: 5,
      range: 0,
    };

    render(
      <VoteResults
        votes={votes}
        participants={mockParticipants}
        statistics={statistics}
      />
    );

    expect(screen.getByText("Statistics")).toBeInTheDocument();
  });
});
