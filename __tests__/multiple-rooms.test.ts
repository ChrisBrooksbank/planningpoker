import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer, Server as HTTPServer } from "http";
import { WebSocket } from "ws";
import { PlanningPokerWebSocketServer } from "@/server/websocket";
import { sessionStorage } from "@/server/sessionStorage";
import type {
  SessionStateMessage,
  VoteSubmittedMessage,
  TopicChangedMessage,
  VotesRevealedMessage,
  RoundStartedMessage,
} from "@/lib/websocket-messages";

/**
 * Tests for multiple simultaneous rooms operating independently.
 * This verifies the real-time-sync.md requirement:
 * "WebSocket server handles multiple rooms independently"
 */
describe("Multiple Simultaneous Rooms", () => {
  let httpServer: HTTPServer;
  let wsServer: PlanningPokerWebSocketServer;
  let port: number;
  let room1Id: string;
  let room2Id: string;

  beforeEach(() => {
    // Create two test sessions
    const session1 = sessionStorage.createSession(
      "Room 1 Session",
      "mod-room1",
      "Moderator 1"
    );
    const session2 = sessionStorage.createSession(
      "Room 2 Session",
      "mod-room2",
      "Moderator 2"
    );
    room1Id = session1.session.id;
    room2Id = session2.session.id;

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
    // Clean up all sessions
    sessionStorage.getAllSessionIds().forEach((id) => {
      sessionStorage.deleteSession(id);
    });

    return new Promise<void>((resolve) => {
      httpServer.close(() => {
        resolve();
      });
    });
  });

  it("should handle multiple rooms with independent participant lists", () => {
    return new Promise<void>((resolve) => {
      // Connect 2 users to room1 and 2 users to room2
      const room1User1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${room1Id}&userId=r1u1`
      );
      const room1User2 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${room1Id}&userId=r1u2`
      );
      const room2User1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${room2Id}&userId=r2u1`
      );
      const room2User2 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${room2Id}&userId=r2u2`
      );

      let connectedCount = 0;

      const checkAllConnected = () => {
        connectedCount++;
        if (connectedCount === 4) {
          // Verify room isolation
          const room1Users = wsServer.getRoomUsers(room1Id);
          const room2Users = wsServer.getRoomUsers(room2Id);

          expect(room1Users).toHaveLength(2);
          expect(room1Users).toContain("r1u1");
          expect(room1Users).toContain("r1u2");
          expect(room1Users).not.toContain("r2u1");
          expect(room1Users).not.toContain("r2u2");

          expect(room2Users).toHaveLength(2);
          expect(room2Users).toContain("r2u1");
          expect(room2Users).toContain("r2u2");
          expect(room2Users).not.toContain("r1u1");
          expect(room2Users).not.toContain("r1u2");

          // Clean up
          room1User1.close();
          room1User2.close();
          room2User1.close();
          room2User2.close();
          resolve();
        }
      };

      room1User1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          checkAllConnected();
        }
      });

      room1User2.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          checkAllConnected();
        }
      });

      room2User1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          checkAllConnected();
        }
      });

      room2User2.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          checkAllConnected();
        }
      });
    });
  });

  it(
    "should handle independent voting workflows in parallel",
    { timeout: 10000 },
    () => {
      return new Promise<void>((resolve) => {
        const room1User = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${room1Id}&userId=r1u1`
        );
        const room2User = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${room2Id}&userId=r2u1`
        );

        let connectedCount = 0;
        let room1VoteReceived = false;
        let room2VoteReceived = false;

        const checkAllConnected = () => {
          connectedCount++;
          if (connectedCount === 2) {
            // All connected, submit votes directly
            room1User.send(JSON.stringify({ type: "submit-vote", value: "5" }));
            room2User.send(JSON.stringify({ type: "submit-vote", value: "8" }));
          }
        };

        const checkBothReceived = () => {
          if (room1VoteReceived && room2VoteReceived) {
            // Verify votes are isolated
            const room1Votes = sessionStorage.getVotes(room1Id);
            const room2Votes = sessionStorage.getVotes(room2Id);

            expect(room1Votes?.get("r1u1")?.value).toBe("5");
            expect(room1Votes?.has("r2u1")).toBe(false);

            expect(room2Votes?.get("r2u1")?.value).toBe("8");
            expect(room2Votes?.has("r1u1")).toBe(false);

            room1User.close();
            room2User.close();
            resolve();
          }
        };

        room1User.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            checkAllConnected();
          } else if (message.type === "vote-submitted") {
            const msg = message as VoteSubmittedMessage;
            expect(msg.userId).toBe("r1u1");
            expect(msg.hasVoted).toBe(true);
            room1VoteReceived = true;
            checkBothReceived();
          }
        });

        room2User.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            checkAllConnected();
          } else if (message.type === "vote-submitted") {
            const msg = message as VoteSubmittedMessage;
            expect(msg.userId).toBe("r2u1");
            expect(msg.hasVoted).toBe(true);
            room2VoteReceived = true;
            checkBothReceived();
          }
        });
      });
    }
  );

  it(
    "should handle independent topic changes in parallel",
    { timeout: 10000 },
    () => {
      return new Promise<void>((resolve) => {
        const room1Mod = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${room1Id}&userId=mod-room1`
        );
        const room2Mod = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${room2Id}&userId=mod-room2`
        );

        let connectedCount = 0;
        let room1TopicChanged = false;
        let room2TopicChanged = false;

        const checkAllConnected = () => {
          connectedCount++;
          if (connectedCount === 2) {
            // All connected, set topics directly
            room1Mod.send(
              JSON.stringify({ type: "set-topic", topic: "Room 1 Topic" })
            );
            room2Mod.send(
              JSON.stringify({ type: "set-topic", topic: "Room 2 Topic" })
            );
          }
        };

        const checkBothChanged = () => {
          if (room1TopicChanged && room2TopicChanged) {
            // Verify topics are isolated
            const room1Session = sessionStorage.getSession(room1Id);
            const room2Session = sessionStorage.getSession(room2Id);

            expect(room1Session?.session.currentTopic).toBe("Room 1 Topic");
            expect(room2Session?.session.currentTopic).toBe("Room 2 Topic");

            room1Mod.close();
            room2Mod.close();
            resolve();
          }
        };

        room1Mod.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            checkAllConnected();
          } else if (message.type === "topic-changed") {
            const msg = message as TopicChangedMessage;
            expect(msg.topic).toBe("Room 1 Topic");
            room1TopicChanged = true;
            checkBothChanged();
          }
        });

        room2Mod.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            checkAllConnected();
          } else if (message.type === "topic-changed") {
            const msg = message as TopicChangedMessage;
            expect(msg.topic).toBe("Room 2 Topic");
            room2TopicChanged = true;
            checkBothChanged();
          }
        });
      });
    }
  );

  it(
    "should handle independent vote reveals in parallel",
    { timeout: 10000 },
    () => {
      return new Promise<void>((resolve) => {
        // Pre-populate votes for both rooms
        sessionStorage.submitVote(room1Id, "mod-room1", "5");
        sessionStorage.submitVote(room1Id, "r1u1", "8");
        sessionStorage.submitVote(room2Id, "mod-room2", "3");
        sessionStorage.submitVote(room2Id, "r2u1", "13");

        const room1Mod = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${room1Id}&userId=mod-room1`
        );
        const room2Mod = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${room2Id}&userId=mod-room2`
        );

        let connectedCount = 0;
        let room1Revealed = false;
        let room2Revealed = false;

        const checkAllConnected = () => {
          connectedCount++;
          if (connectedCount === 2) {
            // All connected, reveal votes directly
            room1Mod.send(JSON.stringify({ type: "reveal-votes" }));
            room2Mod.send(JSON.stringify({ type: "reveal-votes" }));
          }
        };

        const checkBothRevealed = () => {
          if (room1Revealed && room2Revealed) {
            // Verify reveals are independent
            const room1Session = sessionStorage.getSession(room1Id);
            const room2Session = sessionStorage.getSession(room2Id);

            expect(room1Session?.session.isRevealed).toBe(true);
            expect(room2Session?.session.isRevealed).toBe(true);

            room1Mod.close();
            room2Mod.close();
            resolve();
          }
        };

        room1Mod.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            checkAllConnected();
          } else if (message.type === "votes-revealed") {
            const msg = message as VotesRevealedMessage;
            expect(msg.votes["mod-room1"].value).toBe("5");
            expect(msg.votes["r1u1"].value).toBe("8");
            expect(msg.statistics.average).toBe(6.5);
            room1Revealed = true;
            checkBothRevealed();
          }
        });

        room2Mod.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            checkAllConnected();
          } else if (message.type === "votes-revealed") {
            const msg = message as VotesRevealedMessage;
            expect(msg.votes["mod-room2"].value).toBe("3");
            expect(msg.votes["r2u1"].value).toBe("13");
            expect(msg.statistics.average).toBe(8);
            room2Revealed = true;
            checkBothRevealed();
          }
        });
      });
    }
  );

  it(
    "should handle independent new rounds in parallel",
    { timeout: 10000 },
    () => {
      return new Promise<void>((resolve) => {
        // Pre-populate and reveal votes for both rooms
        sessionStorage.submitVote(room1Id, "mod-room1", "5");
        sessionStorage.revealVotes(room1Id);
        sessionStorage.submitVote(room2Id, "mod-room2", "8");
        sessionStorage.revealVotes(room2Id);

        const room1Mod = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${room1Id}&userId=mod-room1`
        );
        const room2Mod = new WebSocket(
          `ws://localhost:${port}/ws?roomId=${room2Id}&userId=mod-room2`
        );

        let connectedCount = 0;
        let room1RoundStarted = false;
        let room2RoundStarted = false;

        const checkAllConnected = () => {
          connectedCount++;
          if (connectedCount === 2) {
            // All connected, start new rounds directly
            room1Mod.send(JSON.stringify({ type: "new-round" }));
            room2Mod.send(JSON.stringify({ type: "new-round" }));
          }
        };

        const checkBothStarted = () => {
          if (room1RoundStarted && room2RoundStarted) {
            // Verify both rooms reset independently
            const room1Session = sessionStorage.getSession(room1Id);
            const room2Session = sessionStorage.getSession(room2Id);

            expect(room1Session?.votes.size).toBe(0);
            expect(room1Session?.session.isRevealed).toBe(false);
            expect(room2Session?.votes.size).toBe(0);
            expect(room2Session?.session.isRevealed).toBe(false);

            room1Mod.close();
            room2Mod.close();
            resolve();
          }
        };

        room1Mod.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            checkAllConnected();
          } else if (message.type === "round-started") {
            const msg = message as RoundStartedMessage;
            expect(msg.type).toBe("round-started");
            room1RoundStarted = true;
            checkBothStarted();
          }
        });

        room2Mod.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "connected") {
            checkAllConnected();
          } else if (message.type === "round-started") {
            const msg = message as RoundStartedMessage;
            expect(msg.type).toBe("round-started");
            room2RoundStarted = true;
            checkBothStarted();
          }
        });
      });
    }
  );

  it("should handle complete voting workflow in multiple rooms simultaneously", () => {
    return new Promise<void>((resolve) => {
      const room1Mod = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${room1Id}&userId=mod-room1`
      );
      const room1User1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${room1Id}&userId=r1u1`
      );
      const room1User2 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${room1Id}&userId=r1u2`
      );
      const room2Mod = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${room2Id}&userId=mod-room2`
      );
      const room2User1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${room2Id}&userId=r2u1`
      );
      const room2User2 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${room2Id}&userId=r2u2`
      );

      let connectedCount = 0;
      let room1VotesCount = 0;
      let room2VotesCount = 0;
      let room1Revealed = false;
      let room2Revealed = false;

      const checkAllConnected = () => {
        connectedCount++;
        if (connectedCount === 6) {
          // Start voting in both rooms simultaneously
          room1User1.send(JSON.stringify({ type: "submit-vote", value: "3" }));
          room1User2.send(JSON.stringify({ type: "submit-vote", value: "5" }));
          room2User1.send(JSON.stringify({ type: "submit-vote", value: "13" }));
          room2User2.send(JSON.stringify({ type: "submit-vote", value: "21" }));
        }
      };

      const checkRoom1VotesComplete = () => {
        room1VotesCount++;
        if (room1VotesCount === 2) {
          // All room1 votes received, reveal
          room1Mod.send(JSON.stringify({ type: "reveal-votes" }));
        }
      };

      const checkRoom2VotesComplete = () => {
        room2VotesCount++;
        if (room2VotesCount === 2) {
          // All room2 votes received, reveal
          room2Mod.send(JSON.stringify({ type: "reveal-votes" }));
        }
      };

      const checkBothRoomsRevealed = () => {
        if (room1Revealed && room2Revealed) {
          // Verify final state
          const room1Session = sessionStorage.getSession(room1Id);
          const room2Session = sessionStorage.getSession(room2Id);

          // Room 1: votes 3, 5 -> average 4
          expect(room1Session?.session.isRevealed).toBe(true);
          const room1Votes = sessionStorage.getVotes(room1Id);
          expect(room1Votes?.get("r1u1")?.value).toBe("3");
          expect(room1Votes?.get("r1u2")?.value).toBe("5");

          // Room 2: votes 13, 21 -> average 17
          expect(room2Session?.session.isRevealed).toBe(true);
          const room2Votes = sessionStorage.getVotes(room2Id);
          expect(room2Votes?.get("r2u1")?.value).toBe("13");
          expect(room2Votes?.get("r2u2")?.value).toBe("21");

          // Clean up
          room1Mod.close();
          room1User1.close();
          room1User2.close();
          room2Mod.close();
          room2User1.close();
          room2User2.close();
          resolve();
        }
      };

      room1Mod.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          checkAllConnected();
        } else if (message.type === "vote-submitted") {
          checkRoom1VotesComplete();
        } else if (message.type === "votes-revealed") {
          const msg = message as VotesRevealedMessage;
          expect(msg.statistics.average).toBe(4);
          room1Revealed = true;
          checkBothRoomsRevealed();
        }
      });

      room1User1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          checkAllConnected();
        }
      });

      room1User2.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          checkAllConnected();
        }
      });

      room2Mod.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          checkAllConnected();
        } else if (message.type === "vote-submitted") {
          checkRoom2VotesComplete();
        } else if (message.type === "votes-revealed") {
          const msg = message as VotesRevealedMessage;
          expect(msg.statistics.average).toBe(17);
          room2Revealed = true;
          checkBothRoomsRevealed();
        }
      });

      room2User1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          checkAllConnected();
        }
      });

      room2User2.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          checkAllConnected();
        }
      });
    });
  });

  it("should not leak messages between rooms during active voting", () => {
    return new Promise<void>((resolve) => {
      const room1User = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${room1Id}&userId=r1u1`
      );
      const room2User = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${room2Id}&userId=r2u1`
      );

      let connectedCount = 0;
      let room1MessageReceived = false;
      let receivedIncorrectMessage = false;

      const checkAllConnected = () => {
        connectedCount++;
        if (connectedCount === 2) {
          // Submit vote in room1 only
          room1User.send(JSON.stringify({ type: "submit-vote", value: "5" }));
        }
      };

      room1User.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          checkAllConnected();
        } else if (message.type === "vote-submitted") {
          room1MessageReceived = true;
          // Give time for any potential message leak
          setTimeout(() => {
            expect(receivedIncorrectMessage).toBe(false);
            room1User.close();
            room2User.close();
            resolve();
          }, 100);
        }
      });

      room2User.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          checkAllConnected();
        } else if (message.type === "vote-submitted") {
          // This should never happen - room2 shouldn't receive room1's vote message
          receivedIncorrectMessage = true;
          expect.fail("Room 2 received vote message from Room 1");
        }
      });
    });
  });

  it("should maintain session state isolation when users join mid-session", () => {
    return new Promise<void>((resolve) => {
      // Pre-populate room states
      sessionStorage.setTopic(room1Id, "Room 1 Story");
      sessionStorage.submitVote(room1Id, "mod-room1", "5");
      sessionStorage.setTopic(room2Id, "Room 2 Story");
      sessionStorage.submitVote(room2Id, "mod-room2", "13");

      const room1User = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${room1Id}&userId=r1u1`
      );
      const room2User = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${room2Id}&userId=r2u1`
      );

      let room1StateReceived = false;
      let room2StateReceived = false;

      const checkBothReceived = () => {
        if (room1StateReceived && room2StateReceived) {
          room1User.close();
          room2User.close();
          resolve();
        }
      };

      room1User.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          room1User.send(
            JSON.stringify({
              type: "join-session",
              participantName: "Room 1 User",
            })
          );
        } else if (message.type === "session-state") {
          const msg = message as SessionStateMessage;
          expect(msg.sessionName).toBe("Room 1 Session");
          expect(msg.currentTopic).toBe("Room 1 Story");
          expect(msg.votes["mod-room1"].hasVoted).toBe(true);
          // Should not have room2's data
          expect(msg.votes["mod-room2"]).toBeUndefined();
          room1StateReceived = true;
          checkBothReceived();
        }
      });

      room2User.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          room2User.send(
            JSON.stringify({
              type: "join-session",
              participantName: "Room 2 User",
            })
          );
        } else if (message.type === "session-state") {
          const msg = message as SessionStateMessage;
          expect(msg.sessionName).toBe("Room 2 Session");
          expect(msg.currentTopic).toBe("Room 2 Story");
          expect(msg.votes["mod-room2"].hasVoted).toBe(true);
          // Should not have room1's data
          expect(msg.votes["mod-room1"]).toBeUndefined();
          room2StateReceived = true;
          checkBothReceived();
        }
      });
    });
  });
});
