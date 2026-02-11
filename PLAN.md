# Planning Poker Web App - Implementation Plan

## Context

Create a modern planning poker web app inspired by pointingpoker.com but with significant UX and feature improvements. The current codebase is an empty git repo. We're building from scratch.

**pointingpoker.com** is a free, no-signup planning poker tool where agile teams create sessions, vote on story estimates with cards, and reveal results simultaneously. Our version improves on it with a modern UI, better animations, more features, and no ads.

## Tech Stack

- **Framework:** Next.js 14+ (App Router) + TypeScript
- **Real-time:** Firebase Firestore (real-time listeners via `onSnapshot`)
- **Styling:** Tailwind CSS with dark mode (`class` strategy)
- **Animations:** Motion (Framer Motion) for card flips, reveals, transitions
- **State:** Zustand (selective re-renders, persist middleware for settings)
- **IDs:** nanoid for room IDs and anonymous session IDs
- **Extras:** canvas-confetti, use-sound, clsx + tailwind-merge

## Firebase Data Model

```
rooms/{roomId}
  ├── name, createdAt, createdBy (session ID of moderator)
  ├── deckType: "fibonacci" | "tshirt" | "powers2" | "custom"
  ├── customDeck: string[] | null
  ├── currentRound: number
  ├── status: "voting" | "revealed" | "idle"
  ├── storyTitle: string
  ├── timerEnabled, timerDuration, timerStartedAt
  ├── settings: { allowObservers, autoRevealOnAllVoted }
  │
  ├── players/{sessionId}
  │     ├── name, role ("voter"|"observer"|"moderator")
  │     ├── isOnline, lastSeen, currentVote, joinedAt
  │
  └── rounds/{roundNumber}
        ├── storyTitle, startedAt, revealedAt
        ├── votes: { [sessionId]: string }
        └── statistics: { average, median, mode, distribution, consensus }
```

Players and rounds are **subcollections** (not nested maps) so each gets its own real-time listener, reducing bandwidth and re-renders.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout, ThemeProvider, fonts
│   ├── page.tsx                # Landing page (SSR): hero + create room
│   ├── globals.css
│   ├── room/[roomId]/
│   │   ├── page.tsx            # Room game page (client-side)
│   │   └── loading.tsx         # Suspense fallback
│   └── api/room/route.ts      # POST: create room (Admin SDK)
├── lib/
│   ├── firebase/
│   │   ├── config.ts           # Client SDK init
│   │   └── admin.ts            # Admin SDK (API routes only)
│   ├── room/
│   │   ├── types.ts            # Room, Player, Round interfaces
│   │   ├── constants.ts        # Deck definitions
│   │   ├── actions.ts          # CRUD: createRoom, joinRoom, castVote, reveal, reset
│   │   ├── listeners.ts        # onSnapshot listener setup
│   │   └── utils.ts            # Statistics, consensus detection
│   ├── hooks/
│   │   ├── useRoom.ts          # Subscribe to room doc
│   │   ├── usePlayers.ts       # Subscribe to players subcollection
│   │   ├── useRounds.ts        # Subscribe to rounds subcollection
│   │   ├── useVote.ts          # Cast/change vote
│   │   ├── useTimer.ts         # Countdown synced via Firestore timestamp
│   │   ├── useSession.ts       # Anonymous session ID (localStorage)
│   │   └── useSound.ts         # Sound wrapper
│   ├── stores/
│   │   ├── roomStore.ts        # Zustand: room, players, rounds
│   │   └── settingsStore.ts    # Zustand + persist: theme, sound
│   └── utils/
│       ├── statistics.ts       # mean, median, mode, distribution
│       └── cn.ts               # clsx + tailwind-merge
├── components/
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── CreateRoomForm.tsx  # Deck selection + create button
│   │   └── FeatureGrid.tsx
│   ├── room/
│   │   ├── RoomProvider.tsx    # Init listeners, manage join flow
│   │   ├── JoinDialog.tsx      # Enter name, pick role
│   │   ├── GameBoard.tsx       # Main layout (table + cards + sidebar)
│   │   ├── VotingTable.tsx     # Central table with player avatars
│   │   ├── PlayerAvatar.tsx    # Name + voted indicator
│   │   ├── CardDeck.tsx        # Voting cards at bottom
│   │   ├── VotingCard.tsx      # Individual card with animations
│   │   ├── RevealedVotes.tsx   # Post-reveal: flipped cards + stats
│   │   ├── VoteStatistics.tsx  # Average, median, mode, distribution chart
│   │   ├── StoryInput.tsx      # Story/ticket title input
│   │   ├── RoundControls.tsx   # Reveal + Reset (moderator only)
│   │   ├── Timer.tsx           # Countdown display
│   │   ├── RoundHistory.tsx    # Past rounds list
│   │   ├── PlayerList.tsx      # Sidebar player list
│   │   ├── RoomHeader.tsx      # Room name, copy link, settings
│   │   └── ConsensusOverlay.tsx # Confetti on consensus
│   └── ui/
│       ├── Button.tsx, Input.tsx, Dialog.tsx, Toggle.tsx
│       ├── Badge.tsx, Tooltip.tsx, ThemeToggle.tsx
│       └── Skeleton.tsx, Toast.tsx
```

## Key Architecture Decisions

1. **No auth** - Anonymous session IDs via nanoid + localStorage. Zero friction for users. Acceptable security tradeoff for a free tool.
2. **API route only for room creation** - Admin SDK ensures valid room structure + enables rate limiting. All other writes (join, vote) are client-side for low latency.
3. **Three Firestore listeners per room** - Room doc, players subcollection, rounds subcollection. Each triggers independently, minimizing bandwidth.
4. **Timer via server timestamps** - Store `timerStartedAt` as `serverTimestamp()`, clients compute remaining time locally. No dedicated timer server needed.
5. **Vote privacy is UI-enforced** - During voting, `currentVote` is in Firestore but UI only shows a boolean. Firestore can't do field-level security rules. Acceptable for this use case.

## Verification

1. **Manual:** Open 3+ browser tabs, create room, all join, vote, reveal, check stats, reset
2. **Mobile:** Test on 375px viewport - cards scroll, player list in drawer
3. **Real-time:** Vote in one tab, verify indicator appears in other tabs within ~500ms
4. **Timer:** Start timer, verify all clients show same countdown
5. **Consensus:** All vote same value, verify confetti appears
6. **Tests:** `npm test` (Vitest unit tests), `npx playwright test` (E2E)
7. **Lighthouse:** Run on landing page, target 95+ all categories
