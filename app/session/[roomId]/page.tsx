"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import type { ServerMessage } from "@/lib/websocket-messages";
import { ParticipantList } from "@/components/ParticipantList";
import { CardDeck } from "@/components/CardDeck";
import { VoteResults } from "@/components/VoteResults";
import type { Participant, CardValue, Vote, VoteStatistics } from "@/lib/types";
import { isValidTopic } from "@/lib/utils";

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [userId, setUserId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardValue | null>(null);
  const [votedUserIds, setVotedUserIds] = useState<Set<string>>(new Set());
  const [currentTopic, setCurrentTopic] = useState<string>("");
  const [topicInput, setTopicInput] = useState<string>("");
  const [moderatorId, setModeratorId] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [revealedVotes, setRevealedVotes] = useState<Record<string, Vote>>({});
  const [statistics, setStatistics] = useState<VoteStatistics | null>(null);
  const hasJoinedRef = useRef(false);

  // Initialize userId and participantName from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem(`session_${roomId}_userId`);
    const storedName = localStorage.getItem(`session_${roomId}_name`);
    if (!storedUserId || !storedName) {
      // No userId or name found, redirect to home
      router.push("/");
      return;
    }
    setUserId(storedUserId);
    setParticipantName(storedName);
    setIsInitialized(true);
  }, [roomId, router]);

  // Handle WebSocket messages
  const handleMessage = (message: ServerMessage) => {
    console.log("Received message:", message);

    switch (message.type) {
      case "session-state":
        // Update participants from session state
        setParticipants(message.participants);
        // Update moderator ID and current topic
        setModeratorId(message.moderatorId);
        setCurrentTopic(message.currentTopic || "");
        setTopicInput(message.currentTopic || "");
        // Update reveal state
        setIsRevealed(message.isRevealed);
        break;

      case "participant-joined":
        // Add new participant to the list
        setParticipants((prev) => {
          // Avoid duplicates
          if (prev.some((p) => p.id === message.participant.id)) {
            return prev;
          }
          return [...prev, message.participant];
        });
        break;

      case "participant-left":
        // Mark participant as disconnected instead of removing
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === message.userId ? { ...p, isConnected: false } : p
          )
        );
        break;

      case "vote-submitted":
        // Track which users have voted (without revealing values)
        setVotedUserIds((prev) => new Set(prev).add(message.userId));
        break;

      case "topic-changed":
        // Update the current topic when moderator changes it
        setCurrentTopic(message.topic);
        setTopicInput(message.topic);
        break;

      case "votes-revealed":
        // Update reveal state when votes are revealed
        setIsRevealed(true);
        setRevealedVotes(message.votes);
        setStatistics(message.statistics);
        break;

      case "round-started":
        // Reset UI state for new voting round
        setIsRevealed(false);
        setRevealedVotes({});
        setStatistics(null);
        setSelectedCard(null);
        setVotedUserIds(new Set());
        break;

      default:
        // Other message types will be handled in future tasks
        break;
    }
  };

  // Handle card selection and vote submission
  const handleSelectCard = (value: CardValue) => {
    setSelectedCard(value);
    sendMessage({
      type: "submit-vote",
      value,
    });
  };

  // Handle topic update (moderator only)
  const handleUpdateTopic = () => {
    if (!isValidTopic(topicInput)) {
      return;
    }
    sendMessage({
      type: "set-topic",
      topic: topicInput.trim(),
    });
  };

  // Handle reveal votes (moderator only)
  const handleRevealVotes = () => {
    sendMessage({
      type: "reveal-votes",
    });
  };

  // Handle new round (moderator only)
  const handleNewRound = () => {
    sendMessage({
      type: "new-round",
    });
  };

  // Check if current user is moderator
  const isModerator = userId === moderatorId;

  // Handle connection events
  const handleConnect = () => {
    console.log("Connected to session");
    // Reset join flag so we send join-session message on reconnection
    hasJoinedRef.current = false;
  };

  const handleDisconnect = () => {
    console.log("Disconnected from session");
  };

  const handleError = (error: Event) => {
    console.error("WebSocket error:", error);
  };

  // Setup WebSocket connection
  const {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    reconnect,
    clearError,
  } = useWebSocket({
    roomId,
    userId: userId || "",
    onMessage: handleMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onError: handleError,
  });

  // Send join-session message when connected
  useEffect(() => {
    if (isConnected && participantName && !hasJoinedRef.current) {
      sendMessage({
        type: "join-session",
        participantName,
      });
      hasJoinedRef.current = true;
    }
  }, [isConnected, participantName, sendMessage]);

  // Don't render until we have a userId
  if (!isInitialized || !userId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Planning Poker</h1>
              <p className="text-sm text-muted-foreground">
                Room Code:{" "}
                <span className="font-mono font-semibold">{roomId}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  isConnected
                    ? "bg-green-500"
                    : isConnecting
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-red-500"
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {isConnected
                  ? "Connected"
                  : isConnecting
                    ? "Connecting..."
                    : "Disconnected"}
              </span>
              {!isConnected && !isConnecting && (
                <button
                  onClick={reconnect}
                  className="ml-2 text-sm text-primary hover:underline"
                >
                  Reconnect
                </button>
              )}
            </div>
          </div>

          {/* Error message banner */}
          {error && (
            <div className="mt-4 p-4 rounded-lg border border-red-500 bg-red-50 dark:bg-red-950/20 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="text-red-600 dark:text-red-400 mt-0.5">⚠️</div>
                <div>
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                    Connection Error
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {error}
                  </p>
                </div>
              </div>
              <button
                onClick={clearError}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-sm"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Main session content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Participant list */}
          <div className="lg:col-span-1">
            <ParticipantList
              participants={participants}
              currentUserId={userId}
              votedUserIds={votedUserIds}
            />
          </div>

          {/* Voting area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Topic section */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Current Topic</h2>
              {isModerator ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="Enter the story or topic to estimate..."
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    maxLength={200}
                    disabled={!isConnected}
                  />
                  <button
                    onClick={handleUpdateTopic}
                    disabled={!isConnected || !isValidTopic(topicInput)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update Topic
                  </button>
                </div>
              ) : (
                <div className="text-foreground">
                  {currentTopic || (
                    <span className="text-muted-foreground italic">
                      No topic set yet
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Card deck */}
            <div className="rounded-lg border border-border bg-card p-6">
              <CardDeck
                selectedValue={selectedCard}
                onSelectCard={handleSelectCard}
                disabled={!isConnected}
              />
            </div>

            {/* Moderator controls */}
            {isModerator && !isRevealed && (
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Moderator Controls
                </h2>
                <button
                  onClick={handleRevealVotes}
                  disabled={!isConnected}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  Reveal Votes
                </button>
              </div>
            )}

            {/* Vote results (shown after reveal) */}
            {isRevealed && statistics && (
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Results</h2>
                <VoteResults
                  votes={revealedVotes}
                  participants={participants}
                  statistics={statistics}
                />
              </div>
            )}

            {/* New Round button (moderator only, shown after reveal) */}
            {isModerator && isRevealed && (
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Moderator Controls
                </h2>
                <button
                  onClick={handleNewRound}
                  disabled={!isConnected}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  New Round
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
