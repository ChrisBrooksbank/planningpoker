# AGENTS.md - Operational Guide

Keep this file under 60 lines. It's loaded every iteration.

## Tech Stack

- Next.js (App Router)
- TypeScript
- WebSockets (ws library for real-time)
- Vitest for testing

## Build Commands

```bash
npm run build          # Production build
npm run dev            # Development server
```

## Test Commands

```bash
npm test               # Run tests (watch mode)
npm run test:run       # Run tests once
npm run test:coverage  # Coverage report
```

## Lint/Format

```bash
npm run lint           # ESLint
npm run format         # Prettier
npm run typecheck      # TypeScript type checking
```

## Validation (run before committing)

```bash
npm run check          # Run ALL checks (typecheck, lint, format, tests)
```

## Project Notes

- Planning Poker real-time estimation app
- WebSocket server runs alongside Next.js
- Each poker session is a "room" with a unique ID
- Participants join rooms, submit estimates, moderator reveals
