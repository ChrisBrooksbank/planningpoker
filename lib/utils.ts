import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { customAlphabet } from "nanoid";

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx and tailwind-merge for optimal class handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates a room code format
 */
export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

/**
 * Validates participant name
 */
export function isValidParticipantName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 50;
}

/**
 * Validates session name
 */
export function isValidSessionName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 100;
}

/**
 * Validates topic string
 */
export function isValidTopic(topic: string): boolean {
  return topic.length <= 200;
}

/**
 * Checks if a card value is numeric
 */
export function isNumericCard(value: string): boolean {
  return !isNaN(Number(value));
}

/**
 * Generates a unique URL-safe room code
 * @param existingCodes - Set of existing codes to check against
 * @param maxAttempts - Maximum number of collision retry attempts
 * @returns A unique 6-character room code
 * @throws Error if unable to generate unique code after maxAttempts
 */
const generateId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

export function generateRoomCode(
  existingCodes: Set<string> = new Set(),
  maxAttempts: number = 10
): string {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateId();
    if (!existingCodes.has(code)) {
      return code;
    }
  }
  throw new Error("Failed to generate unique room code after maximum attempts");
}
