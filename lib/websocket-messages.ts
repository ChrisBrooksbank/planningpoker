// WebSocket message types for Planning Poker real-time sync

import { CardValue, Participant, Vote, VoteStatistics } from "./types.js";

// Base message interface - all messages must have a type field
export interface BaseMessage {
  type: string;
}

// ============================================================================
// Client -> Server Messages
// ============================================================================

/**
 * Client requests to join the session
 * Sent after WebSocket connection is established
 */
export interface JoinSessionMessage extends BaseMessage {
  type: "join-session";
  participantName: string;
}

/**
 * Client submits or updates their vote
 */
export interface SubmitVoteMessage extends BaseMessage {
  type: "submit-vote";
  value: CardValue;
}

/**
 * Moderator sets or updates the current topic
 */
export interface SetTopicMessage extends BaseMessage {
  type: "set-topic";
  topic: string;
}

/**
 * Moderator reveals all votes
 */
export interface RevealVotesMessage extends BaseMessage {
  type: "reveal-votes";
}

/**
 * Moderator starts a new round (clears votes)
 */
export interface NewRoundMessage extends BaseMessage {
  type: "new-round";
}

// Union type of all client->server messages
export type ClientMessage =
  | JoinSessionMessage
  | SubmitVoteMessage
  | SetTopicMessage
  | RevealVotesMessage
  | NewRoundMessage;

// ============================================================================
// Server -> Client Messages
// ============================================================================

/**
 * Server acknowledges successful connection
 * Sent immediately after WebSocket connection
 */
export interface ConnectedMessage extends BaseMessage {
  type: "connected";
  userId: string;
  roomId: string;
}

/**
 * Server sends current session state
 * Sent on join or reconnection to sync client
 */
export interface SessionStateMessage extends BaseMessage {
  type: "session-state";
  sessionId: string;
  sessionName: string;
  moderatorId: string;
  currentTopic?: string;
  isRevealed: boolean;
  participants: Participant[];
  votes: Record<string, { hasVoted: boolean; value?: CardValue }>; // value only if revealed
  statistics?: VoteStatistics; // only if revealed
}

/**
 * A participant joined the session
 */
export interface ParticipantJoinedMessage extends BaseMessage {
  type: "participant-joined";
  participant: Participant;
}

/**
 * A participant left the session
 */
export interface ParticipantLeftMessage extends BaseMessage {
  type: "participant-left";
  userId: string;
}

/**
 * A participant submitted or updated their vote
 * Does NOT include the vote value before reveal
 */
export interface VoteSubmittedMessage extends BaseMessage {
  type: "vote-submitted";
  userId: string;
  hasVoted: boolean;
}

/**
 * The current topic was changed
 */
export interface TopicChangedMessage extends BaseMessage {
  type: "topic-changed";
  topic: string;
}

/**
 * All votes were revealed
 * Includes all vote values and statistics
 */
export interface VotesRevealedMessage extends BaseMessage {
  type: "votes-revealed";
  votes: Record<string, Vote>;
  statistics: VoteStatistics;
}

/**
 * A new round was started (votes cleared)
 */
export interface RoundStartedMessage extends BaseMessage {
  type: "round-started";
}

/**
 * Error message from server
 */
export interface ErrorMessage extends BaseMessage {
  type: "error";
  code: string;
  message: string;
}

// Union type of all server->client messages
export type ServerMessage =
  | ConnectedMessage
  | SessionStateMessage
  | ParticipantJoinedMessage
  | ParticipantLeftMessage
  | VoteSubmittedMessage
  | TopicChangedMessage
  | VotesRevealedMessage
  | RoundStartedMessage
  | ErrorMessage;

// Union type of all messages
export type WebSocketMessage = ClientMessage | ServerMessage;

// ============================================================================
// Type Guards
// ============================================================================

export function isClientMessage(
  message: BaseMessage
): message is ClientMessage {
  return [
    "join-session",
    "submit-vote",
    "set-topic",
    "reveal-votes",
    "new-round",
  ].includes(message.type);
}

export function isServerMessage(
  message: BaseMessage
): message is ServerMessage {
  return [
    "connected",
    "session-state",
    "participant-joined",
    "participant-left",
    "vote-submitted",
    "topic-changed",
    "votes-revealed",
    "round-started",
    "error",
  ].includes(message.type);
}
