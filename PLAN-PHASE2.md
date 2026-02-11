# Phase 2: Core Room & Voting

## Goals

- Multiple users can join a room, see each other, and vote in real time

## Tasks

### 2.1 TypeScript Types & Constants

- `src/lib/room/types.ts` - Full Room, Player, Round, DeckType interfaces
- `src/lib/room/constants.ts` - Deck card values for each deck type

### 2.2 Anonymous Session Management

- `src/lib/hooks/useSession.ts` - Generate + persist nanoid session ID in localStorage
- Session ID used as player document ID in Firestore

### 2.3 Firestore Real-time Listeners

- `src/lib/room/listeners.ts` - Functions to set up onSnapshot listeners
  - `subscribeToRoom(roomId)` - Room document listener
  - `subscribeToPlayers(roomId)` - Players subcollection listener
  - `subscribeToRounds(roomId)` - Rounds subcollection listener

### 2.4 Zustand Stores

- `src/lib/stores/roomStore.ts` - Room state, players map, rounds array, actions
- Wire stores to Firestore listeners (listeners update store on snapshot)

### 2.5 Room Provider & Join Flow

- `src/components/room/RoomProvider.tsx` - Context provider that:
  - Checks if user has joined (session ID in players subcollection)
  - Shows JoinDialog if not joined
  - Sets up all 3 Firestore listeners
  - Handles cleanup on unmount
- `src/components/room/JoinDialog.tsx` - Modal with:
  - Name input field
  - Role selection (Voter / Observer)
  - Join button

### 2.6 Room Actions

- `src/lib/room/actions.ts`:
  - `joinRoom(roomId, sessionId, name, role)` - Add player doc
  - `castVote(roomId, sessionId, vote)` - Update player's currentVote
  - `clearVote(roomId, sessionId)` - Remove vote
  - `updatePresence(roomId, sessionId)` - Update lastSeen timestamp

### 2.7 Player Display

- `src/components/room/PlayerList.tsx` - Sidebar list of all players with status
- `src/components/room/PlayerAvatar.tsx` - Avatar with name, role badge, voted indicator

### 2.8 Voting Cards

- `src/components/room/CardDeck.tsx` - Row of voting cards at bottom of screen
- `src/components/room/VotingCard.tsx` - Individual card with:
  - Hover effect (lift)
  - Selected state (raised + highlighted)
  - Click to vote/toggle

### 2.9 Voting Table

- `src/components/room/VotingTable.tsx` - Central area showing:
  - Circular/oval table layout
  - Player positions around table
  - Face-down cards for players who have voted
  - Empty slots for players who haven't voted

### 2.10 Room Page

- `src/app/room/[roomId]/page.tsx` - Client component composing:
  - RoomProvider wrapping everything
  - GameBoard layout
- `src/components/room/GameBoard.tsx` - Main layout grid
- `src/components/room/RoomHeader.tsx` - Room name + link

### 2.11 Hooks

- `src/lib/hooks/useRoom.ts` - Subscribe to room store
- `src/lib/hooks/usePlayers.ts` - Subscribe to players store
- `src/lib/hooks/useVote.ts` - Cast/change/clear vote actions

## Deliverables

- Room page loads and shows JoinDialog
- After joining, player appears in player list for all connected users
- Clicking a card casts a vote (face-down indicator shown to others)
- Real-time sync across multiple browser tabs
