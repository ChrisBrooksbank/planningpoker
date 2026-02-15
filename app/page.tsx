"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  isValidSessionName,
  isValidParticipantName,
  isValidRoomCode,
} from "@/lib/utils";
import { nanoid } from "nanoid";

export default function Home() {
  const [mode, setMode] = useState<"landing" | "create" | "join">("landing");
  const [sessionName, setSessionName] = useState("");
  const [moderatorName, setModeratorName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCreateSession = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate inputs
    if (!isValidSessionName(sessionName)) {
      setError("Room name must be between 1 and 100 characters");
      return;
    }

    if (!isValidParticipantName(moderatorName)) {
      setError("Your name must be between 1 and 50 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionName: sessionName.trim(),
          moderatorName: moderatorName.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to create session");
        return;
      }

      const data = await response.json();
      // Redirect to session page with moderator ID stored in localStorage
      localStorage.setItem(`session_${data.roomId}_userId`, data.moderatorId);
      localStorage.setItem(`session_${data.roomId}_name`, moderatorName.trim());
      router.push(`/session/${data.roomId}`);
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Error creating session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSession = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate inputs
    const trimmedCode = roomCode.trim().toUpperCase();
    if (!isValidRoomCode(trimmedCode)) {
      setError("Room code must be 6 characters");
      return;
    }

    if (!isValidParticipantName(participantName)) {
      setError("Your name must be between 1 and 50 characters");
      return;
    }

    setIsLoading(true);

    try {
      // First, validate that the room exists
      const validateResponse = await fetch(
        `/api/sessions/${trimmedCode}/validate`
      );

      if (!validateResponse.ok) {
        if (validateResponse.status === 404) {
          setError("Room code not found. Please check and try again.");
        } else {
          setError("Failed to validate room code");
        }
        return;
      }

      // Room exists, generate a participant ID and navigate to session
      const participantId = nanoid();
      localStorage.setItem(`session_${trimmedCode}_userId`, participantId);
      localStorage.setItem(`session_${trimmedCode}_name`, participantName.trim());

      router.push(`/session/${trimmedCode}`);
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Error joining session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "landing") {
    return (
      <main id="main-content" className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Planning Poker</h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Real-time collaborative story point estimation
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setMode("create")}
              className="w-full rounded-lg bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Create Room
            </button>

            <button
              onClick={() => setMode("join")}
              className="w-full rounded-lg border-2 border-border bg-card px-6 py-4 text-lg font-semibold text-card-foreground hover:bg-muted transition-colors"
            >
              Join Room
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (mode === "create") {
    return (
      <main id="main-content" className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <button
            onClick={() => {
              setMode("landing");
              setError("");
              setSessionName("");
              setModeratorName("");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoading}
            aria-label="Back to home"
          >
            ← Back
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Create Room</h1>
            <p className="text-sm text-muted-foreground">
              Start a new planning poker room
            </p>
          </div>

          <form onSubmit={handleCreateSession} className="space-y-4">
            <div>
              <label
                htmlFor="sessionName"
                className="block text-sm font-medium mb-2"
              >
                Room Name
              </label>
              <input
                id="sessionName"
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Sprint 24 Planning"
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={100}
                disabled={isLoading}
                required
                aria-describedby={error ? "formError" : undefined}
                aria-invalid={!!error}
              />
            </div>

            <div>
              <label
                htmlFor="moderatorName"
                className="block text-sm font-medium mb-2"
              >
                Your Name
              </label>
              <input
                id="moderatorName"
                type="text"
                value={moderatorName}
                onChange={(e) => setModeratorName(e.target.value)}
                placeholder="e.g., John Doe"
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={50}
                disabled={isLoading}
                required
                aria-describedby={error ? "formError" : undefined}
                aria-invalid={!!error}
              />
            </div>

            {error && (
              <div id="formError" role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary px-6 py-3 text-lg font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Room"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Join mode
  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <button
          onClick={() => {
            setMode("landing");
            setError("");
            setRoomCode("");
            setParticipantName("");
          }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          disabled={isLoading}
          aria-label="Back to home"
        >
          ← Back
        </button>

        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Join Room</h1>
          <p className="text-sm text-muted-foreground">
            Enter the room code to join
          </p>
        </div>

        <form onSubmit={handleJoinSession} className="space-y-4">
          <div>
            <label
              htmlFor="roomCode"
              className="block text-sm font-medium mb-2"
            >
              Room Code
            </label>
            <input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g., ABC123"
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring uppercase"
              maxLength={6}
              disabled={isLoading}
              required
              aria-describedby={error ? "formError" : undefined}
              aria-invalid={!!error}
            />
          </div>

          <div>
            <label
              htmlFor="participantName"
              className="block text-sm font-medium mb-2"
            >
              Your Name
            </label>
            <input
              id="participantName"
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="e.g., Jane Smith"
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={50}
              disabled={isLoading}
              required
              aria-describedby={error ? "formError" : undefined}
              aria-invalid={!!error}
            />
          </div>

          {error && (
            <div id="formError" role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary px-6 py-3 text-lg font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Joining..." : "Join Room"}
          </button>
        </form>
      </div>
    </main>
  );
}
