# WebSocket Server

This directory contains the WebSocket server implementation for the Planning Poker app.

## Architecture

The server runs alongside Next.js using a custom HTTP server. This allows WebSocket connections to share the same port as the Next.js app.

### Files

- `index.ts` - Custom server that integrates Next.js with WebSocket server
- `websocket.ts` - WebSocket server implementation with room-based broadcasting
- `types.d.ts` - TypeScript type declarations for global WebSocket server

## WebSocket Protocol

### Connection

Clients connect to `ws://localhost:3000/ws` with query parameters:

- `roomId` - The session/room identifier
- `userId` - The unique user identifier

Example: `ws://localhost:3000/ws?roomId=abc123&userId=user-xyz`

### Messages

All messages are JSON with a `type` field for routing:

```json
{
  "type": "message-type",
  "...": "additional fields"
}
```

### Connection Lifecycle

1. Client connects with roomId and userId
2. Server sends `connected` acknowledgment
3. Client sends/receives messages
4. On disconnect, server broadcasts `participant-left` to room

## API

### PlanningPokerWebSocketServer

#### Methods

- `broadcastToRoom(roomId, message, exclude?)` - Send message to all clients in a room
- `sendToUser(userId, roomId, message)` - Send message to a specific user
- `getRoomUsers(roomId)` - Get array of user IDs in a room
- `isUserConnected(userId, roomId)` - Check if a user is connected
- `disconnectUser(userId, roomId)` - Forcibly disconnect a user

## Development

The server is automatically started with `npm run dev` and uses `tsx watch` for hot reloading.

## Testing

Tests are in `__tests__/websocket.test.ts` and use the `ws` library to create test clients.

Run tests: `npm test`
