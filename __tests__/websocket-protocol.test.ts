import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer, Server as HTTPServer } from "http";
import { WebSocket } from "ws";
import { PlanningPokerWebSocketServer } from "@/server/websocket";
import { sessionStorage } from "@/server/sessionStorage";
import type {
  ConnectedMessage,
  SessionStateMessage,
  ParticipantJoinedMessage,
  VoteSubmittedMessage,
  TopicChangedMessage,
  VotesRevealedMessage,
  RoundStartedMessage,
  ErrorMessage,
} from "@/lib/websocket-messages";

describe("WebSocket Message Protocol", () => {
  let httpServer: HTTPServer;
  let wsServer: PlanningPokerWebSocketServer;
  let port: number;
  let roomId: string;

  beforeEach(() => {
    // Create a test session
    const session = sessionStorage.createSession(
      "Test Session",
      "moderator-123",
      "Moderator"
    );
    roomId = session.session.id;

    // Start a round so isVotingOpen is true for most tests
    sessionStorage.startNewRound(roomId);

    return new Promise<void>((resolve) => {
      httpServer = createServer();
      httpServer.listen(0, () => {
        const address = httpServer.address();
        port =
          typeof address === "object" && address !== null ? address.port : 0;
        wsServer = new PlanningPokerWebSocketServer(httpServer);
        resolve();
      });
    });
  });

  afterEach(() => {
    // Clean up sessions
    sessionStorage.getAllSessionIds().forEach((id) => {
      sessionStorage.deleteSession(id);
    });

    return new Promise<void>((resolve) => {
      httpServer.close(() => {
        resolve();
      });
    });
  });

  describe("join-session message", () => {
    it("should handle join-session and broadcast participant-joined", () => {
      return new Promise<void>((resolve) => {
        const ws1 = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-1`
        );
        const ws2 = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-2`
        );

        let ws1Connected = false;
        let ws2Connected = false;

        const checkReady = () => {
          if (ws1Connected && ws2Connected) {
            // ws2 joins after both are connected
            ws2.send(
              JSON.stringify({
                type: "join-session",
                participantName: "User Two",
              })
            );
          }
        };

        ws1.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            ws1Connected = true;
            checkReady();
          } else if (message.type === "participant-joined") {
            const msg = message as ParticipantJoinedMessage;
            expect(msg.participant.id).toBe("user-2");
            expect(msg.participant.name).toBe("User Two");
            expect(msg.participant.isModerator).toBe(false);
            ws1.close();
            ws2.close();
            resolve();
          }
        });

        ws2.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            ws2Connected = true;
            checkReady();
          }
        });
      });
    });

    it("should send session-state to joining client", () => {
      return new Promise<void>((resolve) => {
        const ws = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-1`
        );

        let receivedState = false;

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "session-state" && !receivedState) {
            receivedState = true;
            const msg = message as SessionStateMessage;
            expect(msg.sessionId).toBe(roomId);
            expect(msg.sessionName).toBe("Test Session");
            expect(msg.moderatorId).toBe("moderator-123");
            expect(msg.participants).toBeInstanceOf(Array);
            ws.close();
            resolve();
          } else if (message.type === "connected") {
            ws.send(
              JSON.stringify({
                type: "join-session",
                participantName: "User One",
              })
            );
          }
        });
      });
    });

    it("should return error for non-existent session", () => {
      return new Promise<void>((resolve) => {
        const ws = new WebSocket(
          `ws://localhost:${port}/ws?roomId=invalid-room&userId=user-1`
        );

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            ws.send(
              JSON.stringify({
                type: "join-session",
                participantName: "User One",
              })
            );
          } else if (message.type === "error") {
            const msg = message as ErrorMessage;
            expect(msg.code).toBe("SESSION_NOT_FOUND");
            ws.close();
            resolve();
          }
        });
      });
    });
  });

  describe("submit-vote message", () => {
    it("should handle vote submission and broadcast vote-submitted", () => {
      return new Promise<void>((resolve) => {
        const ws1 = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-1`
        );
        const ws2 = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-2`
        );

        let joined = 0;

        const checkReady = () => {
          joined++;
          if (joined === 2) {
            ws1.send(JSON.stringify({ type: "submit-vote", value: "5" }));
          }
        };

        ws1.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            ws1.send(JSON.stringify({ type: "join-session", participantName: "User One" }));
          } else if (message.type === "session-state") {
            checkReady();
          }
        });

        ws2.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            ws2.send(JSON.stringify({ type: "join-session", participantName: "User Two" }));
          } else if (message.type === "session-state") {
            checkReady();
          } else if (message.type === "vote-submitted") {
            const msg = message as VoteSubmittedMessage;
            expect(msg.userId).toBe("user-1");
            expect(msg.hasVoted).toBe(true);
            // Value should NOT be included before reveal
            expect(msg).not.toHaveProperty("value");
            ws1.close();
            ws2.close();
            resolve();
          }
        });
      });
    });

    it("should allow updating a vote", () => {
      return new Promise<void>((resolve) => {
        const ws = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-1`
        );

        let voteCount = 0;
        let joined = false;

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            ws.send(JSON.stringify({ type: "join-session", participantName: "User One" }));
          } else if (message.type === "session-state" && !joined) {
            joined = true;
            ws.send(JSON.stringify({ type: "submit-vote", value: "3" }));
          } else if (message.type === "vote-submitted") {
            voteCount++;
            if (voteCount === 1) {
              // Submit second vote
              ws.send(JSON.stringify({ type: "submit-vote", value: "8" }));
            } else if (voteCount === 2) {
              // Verify the vote was updated
              const votes = sessionStorage.getVotes(roomId);
              expect(votes?.get("user-1")?.value).toBe("8");
              ws.close();
              resolve();
            }
          }
        });
      });
    });

    it("should reject vote when voting is not open", () => {
      // Create a fresh session without starting a round
      const freshSession = sessionStorage.createSession(
        "Fresh Session",
        "mod-1",
        "Mod"
      );
      const freshRoomId = freshSession.session.id;

      return new Promise<void>((resolve) => {
        const ws = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${freshRoomId}&userId=mod-1`
        );

        let joined = false;

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            ws.send(JSON.stringify({ type: "join-session", participantName: "Mod" }));
          } else if (message.type === "session-state" && !joined) {
            joined = true;
            // Try to vote before round starts
            ws.send(JSON.stringify({ type: "submit-vote", value: "5" }));
          } else if (message.type === "error") {
            const msg = message as ErrorMessage;
            expect(msg.code).toBe("VOTING_NOT_OPEN");
            ws.close();
            resolve();
          }
        });
      });
    });
  });

  describe("set-topic message", () => {
    it("should allow moderator to set topic", () => {
      return new Promise<void>((resolve) => {
        const ws1 = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=moderator-123`
        );
        const ws2 = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-1`
        );

        let connected = 0;

        const checkReady = () => {
          connected++;
          if (connected === 2) {
            ws1.send(
              JSON.stringify({
                type: "set-topic",
                topic: "User Authentication",
              })
            );
          }
        };

        ws1.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            checkReady();
          }
        });

        ws2.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            checkReady();
          } else if (message.type === "topic-changed") {
            const msg = message as TopicChangedMessage;
            expect(msg.topic).toBe("User Authentication");
            ws1.close();
            ws2.close();
            resolve();
          }
        });
      });
    });

    it("should reject set-topic from non-moderator", () => {
      return new Promise<void>((resolve) => {
        const ws = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-1`
        );

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            ws.send(
              JSON.stringify({ type: "set-topic", topic: "Unauthorized Topic" })
            );
          } else if (message.type === "error") {
            const msg = message as ErrorMessage;
            expect(msg.code).toBe("UNAUTHORIZED");
            expect(msg.message).toContain("moderator");
            ws.close();
            resolve();
          }
        });
      });
    });
  });

  describe("reveal-votes message", () => {
    it("should allow moderator to reveal votes with statistics", () => {
      return new Promise<void>((resolve) => {
        const ws1 = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=moderator-123`
        );
        const ws2 = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-1`
        );

        let connected = 0;

        const checkReady = () => {
          connected++;
          if (connected === 2) {
            // Submit votes before revealing
            sessionStorage.submitVote(roomId, "moderator-123", "5");
            sessionStorage.submitVote(roomId, "user-1", "8");
            ws1.send(JSON.stringify({ type: "reveal-votes" }));
          }
        };

        ws1.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            checkReady();
          }
        });

        ws2.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            checkReady();
          } else if (message.type === "votes-revealed") {
            const msg = message as VotesRevealedMessage;
            expect(msg.votes).toBeDefined();
            expect(msg.votes["moderator-123"].value).toBe("5");
            expect(msg.votes["user-1"].value).toBe("8");
            expect(msg.statistics).toBeDefined();
            expect(msg.statistics.average).toBe(6.5);
            expect(msg.statistics.min).toBe(5);
            expect(msg.statistics.max).toBe(8);
            ws1.close();
            ws2.close();
            resolve();
          }
        });
      });
    });

    it("should reject reveal-votes from non-moderator", () => {
      return new Promise<void>((resolve) => {
        const ws = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-1`
        );

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            ws.send(JSON.stringify({ type: "reveal-votes" }));
          } else if (message.type === "error") {
            const msg = message as ErrorMessage;
            expect(msg.code).toBe("UNAUTHORIZED");
            expect(msg.message).toContain("moderator");
            ws.close();
            resolve();
          }
        });
      });
    });
  });

  describe("new-round message", () => {
    it("should allow moderator to start new round", () => {
      return new Promise<void>((resolve) => {
        const ws1 = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=moderator-123`
        );
        const ws2 = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-1`
        );

        let connected = 0;

        const checkReady = () => {
          connected++;
          if (connected === 2) {
            // Submit and reveal votes first
            sessionStorage.submitVote(roomId, "moderator-123", "5");
            sessionStorage.submitVote(roomId, "user-1", "8");
            sessionStorage.revealVotes(roomId);
            ws1.send(JSON.stringify({ type: "new-round" }));
          }
        };

        ws1.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            checkReady();
          }
        });

        ws2.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            checkReady();
          } else if (message.type === "round-started") {
            const msg = message as RoundStartedMessage;
            expect(msg.type).toBe("round-started");
            // Verify votes were cleared
            const session = sessionStorage.getSession(roomId);
            expect(session?.votes.size).toBe(0);
            expect(session?.session.isRevealed).toBe(false);
            ws1.close();
            ws2.close();
            resolve();
          }
        });
      });
    });

    it("should reject new-round from non-moderator", () => {
      return new Promise<void>((resolve) => {
        const ws = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-1`
        );

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            ws.send(JSON.stringify({ type: "new-round" }));
          } else if (message.type === "error") {
            const msg = message as ErrorMessage;
            expect(msg.code).toBe("UNAUTHORIZED");
            expect(msg.message).toContain("moderator");
            ws.close();
            resolve();
          }
        });
      });
    });
  });

  describe("session-state sync", () => {
    it("should hide vote values when not revealed", () => {
      return new Promise<void>((resolve) => {
        // Submit a vote first
        sessionStorage.submitVote(roomId, "moderator-123", "8");

        const ws = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-1`
        );

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            ws.send(
              JSON.stringify({
                type: "join-session",
                participantName: "User One",
              })
            );
          } else if (message.type === "session-state") {
            const msg = message as SessionStateMessage;
            expect(msg.isRevealed).toBe(false);
            expect(msg.votes["moderator-123"]).toBeDefined();
            expect(msg.votes["moderator-123"].hasVoted).toBe(true);
            // Value should be undefined when not revealed
            expect(msg.votes["moderator-123"].value).toBeUndefined();
            ws.close();
            resolve();
          }
        });
      });
    });

    it("should include vote values and statistics when revealed", () => {
      return new Promise<void>((resolve) => {
        // Submit votes and reveal
        sessionStorage.submitVote(roomId, "moderator-123", "5");
        sessionStorage.revealVotes(roomId);

        const ws = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-1`
        );

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            ws.send(
              JSON.stringify({
                type: "join-session",
                participantName: "User One",
              })
            );
          } else if (message.type === "session-state") {
            const msg = message as SessionStateMessage;
            expect(msg.isRevealed).toBe(true);
            expect(msg.votes["moderator-123"].value).toBe("5");
            expect(msg.statistics).toBeDefined();
            expect(msg.statistics?.average).toBe(5);
            ws.close();
            resolve();
          }
        });
      });
    });
  });

  describe("error handling", () => {
    it("should send error for unknown message type", () => {
      return new Promise<void>((resolve) => {
        const ws = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-1`
        );

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            ws.send(JSON.stringify({ type: "unknown-type", data: "test" }));
          } else if (message.type === "error") {
            const msg = message as ErrorMessage;
            expect(msg.code).toBe("INVALID_MESSAGE");
            ws.close();
            resolve();
          }
        });
      });
    });

    it("should send error for malformed JSON", () => {
      return new Promise<void>((resolve) => {
        const ws = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${roomId}&userId=user-1`
        );

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            ws.send("not valid json{");
          } else if (message.type === "error") {
            const msg = message as ErrorMessage;
            expect(msg.code).toBe("PARSE_ERROR");
            ws.close();
            resolve();
          }
        });
      });
    });
  });
});
