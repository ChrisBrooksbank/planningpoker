# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Dev server (tsx watch server/index.ts)
npm run build            # Next.js build + compile server to dist/
npm run start            # Production: node dist/server/index.js
npm test                 # Vitest watch mode
npm run test:run         # Vitest single run
npm run test:coverage    # Coverage with v8
npm run lint             # ESLint
npm run format           # Prettier
npm run typecheck        # tsc --noEmit
npm run check            # All checks: typecheck + lint + format + test:run
npx vitest run __tests__/server/sessionStorage.test.ts  # Run single test file
```

## Architecture

This is a real-time Planning Poker app. The key architectural decision is a **custom Node.js HTTP server** that wraps Next.js and adds WebSocket support on the same port.

### Server layer (`server/`)

- `server/index.ts` — Entry point. Creates HTTP server, initializes Next.js via `next()`, intercepts session API routes (`/api/sessions`), then falls through to Next.js for everything else. Sets up `PlanningPokerWebSocketServer` on the same server.
- `server/websocket.ts` — `PlanningPokerWebSocketServer` class. Manages WebSocket connections at `/ws?roomId=X&userId=Y`. Handles message routing, room-based broadcasting, heartbeat (30s ping/pong), rate limiting, and reconnection. Supports multiple connections per user (multiple tabs).
- `server/sessionStorage.ts` — In-memory singleton (via `globalThis`) storing all session state: participants, votes, statistics, round history. Shared between custom server routes and Next.js API routes. No database.

### Shared code (`lib/`)

- `lib/types.ts` — Domain types (Session, Participant, Vote, VoteStatistics)
- `lib/websocket-messages.ts` — Client/server message types and type guards for the WebSocket protocol
- `lib/hooks/useWebSocket.ts` — React hook for WebSocket connection with exponential backoff reconnection

### Client (`app/`, `components/`)

- Next.js App Router. The session page (`app/session/[roomId]/page.tsx`) is the main interactive view — it uses `useWebSocket` hook and manages all real-time state with local `useState`.

## Critical: Dual TypeScript Configs

The project has two TypeScript configs because server code must compile to Node.js ESM while Next.js uses its own bundler:

- **`tsconfig.json`** — Next.js build. `module: "esnext"`, `moduleResolution: "bundler"`.
- **`tsconfig.server.json`** — Server build. `module: "nodenext"`. Compiles `server/` and select `lib/` files to `dist/`.

**Import convention:** Files in `server/` and `lib/websocket-messages.ts` use `.js` extensions on relative imports (e.g., `import { sessionStorage } from "./sessionStorage.js"`). This is required for Node.js ESM resolution. The `next.config.ts` has `webpack.resolve.extensionAlias` mapping `.js` → `.ts` so Next.js webpack can also resolve these imports.

## Formatting

- Prettier: double quotes, semicolons, trailing commas (es5), 80 char width
- ESLint: `next/core-web-vitals` + `next/typescript` + `prettier`. Unused vars with `_` prefix are allowed.
