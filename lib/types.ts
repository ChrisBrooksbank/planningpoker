// Shared types for Planning Poker application

// Deck Types
export type DeckType = "fibonacci" | "tshirt";

export const FIBONACCI_VALUES = [
  "0",
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "21",
  "?",
  "coffee",
] as const;

export const TSHIRT_VALUES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "?",
  "coffee",
] as const;

export function getDeckValues(deckType: DeckType): readonly string[] {
  return deckType === "tshirt" ? TSHIRT_VALUES : FIBONACCI_VALUES;
}

// Session Types
export interface Session {
  id: string;
  name: string;
  createdAt: number;
  moderatorId: string;
  currentTopic?: string;
  isRevealed: boolean;
  isVotingOpen: boolean;
  deckType: DeckType;
}

// User/Participant Types
export interface Participant {
  id: string;
  name: string;
  isModerator: boolean;
  isConnected: boolean;
  isObserver: boolean;
}

// Vote Types
export const CARD_VALUES = FIBONACCI_VALUES;

export type CardValue = (typeof FIBONACCI_VALUES)[number] | (typeof TSHIRT_VALUES)[number];

export interface Vote {
  userId: string;
  value: CardValue;
  submittedAt: number;
}

// Statistics Types
export interface VoteStatistics {
  average: number | null; // null if no numeric votes
  mode: CardValue | null; // most common vote
  min: number | null;
  max: number | null;
  range: number | null; // max - min
}

// Round History
export interface RoundHistoryEntry {
  topic: string;
  votes: Record<string, { participantName: string; value: CardValue }>;
  statistics: VoteStatistics;
  completedAt: number;
}

// Session State (complete state of a poker session)
export interface SessionState {
  session: Session;
  participants: Participant[];
  votes: Map<string, Vote>; // userId -> Vote
  statistics: VoteStatistics | null; // null until revealed
  roundHistory: RoundHistoryEntry[];
  lastActivity: number; // timestamp of last message/join activity
}
