import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer, Server as HTTPServer } from "http";
import { WebSocket } from "ws";
import { PlanningPokerWebSocketServer } from "@/server/websocket";
import { sessionStorage } from "@/server/sessionStorage";
import type {
  SessionStateMessage,
  ParticipantJoinedMessage,
  ParticipantLeftMessage,
  VoteSubmittedMessage,
  VotesRevealedMessage,
} from "@/lib/websocket-messages";

/**
 * Tests for participant join/leave behavior during active voting sessions.
 * This verifies the session-management.md and real-time-sync.md requirements:
 * - "Handle participants leaving (browser close, disconnect)"
 * - "Participant list updates in real-time as people join/leave"
 * - "Sync participant list (join/leave)" in real-time
 */
describe("Participant Join/Leave During Active Voting", () => {
  let httpServer: HTTPServer;
  let wsServer: PlanningPokerWebSocketServer;
  let port: number;
  let roomId: string;
  let activeConnections: WebSocket[] = [];

  beforeEach(() => {
    activeConnections = [];
    // Create test session
    const session = sessionStorage.createSession(
      "Test Session",
      "moderator-id",
      "Moderator"
    );
    roomId = session.session.id;

    // Start a round so voting is open
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
    // Clean up all sessions
    sessionStorage.getAllSessionIds().forEach((id) => {
      sessionStorage.deleteSession(id);
    });

    // Close all active WebSocket connections first
    activeConnections.forEach((ws) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        } else if (ws.readyState === WebSocket.CONNECTING) {
          // For connecting sockets, wait for open then close
          ws.once("open", () => ws.close());
        }
      } catch (error) {
        // Ignore errors during cleanup
      }
    });

    // Give WebSocket connections time to close, then close server
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        httpServer.close(() => {
          resolve();
        });
      }, 300);
    });
  });

  // Helper to track WebSocket connections
  function trackConnection(ws: WebSocket): WebSocket {
    activeConnections.push(ws);
    return ws;
  }

  it(
    "should notify all participants when a new user joins during voting",
    { timeout: 10000 },
    () => {
      return new Promise<void>((resolve) => {
        const user1 = trackConnection(
          new WebSocket(
            `ws://localhost:${port}/ws?roomId=${roomId}&userId=user1`
          )
        );
        let user2: WebSocket;

        let user1Joined = false;
        let user1VoteSubmitted = false;
        let user2Created = false;

        user1.on("message", (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === "connected") {
            user1.send(
              JSON.stringify({
                type: "join-session",
                participantName: "User 1",
              })
            );
          } else if (message.type === "session-state" && !user1Joined) {
            user1Joined = true;
            // Submit vote after joining
            user1.send(JSON.stringify({ type: "submit-vote", value: "5" }));
          } else if (message.type === "vote-submitted" && !user1VoteSubmitted) {
            user1VoteSubmitted = true;
            // Vote confirmed, now connect user2
            if (!user2Created) {
              user2Created = true;
              user2 = trackConnection(
                new WebSocket(
                  `ws://localhost:${port}/ws?roomId=${roomId}&userId=user2`
                )
              );

              user2.on("error", (error) => {
                user1.close();
                user2.close();
                throw error;
              });

              user2.on("message", (data) => {
                const message = JSON.parse(data.toString());

                if (message.type === "connected") {
                  user2.send(
                    JSON.stringify({
                      type: "join-session",
                      participantName: "User 2",
                    })
                  );
                } else if (message.type === "session-state") {
                  const msg = message as SessionStateMessage;
                  // User2 should see existing participants (moderator + user1 + user2)
                  expect(msg.participants).toHaveLength(3);
                  expect(msg.votes["user1"]).toBeDefined();
                  expect(msg.votes["user1"].hasVoted).toBe(true);
                  // Vote value should be hidden
                  expect(msg.votes["user1"].value).toBeUndefined();
                }
              });
            }
          } else if (message.type === "participant-joined") {
            const msg = message as ParticipantJoinedMessage;
            if (msg.participant.id === "user2") {
              expect(msg.participant.name).toBe("User 2");
              expect(msg.participant.isModerator).toBe(false);
              expect(msg.participant.isConnected).toBe(true);
              user1.close();
              user2.close();
              resolve();
            }
          }
        });
      });
    }
  );

  it(
    "should notify all participants when a user leaves during voting",
    { timeout: 10000 },
    () => {
      return new Promise<void>((resolve) => {
        const user1 = trackConnection(
          new WebSocket(
            `ws://localhost:${port}/ws?roomId=${roomId}&userId=user1`
          )
        );
        const user2 = trackConnection(
          new WebSocket(
            `ws://localhost:${port}/ws?roomId=${roomId}&userId=user2`
          )
        );

        let user1Ready = false;
        let user2Ready = false;
        let votesSubmitted = false;

        user1.on("message", (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === "connected") {
            user1.send(
              JSON.stringify({
                type: "join-session",
                participantName: "User 1",
              })
            );
          } else if (message.type === "session-state" && !user1Ready) {
            user1Ready = true;
            if (user2Ready && !votesSubmitted) {
              // Both users ready, submit votes
              user1.send(JSON.stringify({ type: "submit-vote", value: "3" }));
              user2.send(JSON.stringify({ type: "submit-vote", value: "5" }));
              votesSubmitted = true;
            }
          } else if (message.type === "vote-submitted" && votesSubmitted) {
            // Votes submitted, disconnect user2
            user2.close();
          } else if (message.type === "participant-left") {
            const msg = message as ParticipantLeftMessage;
            expect(msg.userId).toBe("user2");

            // Verify vote should still exist (disconnected users' votes are preserved)
            const votes = sessionStorage.getVotes(roomId);
            expect(votes?.has("user2")).toBe(true);
            expect(votes?.get("user2")?.value).toBe("5");

            user1.close();
            resolve();
          }
        });

        user2.on("message", (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === "connected") {
            user2.send(
              JSON.stringify({
                type: "join-session",
                participantName: "User 2",
              })
            );
          } else if (message.type === "session-state" && !user2Ready) {
            user2Ready = true;
            if (user1Ready && !votesSubmitted) {
              // Both users ready, submit votes
              user1.send(JSON.stringify({ type: "submit-vote", value: "3" }));
              user2.send(JSON.stringify({ type: "submit-vote", value: "5" }));
              votesSubmitted = true;
            }
          }
        });
      });
    }
  );

  it(
    "should preserve votes from disconnected users when revealing",
    { timeout: 10000 },
    () => {
      return new Promise<void>((resolve) => {
        const moderator = trackConnection(
          new WebSocket(
            `ws://localhost:${port}/ws?roomId=${roomId}&userId=moderator-id`
          )
        );
        const user1 = trackConnection(
          new WebSocket(
            `ws://localhost:${port}/ws?roomId=${roomId}&userId=user1`
          )
        );

        let modReady = false;
        let user1Ready = false;
        let user1VoteSubmitted = false;
        let user1Disconnected = false;

        moderator.on("message", (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === "connected") {
            moderator.send(
              JSON.stringify({
                type: "join-session",
                participantName: "Moderator",
              })
            );
          } else if (message.type === "session-state" && !modReady) {
            modReady = true;
          } else if (message.type === "vote-submitted") {
            const msg = message as VoteSubmittedMessage;
            if (msg.userId === "user1") {
              user1VoteSubmitted = true;
              // Disconnect user1 after vote
              user1.close();
            }
          } else if (
            message.type === "participant-left" &&
            !user1Disconnected
          ) {
            const msg = message as ParticipantLeftMessage;
            expect(msg.userId).toBe("user1");
            user1Disconnected = true;

            // Reveal votes even though user1 is disconnected
            moderator.send(JSON.stringify({ type: "reveal-votes" }));
          } else if (message.type === "votes-revealed") {
            const msg = message as VotesRevealedMessage;

            // Should include vote from disconnected user
            expect(msg.votes["user1"]).toBeDefined();
            expect(msg.votes["user1"].value).toBe("8");

            // Verify statistics include the disconnected user's vote
            expect(msg.statistics.average).toBe(8);

            moderator.close();
            resolve();
          }
        });

        user1.on("message", (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === "connected") {
            user1.send(
              JSON.stringify({
                type: "join-session",
                participantName: "User 1",
              })
            );
          } else if (message.type === "session-state" && !user1Ready) {
            user1Ready = true;
            if (modReady) {
              // Submit vote
              user1.send(JSON.stringify({ type: "submit-vote", value: "8" }));
            }
          }
        });
      });
    }
  );

  it(
    "should allow late joiners to vote in an ongoing round",
    { timeout: 10000 },
    () => {
      return new Promise<void>((resolve) => {
        const user1 = trackConnection(
          new WebSocket(
            `ws://localhost:${port}/ws?roomId=${roomId}&userId=user1`
          )
        );

        let user1VoteSubmitted = false;

        user1.on("message", (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === "connected") {
            user1.send(
              JSON.stringify({
                type: "join-session",
                participantName: "User 1",
              })
            );
          } else if (message.type === "session-state" && !user1VoteSubmitted) {
            // Submit vote
            user1.send(JSON.stringify({ type: "submit-vote", value: "3" }));
            user1VoteSubmitted = true;
          } else if (message.type === "vote-submitted" && user1VoteSubmitted) {
            // Vote confirmed, now connect user2
            const user2 = trackConnection(
              new WebSocket(
                `ws://localhost:${port}/ws?roomId=${roomId}&userId=user2`
              )
            );

            user2.on("error", (error) => {
              user1.close();
              user2.close();
              throw error;
            });

            user2.on("message", (data) => {
              const message = JSON.parse(data.toString());

              if (message.type === "connected") {
                user2.send(
                  JSON.stringify({
                    type: "join-session",
                    participantName: "User 2",
                  })
                );
              } else if (message.type === "session-state") {
                const msg = message as SessionStateMessage;

                // User2 should see user1's vote status but not value
                expect(msg.votes["user1"]).toBeDefined();
                expect(msg.votes["user1"].hasVoted).toBe(true);
                expect(msg.votes["user1"].value).toBeUndefined();

                // User2 should be able to vote
                user2.send(JSON.stringify({ type: "submit-vote", value: "5" }));
              } else if (message.type === "vote-submitted") {
                const msg = message as VoteSubmittedMessage;
                if (msg.userId === "user2") {
                  // Verify both votes are stored
                  const votes = sessionStorage.getVotes(roomId);
                  expect(votes?.get("user1")?.value).toBe("3");
                  expect(votes?.get("user2")?.value).toBe("5");

                  user1.close();
                  user2.close();
                  resolve();
                }
              }
            });
          }
        });
      });
    }
  );

  it(
    "should handle reconnection of a user who left during voting",
    { timeout: 10000 },
    () => {
      return new Promise<void>((resolve) => {
        const user1 = trackConnection(
          new WebSocket(
            `ws://localhost:${port}/ws?roomId=${roomId}&userId=user1`
          )
        );

        let user1VoteSubmitted = false;
        let user1Disconnected = false;

        user1.on("message", (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === "connected" && !user1VoteSubmitted) {
            user1.send(
              JSON.stringify({
                type: "join-session",
                participantName: "User 1",
              })
            );
          } else if (message.type === "session-state" && !user1VoteSubmitted) {
            // Submit vote
            user1.send(JSON.stringify({ type: "submit-vote", value: "13" }));
            user1VoteSubmitted = true;
          } else if (message.type === "vote-submitted" && !user1Disconnected) {
            // Vote confirmed, disconnect
            user1.close();
            user1Disconnected = true;

            // Wait a bit, then reconnect
            setTimeout(() => {
              const user1Reconnection = trackConnection(
                new WebSocket(
                  `ws://localhost:${port}/ws?roomId=${roomId}&userId=user1`
                )
              );

              user1Reconnection.on("error", (error) => {
                user1Reconnection.close();
                throw error;
              });

              user1Reconnection.on("message", (data) => {
                const message = JSON.parse(data.toString());

                if (message.type === "connected") {
                  user1Reconnection.send(
                    JSON.stringify({
                      type: "join-session",
                      participantName: "User 1 Reconnected",
                    })
                  );
                } else if (message.type === "session-state") {
                  const msg = message as SessionStateMessage;

                  // Should receive session state with existing vote
                  expect(msg.votes["user1"]).toBeDefined();
                  expect(msg.votes["user1"].hasVoted).toBe(true);
                  expect(msg.votes["user1"].value).toBeUndefined(); // Hidden

                  // Verify storage has the vote
                  const votes = sessionStorage.getVotes(roomId);
                  expect(votes?.get("user1")?.value).toBe("13");

                  // User should be marked as connected again
                  const session = sessionStorage.getSession(roomId);
                  const user1Participant = session?.participants.find(
                    (p) => p.id === "user1"
                  );
                  expect(user1Participant?.isConnected).toBe(true);

                  user1Reconnection.close();
                  resolve();
                }
              });
            }, 100);
          }
        });
      });
    }
  );
});
