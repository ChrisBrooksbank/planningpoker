# Real-Time Sync

## Overview

All session state is synchronized across participants in real-time via WebSockets.

## User Stories

- As a participant, I want to see updates instantly so that I don't need to refresh the page
- As a participant, I want to reconnect automatically if my connection drops
- As a moderator, I want actions (reveal, new round) to propagate immediately to all participants

## Requirements

- [x] WebSocket server running alongside the Next.js app
- [x] Client establishes WebSocket connection on joining a session
- [x] Server broadcasts state changes to all participants in a room
- [x] Handle connection drops with automatic reconnection (with backoff)
- [x] Sync the following state in real-time:
  - Participant list (join/leave)
  - Vote submissions (hidden values, just "has voted" status)
  - Vote reveals (all values visible)
  - New round starts (clear votes)
  - Topic changes
  - Observer mode toggle
- [x] Server is the source of truth for all session state
- [x] Message protocol uses JSON with a `type` field for routing
- [x] Heartbeat mechanism: 30-second ping/pong to detect stale connections
- [x] WebSocket rate limiting: max 20 messages per 1000ms per client

## Acceptance Criteria

- [x] Actions appear on other clients within 500ms
- [x] Disconnected clients reconnect automatically
- [x] Reconnected clients receive current session state
- [x] No data races when multiple participants act simultaneously
- [x] WebSocket server handles multiple rooms independently

## Out of Scope

- Horizontal scaling (single server instance is fine)
- Message persistence or replay beyond reconnection
- End-to-end encryption
