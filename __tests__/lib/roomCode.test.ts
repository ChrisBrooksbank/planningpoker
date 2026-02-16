import { describe, it, expect } from "vitest";
import { generateRoomCode } from "../../lib/utils";

describe("generateRoomCode", () => {
  it("should generate a 6-character code", () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
  });

  it("should generate uppercase alphanumeric characters only", () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z0-9]+$/);
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

