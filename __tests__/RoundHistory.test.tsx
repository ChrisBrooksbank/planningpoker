import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RoundHistory } from "@/components/RoundHistory";
import type { RoundHistoryEntry, VoteStatistics } from "@/lib/types";

function makeStats(overrides: Partial<VoteStatistics> = {}): VoteStatistics {
  return {
    average: null,
    mode: null,
    min: null,
    max: null,
    range: null,
    ...overrides,
  };
}

function makeEntry(
  overrides: Partial<RoundHistoryEntry> = {}
): RoundHistoryEntry {
  return {
    topic: "Default topic",
    votes: {},
    statistics: makeStats(),
    completedAt: Date.now(),
    ...overrides,
  };
}

describe("RoundHistory", () => {
  it("renders nothing when history is empty", () => {
    render(<RoundHistory history={[]} />);
    expect(screen.getByText("Round History (0)")).toBeInTheDocument();
  });

  it("displays the correct round count", () => {
    const history = [makeEntry(), makeEntry(), makeEntry()];
    render(<RoundHistory history={history} />);
    expect(screen.getByText("Round History (3)")).toBeInTheDocument();
  });

  it("displays rounds in reverse order (most recent first)", () => {
    const history = [
      makeEntry({ topic: "First topic" }),
      makeEntry({ topic: "Second topic" }),
      makeEntry({ topic: "Third topic" }),
    ];
    render(<RoundHistory history={history} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("#3");
    expect(buttons[0]).toHaveTextContent("Third topic");
    expect(buttons[2]).toHaveTextContent("#1");
    expect(buttons[2]).toHaveTextContent("First topic");
  });

  it('shows "No topic" for entries without a topic', () => {
    render(<RoundHistory history={[makeEntry({ topic: "" })]} />);
    expect(screen.getByText("No topic")).toBeInTheDocument();
  });

  it("shows mode badge in collapsed header when mode exists", () => {
    const history = [makeEntry({ statistics: makeStats({ mode: "5" }) })];
    render(<RoundHistory history={history} />);
    // mode should appear in the header even when collapsed
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("expands a round when clicked", () => {
    const history = [
      makeEntry({
        topic: "Sprint planning",
        votes: {
          user1: { participantName: "Alice", value: "5" },
          user2: { participantName: "Bob", value: "8" },
        },
        statistics: makeStats({ average: 6.5, mode: "5", range: 3 }),
      }),
    ];
    render(<RoundHistory history={history} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");

    // Vote details should now be visible
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("collapses a round when clicked again", () => {
    const history = [
      makeEntry({
        votes: {
          user1: { participantName: "Alice", value: "5" },
        },
      }),
    ];
    render(<RoundHistory history={history} />);

    const button = screen.getByRole("button");
    fireEvent.click(button); // expand
    expect(screen.getByText("Alice")).toBeInTheDocument();

    fireEvent.click(button); // collapse
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("only expands one round at a time", () => {
    const history = [
      makeEntry({
        topic: "Round A",
        votes: { u1: { participantName: "Alice", value: "3" } },
      }),
      makeEntry({
        topic: "Round B",
        votes: { u2: { participantName: "Bob", value: "5" } },
      }),
    ];
    render(<RoundHistory history={history} />);

    const buttons = screen.getAllByRole("button");
    // expand first displayed round (Round B = #2)
    fireEvent.click(buttons[0]);
    expect(screen.getByText("Bob")).toBeInTheDocument();

    // expand second displayed round (Round A = #1)
    fireEvent.click(buttons[1]);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("sorts votes alphabetically by participant name", () => {
    const history = [
      makeEntry({
        votes: {
          u3: { participantName: "Charlie", value: "5" },
          u1: { participantName: "Alice", value: "3" },
          u2: { participantName: "Bob", value: "8" },
        },
      }),
    ];
    render(<RoundHistory history={history} />);
    fireEvent.click(screen.getByRole("button"));

    const listItems = screen.getAllByRole("listitem");
    expect(listItems[0]).toHaveTextContent("Alice");
    expect(listItems[1]).toHaveTextContent("Bob");
    expect(listItems[2]).toHaveTextContent("Charlie");
  });

  describe("fibonacci deck statistics", () => {
    it("shows average, mode, and spread for fibonacci deck", () => {
      const history = [
        makeEntry({
          votes: { u1: { participantName: "A", value: "5" } },
          statistics: makeStats({
            average: 6.5,
            mode: "5",
            range: 3,
          }),
        }),
      ];
      render(<RoundHistory history={history} deckType="fibonacci" />);
      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("Avg")).toBeInTheDocument();
      expect(screen.getByText("6.5")).toBeInTheDocument();
      expect(screen.getByText("Spread")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("uses fibonacci deck by default", () => {
      const history = [
        makeEntry({
          votes: { u1: { participantName: "A", value: "5" } },
          statistics: makeStats({ average: 5, mode: "5", range: 0 }),
        }),
      ];
      render(<RoundHistory history={history} />);
      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("Avg")).toBeInTheDocument();
    });
  });

  describe("tshirt deck statistics", () => {
    it("hides average and spread for tshirt deck", () => {
      const history = [
        makeEntry({
          votes: { u1: { participantName: "A", value: "M" } },
          statistics: makeStats({
            average: null,
            mode: "M",
            range: null,
          }),
        }),
      ];
      render(<RoundHistory history={history} deckType="tshirt" />);
      fireEvent.click(screen.getByRole("button"));

      expect(screen.queryByText("Avg")).not.toBeInTheDocument();
      expect(screen.queryByText("Spread")).not.toBeInTheDocument();
      expect(screen.getByText("Mode")).toBeInTheDocument();
    });
  });

  it("does not render average when average is null", () => {
    const history = [
      makeEntry({
        votes: { u1: { participantName: "A", value: "5" } },
        statistics: makeStats({ average: null, mode: "5", range: 3 }),
      }),
    ];
    render(<RoundHistory history={history} deckType="fibonacci" />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.queryByText("Avg")).not.toBeInTheDocument();
  });

  it("does not render mode when mode is null", () => {
    const history = [
      makeEntry({
        votes: { u1: { participantName: "A", value: "5" } },
        statistics: makeStats({ mode: null }),
      }),
    ];
    render(<RoundHistory history={history} deckType="fibonacci" />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.queryByText("Mode")).not.toBeInTheDocument();
  });

  it("has accessible vote list label", () => {
    const history = [
      makeEntry({
        votes: { u1: { participantName: "A", value: "5" } },
      }),
    ];
    render(<RoundHistory history={history} />);
    fireEvent.click(screen.getByRole("button"));

    expect(
      screen.getByRole("list", { name: "Round 1 votes" })
    ).toBeInTheDocument();
  });
});
