import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server as HTTPServer } from "http";
import { sessionStorage } from "./sessionStorage.js";
import {
  isClientMessage,
} from "../lib/websocket-messages.js";
import type {
  ClientMessage,
  ServerMessage,
  JoinSessionMessage,
  SubmitVoteMessage,
  SetTopicMessage,
  RevealVotesMessage,
  NewRoundMessage,
  ToggleObserverMessage,
  SessionStateMessage,
} from "../lib/websocket-messages.js";
import { getDeckValues } from "../lib/types.js";
import type { Participant, Vote, CardValue } from "../lib/types.js";

export interface RoomClient {
  ws: WebSocket;
  roomId: string;
  userId: string;
  messageCount: number;
  messageWindowStart: number;
  isAlive: boolean;
}

export class PlanningPokerWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, RoomClient> = new Map();
  private roomClients: Map<string, Set<WebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ server, path: "/ws", maxPayload: 256 * 1024 });
    this.setupWebSocketServer();
    this.heartbeatInterval = setInterval(() => this.checkConnections(), 30000);
  }

  private addToRoomIndex(roomId: string, ws: WebSocket) {
    let set = this.roomClients.get(roomId);
    if (!set) {
      set = new Set();
      this.roomClients.set(roomId, set);
    }
    set.add(ws);
  }

  private removeFromRoomIndex(roomId: string, ws: WebSocket) {
    const set = this.roomClients.get(roomId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        this.roomClients.delete(roomId);
      }
    }
  }

  private handleClientDisconnect(ws: WebSocket, client: RoomClient) {
    this.clients.delete(ws);
    this.removeFromRoomIndex(client.roomId, ws);

    // Only mark disconnected if no other connection exists for this user in this room
    const hasOtherConnection = Array.from(this.clients.values()).some(
      c => c.userId === client.userId && c.roomId === client.roomId
    );
    if (!hasOtherConnection) {
      sessionStorage.markParticipantDisconnected(client.roomId, client.userId);
      this.broadcastToRoom(client.roomId, {
        type: "participant-left",
        userId: client.userId,
      });
    }
  }

  private checkConnections() {
    this.clients.forEach((client, ws) => {
      if (!client.isAlive) {
        this.handleClientDisconnect(ws, client);
        ws.terminate();
        return;
      }
      client.isAlive = false;
      ws.ping();
    });
  }

  private setupWebSocketServer() {
    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      // Extract room ID and user ID from query params
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const roomId = url.searchParams.get("roomId");
      const userId = url.searchParams.get("userId");

      if (!roomId || !userId) {
        ws.close(1008, "Missing roomId or userId");
        return;
      }

      if (!/^[A-Z0-9]{6}$/.test(roomId)) {
        ws.close(1008, "Invalid roomId format");
        return;
      }

      if (userId.length > 50) {
        ws.close(1008, "userId too long");
        return;
      }

      // Register client and mark as alive for heartbeat
      const client: RoomClient = { ws, roomId, userId, messageCount: 0, messageWindowStart: Date.now(), isAlive: true };
      this.clients.set(ws, client);
      this.addToRoomIndex(roomId, ws);

      // Track pong responses for heartbeat
      ws.on("pong", () => { client.isAlive = true; });

      // Handle messages
      ws.on("message", (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          if (!isClientMessage(message)) {
            this.sendError(ws, "INVALID_MESSAGE", "Unknown or invalid message type");
            return;
          }
          this.handleMessage(ws, message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
          this.sendError(ws, "PARSE_ERROR", "Invalid message format");
        }
      });

      // Handle disconnection
      ws.on("close", () => {
        const client = this.clients.get(ws);
        if (client) {
          this.handleClientDisconnect(ws, client);
        }
      });

      // Handle errors
      ws.on("error", (err) => {
        console.error(`WebSocket error for userId=${userId}, roomId=${roomId}:`, err);
      });

      // Send connection acknowledgment
      this.safeSend(
        ws,
        JSON.stringify({
          type: "connected",
          userId,
          roomId,
        })
      );
    });
  }

  private static readonly RATE_LIMIT_WINDOW_MS = 1000;
  private static readonly RATE_LIMIT_MAX_MESSAGES = 20;

  private handleMessage(ws: WebSocket, message: ClientMessage) {
    const client = this.clients.get(ws);
    if (!client) {
      return;
    }

    // Rate limiting
    const now = Date.now();
    if (now - client.messageWindowStart > PlanningPokerWebSocketServer.RATE_LIMIT_WINDOW_MS) {
      client.messageCount = 0;
      client.messageWindowStart = now;
    }
    client.messageCount++;
    if (client.messageCount > PlanningPokerWebSocketServer.RATE_LIMIT_MAX_MESSAGES) {
      this.sendError(ws, "RATE_LIMITED", "Too many messages, slow down");
      return;
    }

    // Route message based on type
    switch (message.type) {
      case "join-session":
        this.handleJoinSession(ws, client, message);
        break;
      case "submit-vote":
        this.handleSubmitVote(ws, client, message);
        break;
      case "set-topic":
        this.handleSetTopic(ws, client, message);
        break;
      case "reveal-votes":
        this.handleRevealVotes(ws, client, message);
        break;
      case "new-round":
        this.handleNewRound(ws, client, message);
        break;
      case "toggle-observer":
        this.handleToggleObserver(ws, client);
        break;
      default:
        this.sendError(ws, "UNKNOWN_MESSAGE_TYPE", "Unknown message type");
    }
  }

  /**
   * Handle join-session message
   */
  private handleJoinSession(
    ws: WebSocket,
    client: RoomClient,
    message: JoinSessionMessage
  ) {
    const { roomId, userId } = client;
    const { participantName } = message;

    // Validate participant name
    const trimmedName = typeof participantName === "string" ? participantName.trim() : "";
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      this.sendError(ws, "INVALID_NAME", "Name must be between 1 and 50 characters");
      return;
    }

    // Check if this is a reconnecting participant
    const existingSession = sessionStorage.getSession(roomId);
    const wasExisting = existingSession?.participants.some(p => p.id === userId) ?? false;

    // Add participant to session storage
    const participants = sessionStorage.addParticipant(
      roomId,
      userId,
      trimmedName
    );

    if (participants === "SESSION_FULL") {
      this.sendError(ws, "SESSION_FULL", "Session is full (max 50 participants)");
      ws.close(1008, "Session full");
      return;
    }

    if (!participants) {
      this.sendError(ws, "SESSION_NOT_FOUND", "Session does not exist");
      return;
    }

    // Send current session state to the joining client
    this.sendSessionState(ws, roomId);

    // Broadcast to participants that someone joined (or reconnected with updated name)
    const participant = participants.find((p) => p.id === userId);
    if (participant) {
      this.broadcastToRoom(
        roomId,
        {
          type: "participant-joined",
          participant,
        },
        wasExisting ? undefined : ws
      );
    }
  }

  /**
   * Handle submit-vote message
   */
  private handleSubmitVote(
    ws: WebSocket,
    client: RoomClient,
    message: SubmitVoteMessage
  ) {
    const { roomId, userId } = client;
    const { value } = message;

    const session = sessionStorage.getSession(roomId);
    if (!session) {
      this.sendError(ws, "SESSION_NOT_FOUND", "Session does not exist");
      return;
    }

    // Validate vote value against the session's deck values
    const deckValues = getDeckValues(session.session.deckType || "fibonacci");
    if (!deckValues.includes(value)) {
      this.sendError(ws, "INVALID_VOTE", "Invalid vote value");
      return;
    }

    // Reject votes when voting is not open
    if (!session.session.isVotingOpen) {
      this.sendError(ws, "VOTING_NOT_OPEN", "Voting is not open");
      return;
    }

    // Reject votes after reveal
    if (session.session.isRevealed) {
      this.sendError(ws, "VOTES_REVEALED", "Cannot vote after votes are revealed");
      return;
    }

    // Verify user is a participant
    const participant = session.participants.find(p => p.id === userId);
    if (!participant) {
      this.sendError(ws, "NOT_A_PARTICIPANT", "You must join the session before voting");
      return;
    }

    // Reject votes from observers
    if (participant.isObserver) {
      this.sendError(ws, "OBSERVER_CANNOT_VOTE", "Observers cannot vote");
      return;
    }

    // Submit vote to session storage
    const success = sessionStorage.submitVote(roomId, userId, value);

    if (success === "OBSERVER") {
      this.sendError(ws, "OBSERVER_CANNOT_VOTE", "Observers cannot vote");
      return;
    }

    if (!success) {
      this.sendError(ws, "VOTE_FAILED", "Failed to submit vote");
      return;
    }

    // Broadcast to all participants that someone voted (without revealing the value)
    this.broadcastToRoom(roomId, {
      type: "vote-submitted",
      userId,
      hasVoted: true,
    });
  }

  /**
   * Handle set-topic message
   */
  private handleSetTopic(
    ws: WebSocket,
    client: RoomClient,
    message: SetTopicMessage
  ) {
    const { roomId, userId } = client;
    const { topic } = message;

    // Validate topic
    if (typeof topic !== "string") {
      this.sendError(ws, "INVALID_TOPIC", "Topic must be a string");
      return;
    }

    const trimmedTopic = topic.trim();

    if (trimmedTopic.length > 200) {
      this.sendError(ws, "INVALID_TOPIC", "Topic must be 200 characters or fewer");
      return;
    }

    // Verify user is moderator
    const session = sessionStorage.getSession(roomId);
    if (!session) {
      this.sendError(ws, "SESSION_NOT_FOUND", "Session does not exist");
      return;
    }

    if (session.session.moderatorId !== userId) {
      this.sendError(ws, "UNAUTHORIZED", "Only moderator can set topic");
      return;
    }

    // Set topic in session storage
    sessionStorage.setTopic(roomId, trimmedTopic);

    // Broadcast to all participants
    this.broadcastToRoom(roomId, {
      type: "topic-changed",
      topic: trimmedTopic,
    });
  }

  /**
   * Handle reveal-votes message
   */
  private handleRevealVotes(
    ws: WebSocket,
    client: RoomClient,
    message: RevealVotesMessage
  ) {
    const { roomId, userId } = client;

    // Verify user is moderator
    const session = sessionStorage.getSession(roomId);
    if (!session) {
      this.sendError(ws, "SESSION_NOT_FOUND", "Session does not exist");
      return;
    }

    if (session.session.moderatorId !== userId) {
      this.sendError(ws, "UNAUTHORIZED", "Only moderator can reveal votes");
      return;
    }

    if (session.session.isRevealed) {
      return;
    }

    // Reveal votes and calculate statistics
    const statistics = sessionStorage.revealVotes(roomId);

    if (!statistics) {
      this.sendError(ws, "REVEAL_FAILED", "Failed to reveal votes");
      return;
    }

    // Get all votes
    const votesMap = sessionStorage.getVotes(roomId);
    if (!votesMap) {
      this.sendError(ws, "SESSION_NOT_FOUND", "Session does not exist");
      return;
    }

    // Convert Map to Record for JSON serialization
    const votes: Record<string, Vote> = {};
    votesMap.forEach((vote, userId) => {
      votes[userId] = vote;
    });

    // Broadcast to all participants
    this.broadcastToRoom(roomId, {
      type: "votes-revealed",
      votes,
      statistics,
    });
  }

  /**
   * Handle new-round message
   */
  private handleNewRound(
    ws: WebSocket,
    client: RoomClient,
    message: NewRoundMessage
  ) {
    const { roomId, userId } = client;

    // Verify user is moderator
    const session = sessionStorage.getSession(roomId);
    if (!session) {
      this.sendError(ws, "SESSION_NOT_FOUND", "Session does not exist");
      return;
    }

    if (session.session.moderatorId !== userId) {
      this.sendError(ws, "UNAUTHORIZED", "Only moderator can start new round");
      return;
    }

    // Start new round in session storage
    sessionStorage.startNewRound(roomId);

    // Get updated session for round history
    const updatedSession = sessionStorage.getSession(roomId);

    // Broadcast to all participants
    this.broadcastToRoom(roomId, {
      type: "round-started",
      roundHistory: updatedSession?.roundHistory || [],
    });
  }

  /**
   * Handle toggle-observer message
   */
  private handleToggleObserver(ws: WebSocket, client: RoomClient) {
    const { roomId, userId } = client;

    const result = sessionStorage.toggleObserver(roomId, userId);
    if (result === null) {
      this.sendError(ws, "TOGGLE_FAILED", "Failed to toggle observer status");
      return;
    }

    // Broadcast to all participants
    this.broadcastToRoom(roomId, {
      type: "observer-toggled",
      userId,
      isObserver: result,
    });
  }

  /**
   * Send current session state to a client
   */
  private sendSessionState(ws: WebSocket, roomId: string) {
    const session = sessionStorage.getSession(roomId);
    if (!session) {
      this.sendError(ws, "SESSION_NOT_FOUND", "Session does not exist");
      return;
    }

    // Build votes object (hide values if not revealed)
    const votes: Record<string, { hasVoted: boolean; value?: CardValue }> = {};
    session.votes.forEach((vote, userId) => {
      votes[userId] = {
        hasVoted: true,
        value: session.session.isRevealed ? vote.value : undefined,
      };
    });

    const stateMessage: SessionStateMessage = {
      type: "session-state",
      sessionId: session.session.id,
      sessionName: session.session.name,
      moderatorId: session.session.moderatorId,
      currentTopic: session.session.currentTopic,
      isRevealed: session.session.isRevealed,
      isVotingOpen: session.session.isVotingOpen,
      deckType: session.session.deckType || "fibonacci",
      participants: session.participants,
      votes,
      statistics: session.session.isRevealed
        ? session.statistics || undefined
        : undefined,
      roundHistory: session.roundHistory || [],
    };

    this.safeSend(ws, JSON.stringify(stateMessage));
  }

  /**
   * Safely send a message, checking readyState and catching errors
   */
  private safeSend(ws: WebSocket, data: string): boolean {
    if (ws.readyState !== 1) return false; // 1 = OPEN
    try {
      ws.send(data);
      return true;
    } catch (err) {
      console.error("Failed to send WebSocket message:", err);
      return false;
    }
  }

  /**
   * Send an error message to a client
   */
  private sendError(ws: WebSocket, code: string, message: string) {
    this.safeSend(
      ws,
      JSON.stringify({
        type: "error",
        code,
        message,
      })
    );
  }

  /**
   * Broadcast a message to all clients in a specific room
   * @param roomId - The room to broadcast to
   * @param message - The message to send
   * @param exclude - Optional WebSocket to exclude from broadcast (e.g., sender)
   */
  public broadcastToRoom(
    roomId: string,
    message: ServerMessage,
    exclude?: WebSocket
  ) {
    const messageStr = JSON.stringify(message);
    const roomSet = this.roomClients.get(roomId);
    if (!roomSet) return;

    for (const ws of roomSet) {
      if (ws !== exclude) {
        this.safeSend(ws, messageStr);
      }
    }
  }

  /**
   * Send a message to a specific user
   * @param userId - The user to send to
   * @param roomId - The room context
   * @param message - The message to send
   */
  public sendToUser(userId: string, roomId: string, message: ServerMessage) {
    const messageStr = JSON.stringify(message);

    this.clients.forEach((client, ws) => {
      if (client.userId === userId && client.roomId === roomId) {
        this.safeSend(ws, messageStr);
      }
    });
  }

  /**
   * Get all connected users in a room
   * @param roomId - The room to query
   * @returns Array of user IDs
   */
  public getRoomUsers(roomId: string): string[] {
    const users: string[] = [];
    this.clients.forEach((client) => {
      if (client.roomId === roomId) {
        users.push(client.userId);
      }
    });
    return users;
  }

  /**
   * Shut down the WebSocket server and clear the heartbeat interval
   */
  public close() {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
  }

  /**
   * Check if a user is connected to a room
   * @param userId - The user to check
   * @param roomId - The room to check
   * @returns True if connected
   */
  public isUserConnected(userId: string, roomId: string): boolean {
    for (const client of this.clients.values()) {
      if (client.userId === userId && client.roomId === roomId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Disconnect a specific user from a room
   * @param userId - The user to disconnect
   * @param roomId - The room context
   */
  public disconnectUser(userId: string, roomId: string) {
    const toDisconnect: WebSocket[] = [];
    this.clients.forEach((client, ws) => {
      if (client.userId === userId && client.roomId === roomId) {
        toDisconnect.push(ws);
      }
    });
    for (const ws of toDisconnect) {
      this.clients.delete(ws);
      this.removeFromRoomIndex(roomId, ws);
      ws.close();
    }
  }
}
