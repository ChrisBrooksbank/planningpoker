import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer, Server as HTTPServer } from "http";
import { WebSocket } from "ws";
import { PlanningPokerWebSocketServer } from "@/server/websocket";

describe("PlanningPokerWebSocketServer", () => {
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
    return new Promise<void>((resolve) => {
      httpServer.close(() => {
        resolve();
      });
    });
  });

  it("should accept WebSocket connections with valid roomId and userId", () => {
    return new Promise<void>((resolve) => {
      const ws = new WebSocket(
        `ws://localhost:${port}/ws?roomId=ROOM01&userId=user1`
      );

      ws.on("open", () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
      });

      ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          expect(message.userId).toBe("user1");
          expect(message.roomId).toBe("ROOM01");
          resolve();
        }
      });
    });
  });

  it("should reject connections without roomId", () => {
    return new Promise<void>((resolve) => {
      const ws = new WebSocket(`ws://localhost:${port}/ws?userId=user1`);

      ws.on("close", (code, reason) => {
        expect(code).toBe(1008);
        expect(reason.toString()).toContain("Missing roomId or userId");
        resolve();
      });
    });
  });

  it("should reject connections without userId", () => {
    return new Promise<void>((resolve) => {
      const ws = new WebSocket(`ws://localhost:${port}/ws?roomId=ROOM01`);

      ws.on("close", (code, reason) => {
        expect(code).toBe(1008);
        expect(reason.toString()).toContain("Missing roomId or userId");
        resolve();
      });
    });
  });

  it("should reject connections with invalid roomId format", () => {
    return new Promise<void>((resolve) => {
      const ws = new WebSocket(
        `ws://localhost:${port}/ws?roomId=invalid-room&userId=user1`
      );

      ws.on("close", (code, reason) => {
        expect(code).toBe(1008);
        expect(reason.toString()).toContain("Invalid roomId format");
        resolve();
      });
    });
  });

  it("should reject connections with userId longer than 50 chars", () => {
    return new Promise<void>((resolve) => {
      const longUserId = "a".repeat(51);
      const ws = new WebSocket(
        `ws://localhost:${port}/ws?roomId=ROOM01&userId=${longUserId}`
      );

      ws.on("close", (code, reason) => {
        expect(code).toBe(1008);
        expect(reason.toString()).toContain("userId too long");
        resolve();
      });
    });
  });

  it("should broadcast messages to all clients in the same room", () => {
    return new Promise<void>((resolve) => {
      const ws1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=ROOM01&userId=user1`
      );
      const ws2 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=ROOM01&userId=user2`
      );

      let ws1Connected = false;
      let ws2Connected = false;

      const checkReady = () => {
        if (ws1Connected && ws2Connected) {
          // Use broadcastToRoom directly to test broadcast functionality
          wsServer.broadcastToRoom("ROOM01", {
            type: "round-started",
            roundHistory: [],
          });
        }
      };

      ws1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws1Connected = true;
          checkReady();
        } else if (message.type === "round-started") {
          // ws1 received the broadcast
          ws1.close();
        }
      });

      ws2.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws2Connected = true;
          checkReady();
        } else if (message.type === "round-started") {
          // ws2 received the broadcast
          ws2.close();
          resolve();
        }
      });
    });
  });

  it("should not broadcast messages to clients in different rooms", () => {
    return new Promise<void>((resolve) => {
      const ws1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=ROOM01&userId=user1`
      );
      const ws2 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=ROOM02&userId=user2`
      );

      let ws1Connected = false;
      let ws2Connected = false;
      let receivedMessage = false;

      const checkReady = () => {
        if (ws1Connected && ws2Connected) {
          // Use broadcastToRoom to test room isolation
          wsServer.broadcastToRoom("ROOM01", {
            type: "round-started",
            roundHistory: [],
          });

          setTimeout(() => {
            if (!receivedMessage) {
              ws1.close();
              ws2.close();
              resolve();
            }
          }, 100);
        }
      };

      ws1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws1Connected = true;
          checkReady();
        }
      });

      ws2.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws2Connected = true;
          checkReady();
        } else if (message.type === "round-started") {
          receivedMessage = true;
          expect.fail("Message received in different room");
        }
      });
    });
  });

  it("should notify room when a client disconnects", () => {
    return new Promise<void>((resolve) => {
      const ws1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=ROOM01&userId=user1`
      );
      const ws2 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=ROOM01&userId=user2`
      );

      let ws1Connected = false;
      let ws2Connected = false;

      const checkReady = () => {
        if (ws1Connected && ws2Connected) {
          ws1.close();
        }
      };

      ws1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws1Connected = true;
          checkReady();
        }
      });

      ws2.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          ws2Connected = true;
          checkReady();
        } else if (message.type === "participant-left") {
          expect(message.userId).toBe("user1");
          ws2.close();
          resolve();
        }
      });
    });
  });

  it("should get list of users in a room", () => {
    return new Promise<void>((resolve) => {
      const ws1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=ROOM01&userId=user1`
      );
      const ws2 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=ROOM01&userId=user2`
      );

      let connected = 0;

      const checkReady = () => {
        connected++;
        if (connected === 2) {
          const users = wsServer.getRoomUsers("ROOM01");
          expect(users).toHaveLength(2);
          expect(users).toContain("user1");
          expect(users).toContain("user2");
          ws1.close();
          ws2.close();
          resolve();
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
        }
      });
    });
  });

  it("should check if a user is connected", () => {
    return new Promise<void>((resolve) => {
      const ws = new WebSocket(
        `ws://localhost:${port}/ws?roomId=ROOM01&userId=user1`
      );

      ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          expect(wsServer.isUserConnected("user1", "ROOM01")).toBe(true);
          expect(wsServer.isUserConnected("user2", "ROOM01")).toBe(false);
          expect(wsServer.isUserConnected("user1", "ROOM02")).toBe(false);
          ws.close();
          resolve();
        }
      });
    });
  });

  it("should send message to specific user", () => {
    return new Promise<void>((resolve) => {
      const ws1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=ROOM01&userId=user1`
      );
      const ws2 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=ROOM01&userId=user2`
      );

      let connected = 0;

      const checkReady = () => {
        connected++;
        if (connected === 2) {
          wsServer.sendToUser("user2", "ROOM01", {
            type: "error",
            code: "TEST_ERROR",
            message: "hello user2",
          });
        }
      };

      ws1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          checkReady();
        } else if (message.type === "error") {
          expect.fail("user1 should not receive error message");
        }
      });

      ws2.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          checkReady();
        } else if (message.type === "error") {
          expect(message.message).toBe("hello user2");
          ws1.close();
          ws2.close();
          resolve();
        }
      });
    });
  });

  it("should disconnect a specific user", () => {
    return new Promise<void>((resolve) => {
      const ws1 = new WebSocket(
        `ws://localhost:${port}/ws?roomId=ROOM01&userId=user1`
      );

      ws1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "connected") {
          expect(wsServer.isUserConnected("user1", "ROOM01")).toBe(true);
          wsServer.disconnectUser("user1", "ROOM01");
        }
      });

      ws1.on("close", () => {
        expect(wsServer.isUserConnected("user1", "ROOM01")).toBe(false);
        resolve();
      });
    });
  });
});
