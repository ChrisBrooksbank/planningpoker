import type {
  Session,
  Participant,
  Vote,
  SessionState,
  VoteStatistics,
} from "../lib/types";
import { generateRoomCode } from "../lib/utils";

/**
 * In-memory session storage for Planning Poker sessions
 * This is the single source of truth for all session state
 */
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
    moderatorName: string
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
    };

    const moderator: Participant = {
      id: moderatorId,
      name: moderatorName,
      isModerator: true,
      isConnected: true,
    };

    const sessionState: SessionState = {
      session,
      participants: [moderator],
      votes: new Map(),
      statistics: null,
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
  ): Participant[] | null {
    const sessionState = this.sessions.get(roomId);
    if (!sessionState) {
      return null;
    }

    // Check if participant already exists
    const existingParticipant = sessionState.participants.find(
      (p) => p.id === userId
    );

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
    return true;
  }

  /**
   * Submit or update a vote
   * @param roomId - The room ID
   * @param userId - The user ID
   * @param value - The vote value
   * @returns True if successful, false if session not found
   */
  submitVote(roomId: string, userId: string, value: string): boolean {
    const sessionState = this.sessions.get(roomId);
    if (!sessionState) {
      return false;
    }

    const vote: Vote = {
      userId,
      value: value as Vote["value"],
      submittedAt: Date.now(),
    };

    sessionState.votes.set(userId, vote);
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

    // Calculate statistics
    const votes = Array.from(sessionState.votes.values());
    const numericVotes = votes
      .filter((v) => !["?", "coffee"].includes(v.value))
      .map((v) => Number(v.value));

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
    let mode: Vote["value"] | null = null;
    if (votes.length > 0) {
      const counts = new Map<string, number>();
      votes.forEach((v) => {
        counts.set(v.value, (counts.get(v.value) || 0) + 1);
      });

      let maxCount = 0;
      counts.forEach((count, value) => {
        if (count > maxCount) {
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

    sessionState.votes.clear();
    sessionState.session.isRevealed = false;
    sessionState.statistics = null;

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

// Singleton instance
export const sessionStorage = new SessionStorage();
