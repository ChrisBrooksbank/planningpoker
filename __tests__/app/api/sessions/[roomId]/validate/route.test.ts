import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/sessions/[roomId]/validate/route";
import { sessionStorage } from "@/server/sessionStorage";

describe("GET /api/sessions/[roomId]/validate", () => {
  beforeEach(() => {
    // Clear all sessions before each test
    sessionStorage.getAllSessionIds().forEach((id) => {
      sessionStorage.deleteSession(id);
    });
  });

  it("returns 200 when session exists", async () => {
    // Create a test session
    sessionStorage.createSession("Test Session", "mod123", "Moderator");
    const roomId = sessionStorage.getAllSessionIds()[0];

    const request = new NextRequest(
      "http://localhost/api/sessions/123/validate"
    );
    const params = Promise.resolve({ roomId });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ exists: true });
  });

  it("returns 404 when session does not exist", async () => {
    const request = new NextRequest(
      "http://localhost/api/sessions/NONEXISTENT/validate"
    );
    const params = Promise.resolve({ roomId: "NONEXISTENT" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty("error");
    expect(data.error).toBe("Session not found");
  });

  it("returns 400 when roomId is missing", async () => {
    const request = new NextRequest("http://localhost/api/sessions//validate");
    const params = Promise.resolve({ roomId: "" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty("error");
    expect(data.error).toBe("Room ID is required");
  });

  it("handles multiple concurrent validation requests", async () => {
    // Create test sessions
    sessionStorage.createSession("Session 1", "mod1", "Moderator 1");
    sessionStorage.createSession("Session 2", "mod2", "Moderator 2");
    const sessionIds = sessionStorage.getAllSessionIds();

    const request1 = new NextRequest(
      `http://localhost/api/sessions/${sessionIds[0]}/validate`
    );
    const request2 = new NextRequest(
      `http://localhost/api/sessions/${sessionIds[1]}/validate`
    );
    const request3 = new NextRequest(
      "http://localhost/api/sessions/INVALID/validate"
    );

    const params1 = Promise.resolve({ roomId: sessionIds[0] });
    const params2 = Promise.resolve({ roomId: sessionIds[1] });
    const params3 = Promise.resolve({ roomId: "INVALID" });

    const [response1, response2, response3] = await Promise.all([
      GET(request1, { params: params1 }),
      GET(request2, { params: params2 }),
      GET(request3, { params: params3 }),
    ]);

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response3.status).toBe(404);
  });
});
