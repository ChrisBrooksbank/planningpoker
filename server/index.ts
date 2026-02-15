import { createServer, IncomingMessage, ServerResponse } from "http";
import { parse } from "url";
import next from "next";
import { nanoid } from "nanoid";
import { PlanningPokerWebSocketServer } from "./websocket.js";
import { sessionStorage } from "./sessionStorage.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || (dev ? "localhost" : "0.0.0.0");
const port = parseInt(process.env.PORT || "3000", 10);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const app = (next as any)({ dev, hostname, port });
const handle = app.getRequestHandler();

const MAX_BODY_SIZE = 10 * 1024; // 10 KB

const BODY_TIMEOUT_MS = 10_000;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error("Request body timeout"));
    }, BODY_TIMEOUT_MS);
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        clearTimeout(timer);
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      data += chunk;
    });
    req.on("end", () => { clearTimeout(timer); resolve(data); });
    req.on("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const MAX_SESSIONS = 1000;
const SESSION_RATE_LIMIT = 10; // max sessions per IP per minute
const SESSION_RATE_WINDOW_MS = 60_000;
const sessionCreationRateLimit = new Map<string, { count: number; windowStart: number }>();

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function isSessionRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = sessionCreationRateLimit.get(ip);
  if (!entry || now - entry.windowStart > SESSION_RATE_WINDOW_MS) {
    sessionCreationRateLimit.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > SESSION_RATE_LIMIT;
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url!, true);
    const { pathname } = parsedUrl;

    // Handle session API routes directly so they share the same sessionStorage
    // instance as the WebSocket server (Next.js webpack bundles create separate module scopes)

    if (pathname === "/api/sessions" && req.method === "POST") {
      if (sessionStorage.getSessionCount() >= MAX_SESSIONS) {
        return sendJson(res, 503, { error: "Server is at capacity, please try again later" });
      }
      const ip = getClientIp(req);
      if (isSessionRateLimited(ip)) {
        return sendJson(res, 429, { error: "Too many sessions created, please try again later" });
      }
      try {
        const body = JSON.parse(await readBody(req));
        const { sessionName, moderatorName } = body;
        if (!sessionName || typeof sessionName !== "string") {
          return sendJson(res, 400, { error: "Session name is required" });
        }
        if (!moderatorName || typeof moderatorName !== "string") {
          return sendJson(res, 400, { error: "Moderator name is required" });
        }
        const moderatorId = nanoid();
        const sessionState = sessionStorage.createSession(sessionName, moderatorId, moderatorName);
        return sendJson(res, 200, {
          roomId: sessionState.session.id,
          sessionName: sessionState.session.name,
          moderatorId,
        });
      } catch {
        return sendJson(res, 500, { error: "Failed to create session" });
      }
    }

    const validateMatch = pathname?.match(/^\/api\/sessions\/([^/]+)\/validate$/);
    if (validateMatch && req.method === "GET") {
      const roomId = validateMatch[1];
      if (sessionStorage.sessionExists(roomId)) {
        return sendJson(res, 200, { exists: true });
      }
      return sendJson(res, 404, { error: "Session not found" });
    }

    // Everything else goes to Next.js
    handle(req, res, parsedUrl);
  });

  // Initialize WebSocket server
  const wsServer = new PlanningPokerWebSocketServer(server);
  console.log("WebSocket server initialized");

  // Clean up stale sessions and rate-limit entries hourly
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    const TTL = 24 * 60 * 60 * 1000;
    for (const roomId of sessionStorage.getAllSessionIds()) {
      const session = sessionStorage.getSession(roomId);
      if (session && now - session.lastActivity > TTL) {
        const hasConnected = session.participants.some(p => p.isConnected);
        if (!hasConnected) {
          sessionStorage.deleteSession(roomId);
          console.log(`Cleaned up stale session: ${roomId}`);
        }
      }
    }
    // Purge expired rate-limit entries
    for (const [ip, entry] of sessionCreationRateLimit) {
      if (now - entry.windowStart > SESSION_RATE_WINDOW_MS) {
        sessionCreationRateLimit.delete(ip);
      }
    }
  }, 60 * 60 * 1000);

  // Graceful shutdown
  const shutdown = () => {
    console.log("Shutting down gracefully...");
    clearInterval(cleanupInterval);
    wsServer.close();
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
    // Backstop: force exit if server.close() hangs
    setTimeout(() => {
      console.error("Shutdown timed out, forcing exit");
      process.exit(1);
    }, 10_000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server on ws://${hostname}:${port}/ws`);
  });
});
