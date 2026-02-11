import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "../../app/api/sessions/route";
import { sessionStorage } from "../../server/sessionStorage";

describe("POST /api/sessions", () => {
  beforeEach(() => {
    // Clear all sessions before each test
    const sessionIds = sessionStorage.getAllSessionIds();
    sessionIds.forEach((id) => sessionStorage.deleteSession(id));
  });

  it("should create a session with valid inputs", async () => {
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        sessionName: "Sprint Planning",
        moderatorName: "Alice",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.roomId).toBeDefined();
    expect(data.roomId).toHaveLength(6);
    expect(data.sessionName).toBe("Sprint Planning");
    expect(data.moderatorId).toBeDefined();
  });

  it("should generate unique room codes for multiple sessions", async () => {
    const roomIds = new Set<string>();

    for (let i = 0; i < 10; i++) {
      const request = new Request("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          sessionName: `Session ${i}`,
          moderatorName: `User ${i}`,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      roomIds.add(data.roomId);
    }

    // All room codes should be unique
    expect(roomIds.size).toBe(10);
  });

  it("should store the session in session storage", async () => {
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        sessionName: "Test Session",
        moderatorName: "Bob",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    // Verify session exists in storage
    const session = sessionStorage.getSession(data.roomId);
    expect(session).toBeDefined();
    expect(session?.session.name).toBe("Test Session");
    expect(session?.session.id).toBe(data.roomId);
  });

  it("should return 400 if session name is missing", async () => {
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        moderatorName: "Alice",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Session name is required");
  });

  it("should return 400 if session name is not a string", async () => {
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        sessionName: 123,
        moderatorName: "Alice",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Session name is required");
  });

  it("should return 400 if moderator name is missing", async () => {
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        sessionName: "Test Session",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Moderator name is required");
  });

  it("should return 400 if moderator name is not a string", async () => {
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        sessionName: "Test Session",
        moderatorName: 456,
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Moderator name is required");
  });

  it("should create session with moderator as first participant", async () => {
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        sessionName: "Team Retro",
        moderatorName: "Charlie",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    const session = sessionStorage.getSession(data.roomId);
    expect(session?.participants).toHaveLength(1);
    expect(session?.participants[0].name).toBe("Charlie");
    expect(session?.participants[0].isModerator).toBe(true);
    expect(session?.participants[0].isConnected).toBe(true);
  });

  it("should set moderatorId correctly in session", async () => {
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        sessionName: "Daily Standup",
        moderatorName: "Diana",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    const session = sessionStorage.getSession(data.roomId);
    expect(session?.session.moderatorId).toBe(data.moderatorId);
    expect(session?.participants[0].id).toBe(data.moderatorId);
  });
});
