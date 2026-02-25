import { describe, it, expect } from "vitest";
import { isClientMessage } from "../../lib/websocket-messages";

describe("isClientMessage", () => {
  it.each([
    "join-session",
    "submit-vote",
    "set-topic",
    "reveal-votes",
    "new-round",
    "toggle-observer",
    "promote-to-moderator",
    "demote-self",
    "claim-moderator",
  ])('should return true for client message type "%s"', (type) => {
    expect(isClientMessage({ type })).toBe(true);
  });

  it.each([
    "connected",
    "session-state",
    "participant-joined",
    "participant-left",
    "participant-removed",
    "vote-submitted",
    "topic-changed",
    "votes-revealed",
    "round-started",
    "observer-toggled",
    "moderator-changed",
    "error",
  ])('should return false for server message type "%s"', (type) => {
    expect(isClientMessage({ type })).toBe(false);
  });

  it("should return false for unknown message types", () => {
    expect(isClientMessage({ type: "unknown" })).toBe(false);
    expect(isClientMessage({ type: "" })).toBe(false);
    expect(isClientMessage({ type: "JOIN-SESSION" })).toBe(false);
  });
});
