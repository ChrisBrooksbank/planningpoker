# Real-Time Sync

## Overview

All session state is synchronized across participants in real-time via WebSockets.

## User Stories

- As a participant, I want to see updates instantly so that I don't need to refresh the page
- As a participant, I want to reconnect automatically if my connection drops
- As a moderator, I want actions (reveal, new round) to propagate immediately to all participants

## Requirements

- [ ] WebSocket server running alongside the Next.js app
- [ ] Client establishes WebSocket connection on joining a session
- [ ] Server broadcasts state changes to all participants in a room
- [ ] Handle connection drops with automatic reconnection (with backoff)
- [ ] Sync the following state in real-time:
  - Participant list (join/leave)
  - Vote submissions (hidden values, just "has voted" status)
  - Vote reveals (all values visible)
  - New round starts (clear votes)
  - Topic changes
- [ ] Server is the source of truth for all session state
- [ ] Message protocol uses JSON with a `type` field for routing

## Acceptance Criteria

- [ ] Actions appear on other clients within 500ms
- [ ] Disconnected clients reconnect automatically
- [ ] Reconnected clients receive current session state
- [ ] No data races when multiple participants act simultaneously
- [ ] WebSocket server handles multiple rooms independently

## Out of Scope

- Horizontal scaling (single server instance is fine)
- Message persistence or replay beyond reconnection
- End-to-end encryption
