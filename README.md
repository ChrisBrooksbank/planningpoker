# Planning Poker

Real-time collaborative story point estimation application built with Next.js and WebSockets.

## Tech Stack

- **Next.js 15** (App Router) - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling with dark mode support
- **WebSockets (ws)** - Real-time communication
- **Vitest** - Testing framework

## Project Structure

```
├── app/              # Next.js App Router pages and layouts
├── components/       # Reusable React components
├── lib/             # Shared utilities, types, and constants
├── server/          # WebSocket server and backend logic
├── __tests__/       # Test files
└── specs/           # Feature specifications
```

## Getting Started

### Development

```bash
npm install
npm run dev
```

Server runs at:

- **Next.js**: http://localhost:3000
- **WebSocket**: ws://localhost:3000/ws

### Testing

```bash
npm test              # Watch mode
npm run test:run      # Run once
npm run test:coverage # With coverage
```

### Validation

```bash
npm run check         # Run all checks (typecheck, lint, format, tests)
```

Before committing, always run `npm run check` to ensure all validation passes.

## Features

- Create and join planning poker sessions with unique room codes
- Real-time voting synchronization via WebSockets
- Moderator controls (reveal votes, start new rounds, set topics)
- Vote statistics (average, mode, range)
- Dark mode support
- Mobile-friendly responsive design

## Development Workflow

See `AGENTS.md` for detailed operational commands and project notes.

## Architecture

- **Server-side state management**: All session state lives in server memory
- **WebSocket protocol**: JSON messages with type-based routing
- **Real-time sync**: Updates propagate to all clients within 500ms
- **No database**: MVP uses in-memory storage

## License

MIT
