// WebSocket message types for Planning Poker real-time sync

import {
  CardValue,
  DeckType,
  Participant,
  RoundHistoryEntry,
  Vote,
  VoteStatistics,
} from "./types.js";

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
  newTopic?: string;
}

/**
 * Client toggles their observer status
 */
export interface ToggleObserverMessage extends BaseMessage {
  type: "toggle-observer";
}

/**
 * Moderator promotes another participant to moderator
 */
export interface PromoteToModeratorMessage extends BaseMessage {
  type: "promote-to-moderator";
  targetParticipantId: string;
}

/**
 * Moderator demotes themselves (step down)
 */
export interface DemoteSelfMessage extends BaseMessage {
  type: "demote-self";
}

/**
 * Participant claims moderator when all moderators are disconnected
 */
export interface ClaimModeratorMessage extends BaseMessage {
  type: "claim-moderator";
}

// Union type of all client->server messages
export type ClientMessage =
  | JoinSessionMessage
  | SubmitVoteMessage
  | SetTopicMessage
  | RevealVotesMessage
  | NewRoundMessage
  | ToggleObserverMessage
  | PromoteToModeratorMessage
  | DemoteSelfMessage
  | ClaimModeratorMessage;

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
  isVotingOpen: boolean;
  deckType: DeckType;
  participants: Participant[];
  votes: Record<string, { hasVoted: boolean; value?: CardValue }>; // value only if revealed
  statistics?: VoteStatistics; // only if revealed
  roundHistory: RoundHistoryEntry[];
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
  roundHistory: RoundHistoryEntry[];
}

/**
 * A participant toggled their observer status
 */
export interface ObserverToggledMessage extends BaseMessage {
  type: "observer-toggled";
  userId: string;
  isObserver: boolean;
}

/**
 * A participant was auto-removed from the session (e.g., after prolonged disconnect)
 */
export interface ParticipantRemovedMessage extends BaseMessage {
  type: "participant-removed";
  userId: string;
}

/**
 * A participant's moderator status changed
 */
export interface ModeratorChangedMessage extends BaseMessage {
  type: "moderator-changed";
  userId: string;
  isModerator: boolean;
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
  | ParticipantRemovedMessage
  | VoteSubmittedMessage
  | TopicChangedMessage
  | VotesRevealedMessage
  | RoundStartedMessage
  | ObserverToggledMessage
  | ModeratorChangedMessage
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
    "toggle-observer",
    "promote-to-moderator",
    "demote-self",
    "claim-moderator",
  ].includes(message.type);
}
