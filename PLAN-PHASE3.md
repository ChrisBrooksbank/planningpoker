# Phase 3: Reveal, Stats & Rounds

## Goals
- Full voting lifecycle: vote -> reveal -> stats -> new round

## Tasks

### 3.1 Round Controls (Moderator Only)
- `src/components/room/RoundControls.tsx`:
  - "Reveal Votes" button (only shown during `voting` status)
  - "New Round" button (only shown during `revealed` status)
  - Only visible to moderator (createdBy matches session ID)

### 3.2 Reveal Logic
- `src/lib/room/actions.ts` - `revealVotes(roomId)`:
  - Update room status to `revealed`
  - Collect all player votes
  - Calculate statistics (average, median, mode, distribution)
  - Write round document to `rounds/{roundNumber}` subcollection
  - Detect consensus (all votes same value)

### 3.3 Revealed Votes Display
- `src/components/room/RevealedVotes.tsx`:
  - Show all player cards face-up with 3D flip animation
  - Group cards by vote value
  - Highlight consensus if achieved

### 3.4 Vote Statistics
- `src/lib/utils/statistics.ts`:
  - `calculateMean(votes)` - Average (numeric decks only)
  - `calculateMedian(votes)` - Median (numeric decks only)
  - `calculateMode(votes)` - Most common vote
  - `calculateDistribution(votes)` - Count per vote value
  - `detectConsensus(votes)` - Boolean: all same value
- `src/components/room/VoteStatistics.tsx`:
  - Display average, median, mode
  - Distribution bar chart (horizontal bars)
  - Consensus indicator

### 3.5 Consensus Overlay
- `src/components/room/ConsensusOverlay.tsx`:
  - Triggered when consensus detected on reveal
  - canvas-confetti burst animation
  - "Consensus!" text overlay with fade animation

### 3.6 New Round Logic
- `src/lib/room/actions.ts` - `startNewRound(roomId)`:
  - Increment `currentRound`
  - Set status to `voting`
  - Clear all players' `currentVote` fields
  - Clear `storyTitle`

### 3.7 Story Input
- `src/components/room/StoryInput.tsx`:
  - Text input for story/ticket title
  - Moderator can edit, others see read-only
  - Synced to Firestore room doc `storyTitle` field
  - Debounced updates

### 3.8 Round History
- `src/components/room/RoundHistory.tsx`:
  - List of past rounds from `rounds/` subcollection
  - Each entry shows: round number, story title, result, consensus
  - Expandable to show full vote breakdown
  - `src/lib/hooks/useRounds.ts` - Subscribe to rounds subcollection

## Deliverables
- Moderator can reveal votes (cards flip with animation)
- Statistics displayed after reveal (average, median, mode, chart)
- Confetti on consensus
- Moderator can start new round (clears votes, increments round)
- Story title input per round
- Round history sidebar with past results
