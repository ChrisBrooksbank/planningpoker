import { describe, it, expect } from "vitest";
import { generateRoomCode, isValidRoomCode } from "../../lib/utils";

describe("generateRoomCode", () => {
  it("should generate a 6-character code", () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
  });

  it("should generate URL-safe characters only", () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("should generate unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateRoomCode());
    }
    // All codes should be unique
    expect(codes.size).toBe(100);
  });

  it("should avoid collisions with existing codes", () => {
    const existing = new Set(["ABC123", "XYZ789", "DEF456"]);
    const code = generateRoomCode(existing);

    expect(code).toHaveLength(6);
    expect(existing.has(code)).toBe(false);
  });

  it("should retry on collision and succeed", () => {
    // Create a small existing set to increase collision chance
    const existing = new Set<string>();
    for (let i = 0; i < 10; i++) {
      existing.add(generateRoomCode());
    }

    // Should still generate a unique code
    const code = generateRoomCode(existing);
    expect(code).toHaveLength(6);
    expect(existing.has(code)).toBe(false);
  });

  it("should throw error after max attempts with collision", () => {
    // Mock nanoid to always return the same value to force collision
    const originalNanoid = generateRoomCode;

    // Create a Set that claims to have every possible code
    const infiniteSet = {
      has: () => true, // Always returns true, simulating all codes taken
    } as unknown as Set<string>;

    // This should throw because all codes appear to be taken
    expect(() => {
      generateRoomCode(infiniteSet, 3);
    }).toThrow("Failed to generate unique room code after maximum attempts");
  });

  it("should validate custom maxAttempts parameter", () => {
    const code = generateRoomCode(new Set(), 5);
    expect(code).toHaveLength(6);
  });
});

describe("isValidRoomCode", () => {
  it("should accept valid 6-character codes", () => {
    expect(isValidRoomCode("ABC123")).toBe(true);
    expect(isValidRoomCode("XYZ789")).toBe(true);
    expect(isValidRoomCode("a1b2c3")).toBe(true);
    expect(isValidRoomCode("------")).toBe(true);
    expect(isValidRoomCode("______")).toBe(true);
    expect(isValidRoomCode("A-B_C1")).toBe(true);
  });

  it("should reject codes that are too short", () => {
    expect(isValidRoomCode("ABC12")).toBe(false);
    expect(isValidRoomCode("A")).toBe(false);
    expect(isValidRoomCode("")).toBe(false);
  });

  it("should reject codes that are too long", () => {
    expect(isValidRoomCode("ABC1234")).toBe(false);
    expect(isValidRoomCode("ABCDEFGHIJ")).toBe(false);
  });

  it("should reject codes with invalid characters", () => {
    expect(isValidRoomCode("ABC 12")).toBe(false); // space
    expect(isValidRoomCode("ABC!12")).toBe(false); // special char
    expect(isValidRoomCode("ABC@12")).toBe(false); // special char
    expect(isValidRoomCode("ABC.12")).toBe(false); // period
    expect(isValidRoomCode("ABC/12")).toBe(false); // slash
  });

  it("should validate all generated codes", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      expect(isValidRoomCode(code)).toBe(true);
    }
  });
});
