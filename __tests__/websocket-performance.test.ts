import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer, Server as HTTPServer } from "http";
import { WebSocket } from "ws";
import { PlanningPokerWebSocketServer } from "@/server/websocket";
import { sessionStorage } from "@/server/sessionStorage";

describe("WebSocket Performance - Real-Time Sync", () => {
  let httpServer: HTTPServer;
  let wsServer: PlanningPokerWebSocketServer;
  let port: number;

  beforeEach(() => {
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

  it("should propagate vote submissions within 500ms", () => {
    return new Promise<void>((resolve, reject) => {
      const session = sessionStorage.createSession(
        "Test Session",
        "user1",
        "Moderator"
      );
      const roomId = session.session.id;
      const userId1 = "user1";
      const userId2 = "user2";

      const ws1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${roomId}&userId=${userId1}`
      );
      const ws2 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${roomId}&userId=${userId2}`
      );

      let ws1Ready = false;
      let ws2Ready = false;
      let startTime: number;

      const checkReady = () => {
        if (ws1Ready && ws2Ready) {
          // Both clients ready, now submit a vote and measure propagation time
          startTime = Date.now();
          ws1.send(
            JSON.stringify({
              type: "submit-vote",
              value: "5",
            })
          );
        }
      };

      ws1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws1.send(
            JSON.stringify({
              type: "join-session",
              participantName: "Moderator",
            })
          );
        } else if (message.type === "session-state") {
          ws1Ready = true;
          checkReady();
        }
      });

      ws2.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws2.send(
            JSON.stringify({
              type: "join-session",
              participantName: "User Two",
            })
          );
        } else if (message.type === "session-state") {
          ws2Ready = true;
          checkReady();
        } else if (message.type === "vote-submitted") {
          const endTime = Date.now();
          const propagationTime = endTime - startTime;

          try {
            expect(propagationTime).toBeLessThanOrEqual(500);
            expect(message.userId).toBe(userId1);
            ws1.close();
            ws2.close();
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });

      ws1.on("error", reject);
      ws2.on("error", reject);
    });
  }, 10000);

  it("should propagate topic changes within 500ms", () => {
    return new Promise<void>((resolve, reject) => {
      const session = sessionStorage.createSession(
        "Test Session",
        "user1",
        "Moderator"
      );
      const roomId = session.session.id;
      const userId1 = "user1";
      const userId2 = "user2";

      const ws1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${roomId}&userId=${userId1}`
      );
      const ws2 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${roomId}&userId=${userId2}`
      );

      let ws1Ready = false;
      let ws2Ready = false;
      let startTime: number;

      const checkReady = () => {
        if (ws1Ready && ws2Ready) {
          // Both clients ready, now set topic and measure propagation time
          startTime = Date.now();
          ws1.send(
            JSON.stringify({
              type: "set-topic",
              topic: "User authentication feature",
            })
          );
        }
      };

      ws1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws1.send(
            JSON.stringify({
              type: "join-session",
              participantName: "Moderator",
            })
          );
        } else if (message.type === "session-state") {
          ws1Ready = true;
          checkReady();
        }
      });

      ws2.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws2.send(
            JSON.stringify({
              type: "join-session",
              participantName: "User Two",
            })
          );
        } else if (message.type === "session-state") {
          ws2Ready = true;
          checkReady();
        } else if (message.type === "topic-changed") {
          const endTime = Date.now();
          const propagationTime = endTime - startTime;

          try {
            expect(propagationTime).toBeLessThanOrEqual(500);
            expect(message.topic).toBe("User authentication feature");
            ws1.close();
            ws2.close();
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });

      ws1.on("error", reject);
      ws2.on("error", reject);
    });
  }, 10000);

  it("should propagate vote reveals within 500ms", () => {
    return new Promise<void>((resolve, reject) => {
      const session = sessionStorage.createSession(
        "Test Session",
        "user1",
        "Moderator"
      );
      const roomId = session.session.id;
      const userId1 = "user1";
      const userId2 = "user2";

      const ws1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${roomId}&userId=${userId1}`
      );
      const ws2 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${roomId}&userId=${userId2}`
      );

      let ws1Ready = false;
      let ws2Ready = false;
      let votesSubmitted = false;
      let startTime: number;

      const checkReady = () => {
        if (ws1Ready && ws2Ready && !votesSubmitted) {
          votesSubmitted = true;
          // Submit votes first
          ws1.send(JSON.stringify({ type: "submit-vote", value: "5" }));
          ws2.send(JSON.stringify({ type: "submit-vote", value: "8" }));

          // Wait a bit for votes to be submitted, then reveal
          setTimeout(() => {
            startTime = Date.now();
            ws1.send(JSON.stringify({ type: "reveal-votes" }));
          }, 100);
        }
      };

      ws1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws1.send(
            JSON.stringify({
              type: "join-session",
              participantName: "Moderator",
            })
          );
        } else if (message.type === "session-state") {
          ws1Ready = true;
          checkReady();
        }
      });

      ws2.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws2.send(
            JSON.stringify({
              type: "join-session",
              participantName: "User Two",
            })
          );
        } else if (message.type === "session-state") {
          ws2Ready = true;
          checkReady();
        } else if (message.type === "votes-revealed") {
          const endTime = Date.now();
          const propagationTime = endTime - startTime;

          try {
            expect(propagationTime).toBeLessThanOrEqual(500);
            expect(message.votes).toBeDefined();
            expect(message.statistics).toBeDefined();
            ws1.close();
            ws2.close();
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });

      ws1.on("error", reject);
      ws2.on("error", reject);
    });
  }, 10000);

  it("should propagate new round starts within 500ms", () => {
    return new Promise<void>((resolve, reject) => {
      const session = sessionStorage.createSession(
        "Test Session",
        "user1",
        "Moderator"
      );
      const roomId = session.session.id;
      const userId1 = "user1";
      const userId2 = "user2";

      const ws1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${roomId}&userId=${userId1}`
      );
      const ws2 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${roomId}&userId=${userId2}`
      );

      let ws1Ready = false;
      let ws2Ready = false;
      let startTime: number;

      const checkReady = () => {
        if (ws1Ready && ws2Ready) {
          // Both clients ready, now start new round and measure propagation time
          startTime = Date.now();
          ws1.send(JSON.stringify({ type: "new-round" }));
        }
      };

      ws1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws1.send(
            JSON.stringify({
              type: "join-session",
              participantName: "Moderator",
            })
          );
        } else if (message.type === "session-state") {
          ws1Ready = true;
          checkReady();
        }
      });

      ws2.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws2.send(
            JSON.stringify({
              type: "join-session",
              participantName: "User Two",
            })
          );
        } else if (message.type === "session-state") {
          ws2Ready = true;
          checkReady();
        } else if (message.type === "round-started") {
          const endTime = Date.now();
          const propagationTime = endTime - startTime;

          try {
            expect(propagationTime).toBeLessThanOrEqual(500);
            ws1.close();
            ws2.close();
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });

      ws1.on("error", reject);
      ws2.on("error", reject);
    });
  }, 10000);

  it("should propagate participant join events within 500ms", () => {
    return new Promise<void>((resolve, reject) => {
      const session = sessionStorage.createSession(
        "Test Session",
        "user1",
        "Moderator"
      );
      const roomId = session.session.id;
      const userId1 = "user1";
      const userId2 = "user2";

      const ws1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${roomId}&userId=${userId1}`
      );

      let ws1Ready = false;
      let ws2: WebSocket | null = null;
      let startTime: number;

      ws1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws1.send(
            JSON.stringify({
              type: "join-session",
              participantName: "Moderator",
            })
          );
        } else if (message.type === "session-state" && !ws1Ready) {
          ws1Ready = true;
          // First client ready, now connect second client and measure
          ws2 = new WebSocket(
            `ws://localhost:${port}/ws?roomId=${roomId}&userId=${userId2}`
          );

          // Send join-session message after receiving connected
          ws2.on("message", (data2) => {
            const msg2 = JSON.parse(data2.toString());
            if (msg2.type === "connected") {
              startTime = Date.now();
              ws2!.send(
                JSON.stringify({
                  type: "join-session",
                  participantName: "User 2",
                })
              );
            }
          });

          ws2.on("error", reject);
        } else if (message.type === "participant-joined") {
          const endTime = Date.now();
          const propagationTime = endTime - startTime;

          try {
            expect(propagationTime).toBeLessThanOrEqual(500);
            expect(message.participant.id).toBe(userId2);
            expect(message.participant.name).toBe("User 2");
            ws1.close();
            if (ws2) ws2.close();
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });

      ws1.on("error", reject);
    });
  }, 10000);

  it("should handle multiple rapid actions within performance limits", () => {
    return new Promise<void>((resolve, reject) => {
      const session = sessionStorage.createSession(
        "Test Session",
        "user1",
        "Moderator"
      );
      const roomId = session.session.id;
      const userId1 = "user1";
      const userId2 = "user2";

      const ws1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${roomId}&userId=${userId1}`
      );
      const ws2 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=${roomId}&userId=${userId2}`
      );

      let ws1Ready = false;
      let ws2Ready = false;
      const propagationTimes: number[] = [];
      let actionsCompleted = 0;
      const totalActions = 3;
      let actionStartTimes: { [key: string]: number } = {};

      const checkReady = () => {
        if (ws1Ready && ws2Ready) {
          // Rapidly send multiple actions
          actionStartTimes["vote"] = Date.now();
          ws1.send(JSON.stringify({ type: "submit-vote", value: "5" }));

          setTimeout(() => {
            actionStartTimes["topic"] = Date.now();
            ws1.send(
              JSON.stringify({
                type: "set-topic",
                topic: "Test topic",
              })
            );
          }, 50);

          setTimeout(() => {
            actionStartTimes["reveal"] = Date.now();
            ws1.send(JSON.stringify({ type: "reveal-votes" }));
          }, 100);
        }
      };

      ws1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws1.send(
            JSON.stringify({
              type: "join-session",
              participantName: "Moderator",
            })
          );
        } else if (message.type === "session-state") {
          ws1Ready = true;
          checkReady();
        }
      });

      ws2.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws2.send(
            JSON.stringify({
              type: "join-session",
              participantName: "User Two",
            })
          );
        } else if (message.type === "session-state") {
          ws2Ready = true;
          checkReady();
        } else if (message.type === "vote-submitted") {
          const endTime = Date.now();
          const propagationTime = endTime - actionStartTimes["vote"];
          propagationTimes.push(propagationTime);
          actionsCompleted++;
        } else if (message.type === "topic-changed") {
          const endTime = Date.now();
          const propagationTime = endTime - actionStartTimes["topic"];
          propagationTimes.push(propagationTime);
          actionsCompleted++;
        } else if (message.type === "votes-revealed") {
          const endTime = Date.now();
          const propagationTime = endTime - actionStartTimes["reveal"];
          propagationTimes.push(propagationTime);
          actionsCompleted++;
        }

        if (actionsCompleted === totalActions) {
          try {
            // All propagation times should be under 500ms
            propagationTimes.forEach((time) => {
              expect(time).toBeLessThanOrEqual(500);
            });
            // Average should be well under the limit
            const average =
              propagationTimes.reduce((a, b) => a + b, 0) /
              propagationTimes.length;
            expect(average).toBeLessThan(250);
            ws1.close();
            ws2.close();
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });

      ws1.on("error", reject);
      ws2.on("error", reject);
    });
  }, 15000);
});
