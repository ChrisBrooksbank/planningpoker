# Phase 4: Timer, Sound & Multiple Decks

## Goals
- Timer, sounds, and deck variety working

## Tasks

### 4.1 Timer Hook
- `src/lib/hooks/useTimer.ts`:
  - Synced via Firestore `serverTimestamp()` for `timerStartedAt`
  - Client computes remaining time locally using `timerDuration - (now - timerStartedAt)`
  - Returns: `{ secondsLeft, isRunning, progress (0-1) }`
  - Handles timer expiry event

### 4.2 Timer Component
- `src/components/room/Timer.tsx`:
  - Circular progress indicator (SVG)
  - Digital countdown display (MM:SS)
  - Start/Stop controls (moderator only)
  - Visual urgency: color changes when < 10s remaining
  - Pulse animation in final 5 seconds

### 4.3 Timer Firestore Actions
- `src/lib/room/actions.ts`:
  - `startTimer(roomId, duration)` - Set timerStartedAt, timerDuration, timerEnabled
  - `stopTimer(roomId)` - Clear timer fields
  - Optional auto-reveal when timer expires (check `settings.autoRevealOnAllVoted`)

### 4.4 Sound Effects
- `src/lib/hooks/useSound.ts`:
  - Wrapper around `use-sound` library
  - Sounds: card select, card deselect, reveal, consensus, timer tick, timer end
  - Respects `settingsStore.soundEnabled` preference
- Sound files in `public/sounds/` (generate or source free SFX)

### 4.5 Multiple Deck Types
- Ensure `src/lib/room/constants.ts` has all deck definitions:
  - **Fibonacci:** 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?
  - **T-Shirt:** XS, S, M, L, XL, XXL, ?
  - **Powers of 2:** 0, 1, 2, 4, 8, 16, 32, 64, ?
  - **Custom:** User-defined array of strings
- `CreateRoomForm` deck type selector with preview
- `CardDeck` renders correct cards based on room's `deckType`
- Statistics adapt: numeric stats only for numeric decks, mode/distribution for all

### 4.6 Auto-Reveal on All Voted
- Room setting: `autoRevealOnAllVoted: boolean`
- When all voters have cast a vote, automatically trigger reveal
- Skip observers in the count
- Setting toggle in room settings (moderator only)

## Deliverables
- Timer starts, counts down synced across all clients
- Optional auto-reveal on timer expiry
- Sound effects for key actions (can be toggled off)
- All 4 deck types selectable at room creation
- Auto-reveal when all voters have voted (optional setting)
