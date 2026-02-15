import { describe, it, expect, beforeEach } from "vitest";
import { SessionStorage } from "../../server/sessionStorage";

describe("SessionStorage", () => {
  let storage: SessionStorage;

  beforeEach(() => {
    storage = new SessionStorage();
  });

  describe("createSession", () => {
    it("should create a new session with unique ID", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");

      expect(state.session.id).toBeDefined();
      expect(state.session.id).toHaveLength(6);
      expect(state.session.name).toBe("Team Standup");
      expect(state.session.moderatorId).toBe("user1");
      expect(state.session.isRevealed).toBe(false);
      expect(state.session.isVotingOpen).toBe(false);
      expect(state.session.currentTopic).toBeUndefined();
    });

    it("should add moderator as first participant", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");

      expect(state.participants).toHaveLength(1);
      expect(state.participants[0]).toEqual({
        id: "user1",
        name: "Alice",
        isModerator: true,
        isConnected: true,
      });
    });

    it("should initialize with empty votes and no statistics", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");

      expect(state.votes.size).toBe(0);
      expect(state.statistics).toBeNull();
    });

    it("should generate unique room IDs for different sessions", () => {
      const state1 = storage.createSession("Session 1", "user1", "Alice");
      const state2 = storage.createSession("Session 2", "user2", "Bob");

      expect(state1.session.id).not.toBe(state2.session.id);
    });
  });

  describe("getSession", () => {
    it("should retrieve an existing session", () => {
      const created = storage.createSession("Team Standup", "user1", "Alice");
      const retrieved = storage.getSession(created.session.id);

      expect(retrieved).toBe(created);
    });

    it("should return undefined for non-existent session", () => {
      const result = storage.getSession("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("sessionExists", () => {
    it("should return true for existing session", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");

      expect(storage.sessionExists(state.session.id)).toBe(true);
    });

    it("should return false for non-existent session", () => {
      expect(storage.sessionExists("nonexistent")).toBe(false);
    });
  });

  describe("addParticipant", () => {
    it("should add a new participant to session", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");
      const participants = storage.addParticipant(
        state.session.id,
        "user2",
        "Bob"
      );

      expect(participants).toHaveLength(2);
      expect(participants?.[1]).toEqual({
        id: "user2",
        name: "Bob",
        isModerator: false,
        isConnected: true,
      });
    });

    it("should reconnect existing participant", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");
      storage.addParticipant(state.session.id, "user2", "Bob");

      // Mark as disconnected
      storage.markParticipantDisconnected(state.session.id, "user2");

      // Reconnect
      const participants = storage.addParticipant(
        state.session.id,
        "user2",
        "Bob Updated"
      );

      expect(participants).toHaveLength(2);
      expect(participants?.[1].isConnected).toBe(true);
      expect(participants?.[1].name).toBe("Bob Updated");
    });

    it("should return null for non-existent session", () => {
      const result = storage.addParticipant("nonexistent", "user2", "Bob");

      expect(result).toBeNull();
    });

    it("should reject new participants when session is at capacity (50)", () => {
      const state = storage.createSession("Full Session", "mod", "Moderator");
      // Moderator is participant #1, add 49 more to reach 50
      for (let i = 1; i < 50; i++) {
        storage.addParticipant(state.session.id, `user${i}`, `User ${i}`);
      }

      expect(state.participants).toHaveLength(50);

      const result = storage.addParticipant(state.session.id, "user50", "User 50");
      expect(result).toBe("SESSION_FULL");
      expect(state.participants).toHaveLength(50);
    });

    it("should allow reconnecting participant even when session is at capacity", () => {
      const state = storage.createSession("Full Session", "mod", "Moderator");
      for (let i = 1; i < 50; i++) {
        storage.addParticipant(state.session.id, `user${i}`, `User ${i}`);
      }
      storage.markParticipantDisconnected(state.session.id, "user1");

      // Reconnecting existing participant should succeed even at capacity
      const result = storage.addParticipant(state.session.id, "user1", "User 1");
      expect(result).not.toBeNull();
      expect(result).not.toBe("SESSION_FULL");
      expect(state.participants).toHaveLength(50);
    });
  });

  describe("markParticipantDisconnected", () => {
    it("should mark participant as disconnected", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");
      storage.addParticipant(state.session.id, "user2", "Bob");

      const participants = storage.markParticipantDisconnected(
        state.session.id,
        "user2"
      );

      expect(participants?.[1].isConnected).toBe(false);
    });

    it("should return null for non-existent session", () => {
      const result = storage.markParticipantDisconnected(
        "nonexistent",
        "user2"
      );

      expect(result).toBeNull();
    });

    it("should handle non-existent participant gracefully", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");

      const participants = storage.markParticipantDisconnected(
        state.session.id,
        "nonexistent"
      );

      expect(participants).toHaveLength(1);
    });
  });

  describe("removeParticipant", () => {
    it("should remove participant from session", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");
      storage.addParticipant(state.session.id, "user2", "Bob");

      const participants = storage.removeParticipant(state.session.id, "user2");

      expect(participants).toHaveLength(1);
      expect(participants?.[0].id).toBe("user1");
    });

    it("should remove participant's vote when removing participant", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");
      storage.addParticipant(state.session.id, "user2", "Bob");
      storage.submitVote(state.session.id, "user2", "5");

      storage.removeParticipant(state.session.id, "user2");

      const votes = storage.getVotes(state.session.id);
      expect(votes?.has("user2")).toBe(false);
    });

    it("should return null for non-existent session", () => {
      const result = storage.removeParticipant("nonexistent", "user2");

      expect(result).toBeNull();
    });
  });

  describe("getParticipants", () => {
    it("should return participant list for session", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");
      storage.addParticipant(state.session.id, "user2", "Bob");

      const participants = storage.getParticipants(state.session.id);

      expect(participants).toHaveLength(2);
    });

    it("should return null for non-existent session", () => {
      const result = storage.getParticipants("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("setTopic", () => {
    it("should set topic for session", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");

      const success = storage.setTopic(
        state.session.id,
        "Estimate login feature"
      );

      expect(success).toBe(true);
      expect(state.session.currentTopic).toBe("Estimate login feature");
    });

    it("should return false for non-existent session", () => {
      const result = storage.setTopic("nonexistent", "Some topic");

      expect(result).toBe(false);
    });
  });

  describe("submitVote", () => {
    it("should submit a vote for a participant", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");

      const success = storage.submitVote(state.session.id, "user1", "5");

      expect(success).toBe(true);
      expect(state.votes.get("user1")?.value).toBe("5");
    });

    it("should update existing vote", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");
      storage.submitVote(state.session.id, "user1", "5");

      storage.submitVote(state.session.id, "user1", "8");

      expect(state.votes.get("user1")?.value).toBe("8");
    });

    it("should return false for non-existent session", () => {
      const result = storage.submitVote("nonexistent", "user1", "5");

      expect(result).toBe(false);
    });
  });

  describe("getVotes", () => {
    it("should return votes for session", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");
      storage.submitVote(state.session.id, "user1", "5");

      const votes = storage.getVotes(state.session.id);

      expect(votes?.size).toBe(1);
      expect(votes?.get("user1")?.value).toBe("5");
    });

    it("should return null for non-existent session", () => {
      const result = storage.getVotes("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("revealVotes", () => {
    it("should reveal votes and calculate statistics", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");
      storage.addParticipant(state.session.id, "user2", "Bob");
      storage.addParticipant(state.session.id, "user3", "Charlie");

      storage.submitVote(state.session.id, "user1", "5");
      storage.submitVote(state.session.id, "user2", "8");
      storage.submitVote(state.session.id, "user3", "5");

      const stats = storage.revealVotes(state.session.id);

      expect(state.session.isRevealed).toBe(true);
      expect(state.session.isVotingOpen).toBe(false);
      expect(stats?.average).toBe(6);
      expect(stats?.mode).toBe("5");
      expect(stats?.min).toBe(5);
      expect(stats?.max).toBe(8);
      expect(stats?.range).toBe(3);
    });

    it("should exclude non-numeric votes from average", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");
      storage.addParticipant(state.session.id, "user2", "Bob");
      storage.addParticipant(state.session.id, "user3", "Charlie");

      storage.submitVote(state.session.id, "user1", "5");
      storage.submitVote(state.session.id, "user2", "?");
      storage.submitVote(state.session.id, "user3", "coffee");

      const stats = storage.revealVotes(state.session.id);

      expect(stats?.average).toBe(5);
      expect(stats?.min).toBe(5);
      expect(stats?.max).toBe(5);
      expect(stats?.range).toBe(0);
    });

    it("should handle all non-numeric votes", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");
      storage.addParticipant(state.session.id, "user2", "Bob");

      storage.submitVote(state.session.id, "user1", "?");
      storage.submitVote(state.session.id, "user2", "coffee");

      const stats = storage.revealVotes(state.session.id);

      expect(stats?.average).toBeNull();
      expect(stats?.min).toBeNull();
      expect(stats?.max).toBeNull();
      expect(stats?.range).toBeNull();
      expect(stats?.mode).toBeDefined(); // Should still have mode
    });

    it("should handle no votes", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");

      const stats = storage.revealVotes(state.session.id);

      expect(stats?.average).toBeNull();
      expect(stats?.mode).toBeNull();
      expect(stats?.min).toBeNull();
      expect(stats?.max).toBeNull();
      expect(stats?.range).toBeNull();
    });

    it("should return null for non-existent session", () => {
      const result = storage.revealVotes("nonexistent");

      expect(result).toBeNull();
    });

    it("should break mode tie between numeric values by picking the lower one", () => {
      const state = storage.createSession("Tie Test", "user1", "Alice");
      storage.addParticipant(state.session.id, "user2", "Bob");

      storage.submitVote(state.session.id, "user1", "8");
      storage.submitVote(state.session.id, "user2", "5");

      const stats = storage.revealVotes(state.session.id);

      expect(stats?.mode).toBe("5");
    });

    it("should break mode tie between numeric and non-numeric by picking the numeric one", () => {
      const state = storage.createSession("Tie Test", "user1", "Alice");
      storage.addParticipant(state.session.id, "user2", "Bob");

      storage.submitVote(state.session.id, "user1", "?");
      storage.submitVote(state.session.id, "user2", "5");

      const stats = storage.revealVotes(state.session.id);

      expect(stats?.mode).toBe("5");
    });
  });

  describe("startNewRound", () => {
    it("should clear votes and reset reveal state", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");
      storage.submitVote(state.session.id, "user1", "5");
      storage.revealVotes(state.session.id);

      const success = storage.startNewRound(state.session.id);

      expect(success).toBe(true);
      expect(state.votes.size).toBe(0);
      expect(state.session.isRevealed).toBe(false);
      expect(state.session.isVotingOpen).toBe(true);
      expect(state.statistics).toBeNull();
    });

    it("should return false for non-existent session", () => {
      const result = storage.startNewRound("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("deleteSession", () => {
    it("should delete an existing session", () => {
      const state = storage.createSession("Team Standup", "user1", "Alice");

      const success = storage.deleteSession(state.session.id);

      expect(success).toBe(true);
      expect(storage.sessionExists(state.session.id)).toBe(false);
    });

    it("should return false for non-existent session", () => {
      const result = storage.deleteSession("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("getAllSessionIds", () => {
    it("should return all active session IDs", () => {
      const state1 = storage.createSession("Session 1", "user1", "Alice");
      const state2 = storage.createSession("Session 2", "user2", "Bob");

      const ids = storage.getAllSessionIds();

      expect(ids).toHaveLength(2);
      expect(ids).toContain(state1.session.id);
      expect(ids).toContain(state2.session.id);
    });

    it("should return empty array when no sessions exist", () => {
      const ids = storage.getAllSessionIds();

      expect(ids).toEqual([]);
    });
  });

  describe("getSessionCount", () => {
    it("should return the number of active sessions", () => {
      expect(storage.getSessionCount()).toBe(0);

      storage.createSession("Session 1", "user1", "Alice");
      expect(storage.getSessionCount()).toBe(1);

      storage.createSession("Session 2", "user2", "Bob");
      expect(storage.getSessionCount()).toBe(2);
    });
  });
});
