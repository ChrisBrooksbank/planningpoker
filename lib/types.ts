// Shared types for Planning Poker application

// Session Types
export interface Session {
  id: string;
  name: string;
  createdAt: number;
  moderatorId: string;
  currentTopic?: string;
  isRevealed: boolean;
}

// User/Participant Types
export interface Participant {
  id: string;
  name: string;
  isModerator: boolean;
  isConnected: boolean;
}

// Vote Types
export const CARD_VALUES = [
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

export type CardValue = (typeof CARD_VALUES)[number];

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

// Session State (complete state of a poker session)
export interface SessionState {
  session: Session;
  participants: Participant[];
  votes: Map<string, Vote>; // userId -> Vote
  statistics: VoteStatistics | null; // null until revealed
}
