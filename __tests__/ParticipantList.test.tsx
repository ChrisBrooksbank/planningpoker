import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ParticipantList } from "@/components/ParticipantList";
import type { Participant } from "@/lib/types";

describe("ParticipantList", () => {
  const mockParticipants: Participant[] = [
    {
      id: "user-1",
      name: "Alice",
      isModerator: true,
      isConnected: true,
    },
    {
      id: "user-2",
      name: "Bob",
      isModerator: false,
      isConnected: true,
    },
    {
      id: "user-3",
      name: "Charlie",
      isModerator: false,
      isConnected: false,
    },
  ];

  it("renders participant list with all participants", () => {
    render(
      <ParticipantList participants={mockParticipants} currentUserId="user-2" />
    );

    expect(screen.getByText("Participants (3)")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("displays moderator badge for moderator", () => {
    render(
      <ParticipantList participants={mockParticipants} currentUserId="user-2" />
    );

    expect(screen.getByText("Moderator")).toBeInTheDocument();
  });

  it("does not display moderator badge for non-moderators", () => {
    const nonModeratorParticipants: Participant[] = [
      {
        id: "user-1",
        name: "Alice",
        isModerator: false,
        isConnected: true,
      },
      {
        id: "user-2",
        name: "Bob",
        isModerator: false,
        isConnected: true,
      },
    ];

    render(
      <ParticipantList
        participants={nonModeratorParticipants}
        currentUserId="user-2"
      />
    );

    expect(screen.queryByText("Moderator")).not.toBeInTheDocument();
  });

  it("marks current user with '(You)' indicator", () => {
    render(
      <ParticipantList participants={mockParticipants} currentUserId="user-2" />
    );

    expect(screen.getByText("(You)")).toBeInTheDocument();
  });

  it("shows online status for connected participants", () => {
    const { container } = render(
      <ParticipantList participants={mockParticipants} currentUserId="user-2" />
    );

    // Alice and Bob are connected (green dots)
    const greenDots = container.querySelectorAll(".bg-green-500");
    expect(greenDots.length).toBe(2);
  });

  it("shows offline status for disconnected participants", () => {
    const { container } = render(
      <ParticipantList participants={mockParticipants} currentUserId="user-2" />
    );

    // Charlie is disconnected (gray dot)
    const grayDots = container.querySelectorAll(".bg-gray-400");
    expect(grayDots.length).toBe(1);
  });

  it("displays empty state when no participants", () => {
    render(<ParticipantList participants={[]} currentUserId="user-1" />);

    expect(screen.getByText("Participants")).toBeInTheDocument();
    expect(screen.getByText("No participants yet")).toBeInTheDocument();
  });

  it("displays correct participant count", () => {
    render(
      <ParticipantList participants={mockParticipants} currentUserId="user-2" />
    );

    expect(screen.getByText("Participants (3)")).toBeInTheDocument();
  });

  it("handles single participant", () => {
    const singleParticipant: Participant[] = [
      {
        id: "user-1",
        name: "Alice",
        isModerator: true,
        isConnected: true,
      },
    ];

    render(
      <ParticipantList
        participants={singleParticipant}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText("Participants (1)")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("(You)")).toBeInTheDocument();
    expect(screen.getByText("Moderator")).toBeInTheDocument();
  });

  it("renders moderator badge with correct styling", () => {
    render(
      <ParticipantList participants={mockParticipants} currentUserId="user-2" />
    );

    const badge = screen.getByText("Moderator");
    expect(badge).toHaveClass("bg-primary");
    expect(badge).toHaveClass("text-primary-foreground");
  });

  it("shows all online participants correctly", () => {
    const allOnlineParticipants: Participant[] = [
      {
        id: "user-1",
        name: "Alice",
        isModerator: true,
        isConnected: true,
      },
      {
        id: "user-2",
        name: "Bob",
        isModerator: false,
        isConnected: true,
      },
      {
        id: "user-3",
        name: "Charlie",
        isModerator: false,
        isConnected: true,
      },
    ];

    const { container } = render(
      <ParticipantList
        participants={allOnlineParticipants}
        currentUserId="user-2"
      />
    );

    const greenDots = container.querySelectorAll(".bg-green-500");
    expect(greenDots.length).toBe(3);
  });

  it("shows all offline participants correctly", () => {
    const allOfflineParticipants: Participant[] = [
      {
        id: "user-1",
        name: "Alice",
        isModerator: true,
        isConnected: false,
      },
      {
        id: "user-2",
        name: "Bob",
        isModerator: false,
        isConnected: false,
      },
    ];

    const { container } = render(
      <ParticipantList
        participants={allOfflineParticipants}
        currentUserId="user-2"
      />
    );

    const grayDots = container.querySelectorAll(".bg-gray-400");
    expect(grayDots.length).toBe(2);
  });

  it("shows voted status for participants who have voted", () => {
    const votedUserIds = new Set(["user-1", "user-3"]);

    render(
      <ParticipantList
        participants={mockParticipants}
        currentUserId="user-2"
        votedUserIds={votedUserIds}
      />
    );

    // Should show "✓ Voted" for user-1 (Alice) and user-3 (Charlie)
    const votedIndicators = screen.getAllByText("✓ Voted");
    expect(votedIndicators.length).toBe(2);
  });

  it("does not show voted status for participants who have not voted", () => {
    const votedUserIds = new Set(["user-1"]);

    render(
      <ParticipantList
        participants={mockParticipants}
        currentUserId="user-2"
        votedUserIds={votedUserIds}
      />
    );

    // Only one "✓ Voted" indicator should appear
    const votedIndicators = screen.getAllByText("✓ Voted");
    expect(votedIndicators.length).toBe(1);
  });

  it("shows no voted status when votedUserIds is empty", () => {
    const votedUserIds = new Set<string>();

    render(
      <ParticipantList
        participants={mockParticipants}
        currentUserId="user-2"
        votedUserIds={votedUserIds}
      />
    );

    expect(screen.queryByText("✓ Voted")).not.toBeInTheDocument();
  });

  it("handles votedUserIds prop being omitted", () => {
    render(
      <ParticipantList participants={mockParticipants} currentUserId="user-2" />
    );

    // No voted indicators should appear
    expect(screen.queryByText("✓ Voted")).not.toBeInTheDocument();
  });
});
