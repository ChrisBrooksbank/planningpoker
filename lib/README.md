# lib/

Shared utilities, types, and constants for the Planning Poker application.

## Files

- **types.ts** - TypeScript interfaces and types for sessions, participants, votes, and statistics
- **constants.ts** - Application-wide constants (WebSocket config, validation limits, performance requirements)
- **utils.ts** - Utility functions for validation, class name merging, and data processing
- **websocket-messages.ts** - WebSocket message type definitions and factories
- **hooks/useWebSocket.ts** - React hook for WebSocket connection with exponential backoff reconnection

## Usage

Import shared types and utilities using the `@/lib` path alias:

```typescript
import { type Session, type Participant } from "@/lib/types";
import { ROOM_CODE_LENGTH } from "@/lib/constants";
import { cn, isValidRoomCode } from "@/lib/utils";
```
