import { describe, it, expect } from "vitest";
import {
  cn,
  isValidRoomCode,
  isValidParticipantName,
  isValidSessionName,
  isValidTopic,
  isNumericCard,
} from "@/lib/utils";

describe("cn (className merger)", () => {
  it("merges class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("merges Tailwind classes without conflicts", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});

describe("isValidRoomCode", () => {
  it("accepts valid 6-character alphanumeric codes", () => {
    expect(isValidRoomCode("ABC123")).toBe(true);
    expect(isValidRoomCode("xyz789")).toBe(true);
    expect(isValidRoomCode("a1B2c3")).toBe(true);
  });

  it("accepts URL-safe characters (underscore, hyphen)", () => {
    expect(isValidRoomCode("AB_-12")).toBe(true);
    expect(isValidRoomCode("------")).toBe(true);
    expect(isValidRoomCode("______")).toBe(true);
  });

  it("rejects codes with wrong length", () => {
    expect(isValidRoomCode("ABC12")).toBe(false); // too short
    expect(isValidRoomCode("ABC1234")).toBe(false); // too long
    expect(isValidRoomCode("")).toBe(false); // empty
  });

  it("rejects codes with invalid characters", () => {
    expect(isValidRoomCode("ABC 12")).toBe(false); // space
    expect(isValidRoomCode("ABC!12")).toBe(false); // special char
    expect(isValidRoomCode("ABC@12")).toBe(false); // special char
  });
});

describe("isValidParticipantName", () => {
  it("accepts valid names", () => {
    expect(isValidParticipantName("Alice")).toBe(true);
    expect(isValidParticipantName("Bob Smith")).toBe(true);
    expect(isValidParticipantName("X")).toBe(true); // single char
  });

  it("trims whitespace", () => {
    expect(isValidParticipantName("  Alice  ")).toBe(true);
  });

  it("rejects empty or whitespace-only names", () => {
    expect(isValidParticipantName("")).toBe(false);
    expect(isValidParticipantName("   ")).toBe(false);
  });

  it("rejects names longer than 50 characters", () => {
    expect(isValidParticipantName("a".repeat(50))).toBe(true);
    expect(isValidParticipantName("a".repeat(51))).toBe(false);
  });
});

describe("isValidSessionName", () => {
  it("accepts valid session names", () => {
    expect(isValidSessionName("Sprint Planning")).toBe(true);
    expect(isValidSessionName("Q1 2024 Estimation")).toBe(true);
    expect(isValidSessionName("X")).toBe(true); // single char
  });

  it("trims whitespace", () => {
    expect(isValidSessionName("  Sprint Planning  ")).toBe(true);
  });

  it("rejects empty or whitespace-only names", () => {
    expect(isValidSessionName("")).toBe(false);
    expect(isValidSessionName("   ")).toBe(false);
  });

  it("rejects names longer than 100 characters", () => {
    expect(isValidSessionName("a".repeat(100))).toBe(true);
    expect(isValidSessionName("a".repeat(101))).toBe(false);
  });
});

describe("isValidTopic", () => {
  it("accepts valid topics", () => {
    expect(isValidTopic("User authentication")).toBe(true);
    expect(isValidTopic("")).toBe(true); // empty is valid
  });

  it("accepts topics up to 200 characters", () => {
    expect(isValidTopic("a".repeat(200))).toBe(true);
  });

  it("rejects topics longer than 200 characters", () => {
    expect(isValidTopic("a".repeat(201))).toBe(false);
  });
});

describe("isNumericCard", () => {
  it("identifies numeric card values", () => {
    expect(isNumericCard("0")).toBe(true);
    expect(isNumericCard("1")).toBe(true);
    expect(isNumericCard("2")).toBe(true);
    expect(isNumericCard("3")).toBe(true);
    expect(isNumericCard("5")).toBe(true);
    expect(isNumericCard("8")).toBe(true);
    expect(isNumericCard("13")).toBe(true);
    expect(isNumericCard("21")).toBe(true);
  });

  it("identifies non-numeric card values", () => {
    expect(isNumericCard("?")).toBe(false);
    expect(isNumericCard("coffee")).toBe(false);
  });
});
