import type {
  Session,
  Participant,
  Vote,
  SessionState,
  VoteStatistics,
  CardValue,
  DeckType,
} from "../lib/types.js";
import { getDeckValues } from "../lib/types.js";
import { generateRoomCode } from "../lib/utils.js";

/**
 * Compare two vote values for deterministic tie-breaking.
 * Numeric values sort before non-numeric; among numerics, lower wins;
 * among non-numerics, alphabetical order.
 */
function compareVoteValues(a: string, b: string): number {
  const aNum = Number(a);
  const bNum = Number(b);
  const aIsNumeric = !isNaN(aNum);
  const bIsNumeric = !isNaN(bNum);

  if (aIsNumeric && bIsNumeric) return aNum - bNum;
  if (aIsNumeric) return -1;
  if (bIsNumeric) return 1;
  return a.localeCompare(b);
}

/**
 * In-memory session storage for Planning Poker sessions
 * This is the single source of truth for all session state
 */
const MAX_PARTICIPANTS_PER_SESSION = 50;

export class SessionStorage {
  private sessions: Map<string, SessionState> = new Map();

  /**
   * Create a new session with a unique room code
   * @param sessionName - Name of the session
   * @param moderatorId - ID of the moderator (session creator)
   * @param moderatorName - Name of the moderator
   * @returns The created session state
   */
  createSession(
    sessionName: string,
    moderatorId: string,
    moderatorName: string,
    deckType: DeckType = "fibonacci"
  ): SessionState {
    // Generate unique 6-character URL-safe room code with collision checking
    const existingCodes = new Set(this.sessions.keys());
    const roomId = generateRoomCode(existingCodes);

    const session: Session = {
      id: roomId,
      name: sessionName,
      createdAt: Date.now(),
      moderatorId,
      currentTopic: undefined,
      isRevealed: false,
      isVotingOpen: false,
      deckType,
    };

    const moderator: Participant = {
      id: moderatorId,
      name: moderatorName,
      isModerator: true,
      isConnected: true,
      isObserver: false,
    };

    const sessionState: SessionState = {
      session,
      participants: [moderator],
      votes: new Map(),
      statistics: null,
      roundHistory: [],
      lastActivity: Date.now(),
    };

    this.sessions.set(roomId, sessionState);
    return sessionState;
  }

  /**
   * Get a session by room ID
   * @param roomId - The room ID to look up
   * @returns Session state or undefined if not found
   */
  getSession(roomId: string): SessionState | undefined {
    return this.sessions.get(roomId);
  }

  /**
   * Check if a session exists
   * @param roomId - The room ID to check
   * @returns True if session exists
   */
  sessionExists(roomId: string): boolean {
    return this.sessions.has(roomId);
  }

  /**
   * Add a participant to a session
   * @param roomId - The room ID
   * @param userId - The participant's user ID
   * @param userName - The participant's name
   * @returns The updated participant list or null if session not found
   */
  addParticipant(
    roomId: string,
    userId: string,
    userName: string
  ): Participant[] | null | "SESSION_FULL" {
    const sessionState = this.sessions.get(roomId);
    if (!sessionState) {
      return null;
    }

    // Check if participant already exists
    const existingParticipant = sessionState.participants.find(
      (p) => p.id === userId
    );

    // Reject new participants if session is at capacity
    if (!existingParticipant && sessionState.participants.length >= MAX_PARTICIPANTS_PER_SESSION) {
      return "SESSION_FULL" as const;
    }

    sessionState.lastActivity = Date.now();

    if (existingParticipant) {
      // Update existing participant to connected
      existingParticipant.isConnected = true;
      existingParticipant.name = userName; // Update name in case it changed
    } else {
      // Add new participant
      const participant: Participant = {
        id: userId,
        name: userName,
        isModerator: false,
        isConnected: true,
        isObserver: false,
      };
      sessionState.participants.push(participant);
    }

    return sessionState.participants;
  }

  /**
   * Mark a participant as disconnected
   * @param roomId - The room ID
   * @param userId - The participant's user ID
   * @returns The updated participant list or null if session not found
   */
  markParticipantDisconnected(
    roomId: string,
    userId: string
  ): Participant[] | null {
    const sessionState = this.sessions.get(roomId);
    if (!sessionState) {
      return null;
    }

    const participant = sessionState.participants.find((p) => p.id === userId);
    if (participant) {
      participant.isConnected = false;
    }

    return sessionState.participants;
  }

  /**
   * Remove a participant from a session
   * @param roomId - The room ID
   * @param userId - The participant's user ID
   * @returns The updated participant list or null if session not found
   */
  removeParticipant(roomId: string, userId: string): Participant[] | null {
    const sessionState = this.sessions.get(roomId);
    if (!sessionState) {
      return null;
    }

    sessionState.participants = sessionState.participants.filter(
      (p) => p.id !== userId
    );

    // Also remove their vote if they had one
    sessionState.votes.delete(userId);

    return sessionState.participants;
  }

  /**
   * Toggle observer status for a participant
   * @param roomId - The room ID
   * @param userId - The participant's user ID
   * @returns The new isObserver value, or null if session/participant not found
   */
  toggleObserver(roomId: string, userId: string): boolean | null {
    const sessionState = this.sessions.get(roomId);
    if (!sessionState) {
      return null;
    }

    const participant = sessionState.participants.find((p) => p.id === userId);
    if (!participant) {
      return null;
    }

    participant.isObserver = !participant.isObserver;

    // If becoming observer, remove their vote
    if (participant.isObserver) {
      sessionState.votes.delete(userId);
    }

    return participant.isObserver;
  }

  /**
   * Get all participants in a session
   * @param roomId - The room ID
   * @returns Participant list or null if session not found
   */
  getParticipants(roomId: string): Participant[] | null {
    const sessionState = this.sessions.get(roomId);
    return sessionState ? sessionState.participants : null;
  }

  /**
   * Set the current topic for a session
   * @param roomId - The room ID
   * @param topic - The topic string
   * @returns True if successful, false if session not found
   */
  setTopic(roomId: string, topic: string): boolean {
    const sessionState = this.sessions.get(roomId);
    if (!sessionState) {
      return false;
    }

    sessionState.session.currentTopic = topic;
    sessionState.lastActivity = Date.now();
    return true;
  }

  /**
   * Submit or update a vote
   * @param roomId - The room ID
   * @param userId - The user ID
   * @param value - The vote value
   * @returns True if successful, false if session not found
   */
  submitVote(roomId: string, userId: string, value: string): boolean | "OBSERVER" {
    const sessionState = this.sessions.get(roomId);
    if (!sessionState) {
      return false;
    }

    // Check if participant is an observer
    const participant = sessionState.participants.find((p) => p.id === userId);
    if (participant?.isObserver) {
      return "OBSERVER";
    }

    const deckValues = getDeckValues(sessionState.session.deckType || "fibonacci");
    if (!deckValues.includes(value)) {
      return false;
    }

    const vote: Vote = {
      userId,
      value: value as Vote["value"],
      submittedAt: Date.now(),
    };

    sessionState.votes.set(userId, vote);
    sessionState.lastActivity = Date.now();
    return true;
  }

  /**
   * Get all votes for a session
   * @param roomId - The room ID
   * @returns Map of votes or null if session not found
   */
  getVotes(roomId: string): Map<string, Vote> | null {
    const sessionState = this.sessions.get(roomId);
    return sessionState ? sessionState.votes : null;
  }

  /**
   * Reveal votes and calculate statistics
   * @param roomId - The room ID
   * @returns Statistics or null if session not found
   */
  revealVotes(roomId: string): VoteStatistics | null {
    const sessionState = this.sessions.get(roomId);
    if (!sessionState) {
      return null;
    }

    sessionState.session.isRevealed = true;
    sessionState.session.isVotingOpen = false;
    sessionState.lastActivity = Date.now();

    // Calculate statistics
    const votes = Array.from(sessionState.votes.values());
    const numericVotes = votes
      .map((v) => Number(v.value))
      .filter((n) => !isNaN(n));

    let average: number | null = null;
    let min: number | null = null;
    let max: number | null = null;
    let range: number | null = null;

    if (numericVotes.length > 0) {
      average =
        numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length;
      min = Math.min(...numericVotes);
      max = Math.max(...numericVotes);
      range = max - min;
    }

    // Calculate mode (most common vote)
    // Ties are broken deterministically: numeric values first (lower wins), then non-numeric alphabetically
    let mode: Vote["value"] | null = null;
    if (votes.length > 0) {
      const counts = new Map<string, number>();
      votes.forEach((v) => {
        counts.set(v.value, (counts.get(v.value) || 0) + 1);
      });

      let maxCount = 0;
      counts.forEach((count, value) => {
        if (count > maxCount || (count === maxCount && mode !== null && compareVoteValues(value, mode) < 0)) {
          maxCount = count;
          mode = value as Vote["value"];
        }
      });
    }

    const statistics: VoteStatistics = {
      average,
      mode,
      min,
      max,
      range,
    };

    sessionState.statistics = statistics;
    return statistics;
  }

  /**
   * Start a new round (clear votes and hide results)
   * @param roomId - The room ID
   * @returns True if successful, false if session not found
   */
  startNewRound(roomId: string): boolean {
    const sessionState = this.sessions.get(roomId);
    if (!sessionState) {
      return false;
    }

    // Snapshot the completed round into history (if votes were revealed)
    if (sessionState.session.isRevealed && sessionState.votes.size > 0 && sessionState.statistics) {
      const historyVotes: Record<string, { participantName: string; value: CardValue }> = {};
      sessionState.votes.forEach((vote, oddsUserId) => {
        const participant = sessionState.participants.find((p) => p.id === oddsUserId);
        historyVotes[oddsUserId] = {
          participantName: participant?.name || "Unknown",
          value: vote.value,
        };
      });

      sessionState.roundHistory.push({
        topic: sessionState.session.currentTopic || "",
        votes: historyVotes,
        statistics: { ...sessionState.statistics },
        completedAt: Date.now(),
      });

      // Cap at 20 entries
      if (sessionState.roundHistory.length > 20) {
        sessionState.roundHistory = sessionState.roundHistory.slice(-20);
      }
    }

    sessionState.votes.clear();
    sessionState.session.isRevealed = false;
    sessionState.session.isVotingOpen = true;
    sessionState.statistics = null;
    sessionState.lastActivity = Date.now();

    return true;
  }

  /**
   * Delete a session (cleanup)
   * @param roomId - The room ID
   * @returns True if session was deleted, false if not found
   */
  deleteSession(roomId: string): boolean {
    return this.sessions.delete(roomId);
  }

  /**
   * Get all active session IDs
   * @returns Array of room IDs
   */
  getAllSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get the number of active sessions
   * @returns Session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }
}

// Use globalThis to share a single instance across Next.js API routes and the custom server,
// which run in separate module scopes due to webpack bundling.
const GLOBAL_KEY = "__planningPokerSessionStorage";
export const sessionStorage: SessionStorage =
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] as SessionStorage ??
  ((globalThis as Record<string, unknown>)[GLOBAL_KEY] = new SessionStorage());
