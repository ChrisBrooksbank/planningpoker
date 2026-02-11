# Implementation Plan

## Status

- Planning iterations: 1
- Build iterations: 22
- Last updated: 2026-02-11

## Critical Architectural Decision

**CONFLICT DETECTED**: Specifications require WebSocket server (real-time-sync.md), but existing plans (PLAN.md, PLAN-PHASE1-6.md) reference Firebase Firestore. This must be resolved before implementation begins.

**Recommendation**: Follow specifications exactly - implement WebSocket server as specified in real-time-sync.md.

## Tasks

### Phase 1: Project Foundation & Setup

- [x] Initialize Next.js 14+ project with TypeScript and App Router (spec: all)
- [x] Install and configure Tailwind CSS with dark mode support (spec: all)
- [x] Set up WebSocket server alongside Next.js app (spec: real-time-sync.md)
- [x] Create basic project structure (src/app, src/components, src/lib, src/server)
- [x] Implement in-memory session storage on server (spec: session-management.md)

### Phase 2: Landing Page & Session Creation

- [x] Build landing page with Create/Join session options (spec: session-management.md)
- [x] Implement unique room code generation (URL-safe, collision-resistant) (spec: session-management.md)
- [x] Create session creation flow with name prompt (spec: session-management.md)
- [x] Implement session join flow with code validation and error messaging (spec: session-management.md)
- [x] Add display name prompt and validation for create/join (spec: user-identity.md)

### Phase 3: WebSocket Real-Time Infrastructure

- [x] Implement WebSocket connection on session join (spec: real-time-sync.md)
- [x] Build JSON message protocol with type-based routing (spec: real-time-sync.md)
- [x] Implement server-side room-based message broadcasting (spec: real-time-sync.md)
- [x] Add automatic client reconnection with exponential backoff (spec: real-time-sync.md)
- [x] Implement current state sync on reconnection (spec: real-time-sync.md)

### Phase 4: User Identity & Roles

- [x] Implement moderator assignment (session creator = moderator) (spec: user-identity.md)
- [x] Add role indicators (badges/icons) in participant list (spec: user-identity.md)
- [x] Build participant list with real-time updates (spec: session-management.md)
- [x] Handle participant join/leave events via WebSocket (spec: real-time-sync.md)
- [x] Display online/offline status for participants (spec: session-management.md)

### Phase 5: Voting Core - Card Deck

- [x] Implement card deck with values: 0,1,2,3,5,8,13,21,?,coffee (spec: voting.md)
- [x] Build card selection UI with visual feedback (spec: voting.md)
- [x] Allow vote changes before reveal (spec: voting.md)
- [x] Show "voted" status without revealing values (spec: voting.md)
- [x] Sync vote submissions via WebSocket (hidden values) (spec: real-time-sync.md)

### Phase 6: Voting Core - Topic & Reveal

- [x] Implement topic setting/updating (moderator only) (spec: voting.md)
- [x] Display topic to all participants (spec: voting.md)
- [x] Sync topic changes via WebSocket (spec: real-time-sync.md)
- [x] Implement simultaneous vote reveal (moderator action) (spec: voting.md)
- [x] Sync vote reveals via WebSocket (spec: real-time-sync.md)

### Phase 7: Vote Statistics & Results

- [x] Display revealed votes with participant names (spec: voting.md)
- [x] Calculate average (excluding ?,coffee) (spec: voting.md)
- [x] Calculate most common vote (mode) (spec: voting.md)
- [x] Calculate vote range (min/max) (spec: voting.md)
- [x] Display statistics after reveal (spec: voting.md)

### Phase 8: Round Management

- [x] Implement new round action (moderator only) (spec: voting.md)
- [x] Clear all votes on new round (spec: voting.md)
- [x] Sync new round start via WebSocket (spec: real-time-sync.md)
- [x] Reset UI state for new voting round (spec: voting.md)

### Phase 9: Role-Based UI

- [x] Show moderator controls (reveal, new round, set topic) to moderator only (spec: user-identity.md)
- [x] Show voter UI (card deck, results) to all participants (spec: user-identity.md)
- [x] Hide moderator controls from voters (spec: user-identity.md)
- [x] Ensure voters can see results after reveal (spec: voting.md)

### Phase 10: Polish & Testing

- [x] Add loading states for WebSocket connection (spec: real-time-sync.md)
- [x] Add error handling for connection failures (spec: real-time-sync.md)
- [x] Test multiple simultaneous rooms (spec: real-time-sync.md)
- [x] Verify updates propagate within 500ms (spec: real-time-sync.md)
- [x] Test participant join/leave during active voting (spec: session-management.md, real-time-sync.md)

## Completed

- [x] Initialize Next.js 14+ project with TypeScript and App Router
  - Created package.json with Next.js 15, React 19, TypeScript, Tailwind CSS
  - Configured Vitest for testing with jsdom environment
  - Set up ESLint with Next.js and Prettier configs
  - Created App Router structure (app/layout.tsx, app/page.tsx, app/globals.css)
  - Created project directories: app/, components/, lib/, server/
  - Added WebSocket dependencies (ws, nanoid)
  - All validation checks passing (typecheck, lint, format, tests)

- [x] Install and configure Tailwind CSS with dark mode support
  - Installed autoprefixer dependency
  - Configured PostCSS with tailwindcss and autoprefixer plugins
  - Set up Tailwind config with class-based dark mode
  - Added CSS custom properties for light/dark themes in globals.css
  - Extended Tailwind theme with semantic color tokens (background, foreground, card, primary, secondary, muted, border, input, ring)
  - Created ThemeProvider component with localStorage persistence
  - Implemented useTheme hook for theme management
  - Updated RootLayout to include ThemeProvider with system default
  - Added suppressHydrationWarning to html tag for theme compatibility
  - Updated home page to use dark mode-aware colors
  - Created comprehensive test suite for ThemeProvider (8 tests)
  - Added matchMedia mock to vitest setup for test compatibility
  - All validation checks passing (typecheck, lint, format, tests)

- [x] Set up WebSocket server alongside Next.js app
  - Created PlanningPokerWebSocketServer class in server/websocket.ts
  - Implemented room-based message broadcasting
  - Added connection validation (requires roomId and userId query params)
  - Implemented JSON message protocol with type-based routing
  - Created custom Next.js server (server/index.ts) that runs alongside WebSocket
  - Installed and configured tsx for running TypeScript server files
  - Updated npm scripts: dev uses "tsx watch server/index.ts", start uses "tsx server/index.ts"
  - Added global wsServer instance for API route access
  - Implemented server methods: broadcastToRoom, sendToUser, getRoomUsers, isUserConnected, disconnectUser
  - Created comprehensive test suite for WebSocket server (10 tests)
  - Tests cover: connection validation, room isolation, broadcasting, disconnection notifications
  - Created server/README.md with protocol documentation
  - All validation checks passing (typecheck, lint, format, tests)

- [x] Create basic project structure (src/app, src/components, src/lib, src/server)
  - Created lib/types.ts with shared TypeScript interfaces (Session, Participant, Vote, VoteStatistics, SessionState)
  - Defined CARD_VALUES constant array with Fibonacci-like values (0,1,2,3,5,8,13,21,?,coffee)
  - Created lib/constants.ts with WebSocket reconnection config, validation limits, performance requirements
  - Created lib/utils.ts with validation functions (room codes, names, topics) and className merger (cn)
  - Installed clsx and tailwind-merge for Tailwind CSS class merging utility
  - Created comprehensive test suite for utility functions (20 tests)
  - Added README.md files documenting structure and conventions for app/, components/, lib/ directories
  - Created root README.md with project overview, tech stack, and architecture notes
  - All validation checks passing (typecheck, lint, format, tests) - 40 tests total

- [x] Implement in-memory session storage on server
  - Created SessionStorage class in server/sessionStorage.ts with in-memory Map storage
  - Implemented session creation with unique 6-character room codes using nanoid
  - Added participant management (add, remove, mark disconnected, get list)
  - Implemented vote submission and retrieval with update support
  - Added topic setting functionality
  - Implemented vote reveal with statistics calculation (average, mode, min, max, range)
  - Added new round functionality (clears votes, resets reveal state)
  - Implemented session deletion and utility methods (exists, count, getAllIds)
  - Statistics correctly exclude non-numeric values (?, coffee) from average calculation
  - Created comprehensive test suite with 38 tests covering all methods
  - All validation checks passing (typecheck, lint, format, tests) - 78 tests total

- [x] Build landing page with Create/Join session options
  - Updated app/page.tsx to client component with state management for mode switching
  - Implemented landing mode with Create Session and Join Session buttons
  - Implemented create mode with header and back navigation
  - Implemented join mode with header and back navigation
  - Used semantic Tailwind CSS color tokens (primary, card, muted, border, etc.)
  - Applied consistent spacing and responsive design (max-w-md container, padding)
  - Created comprehensive test suite with 11 tests covering all modes and navigation
  - All validation checks passing (typecheck, lint, format, tests) - 89 tests total

- [x] Implement unique room code generation (URL-safe, collision-resistant)
  - Created generateRoomCode function in lib/utils.ts with collision checking
  - Function accepts Set of existing codes and maxAttempts parameter
  - Generates 6-character URL-safe codes using nanoid
  - Retries on collision up to maxAttempts times (default 10)
  - Throws error if unable to generate unique code after max attempts
  - Updated SessionStorage.createSession to use collision-resistant generation
  - Created POST /api/sessions endpoint for session creation
  - Endpoint validates sessionName and moderatorName inputs
  - Endpoint generates unique moderator ID and room code
  - Returns roomId, sessionName, and moderatorId to client
  - Created comprehensive test suite for generateRoomCode (12 tests)
  - Created comprehensive test suite for POST /api/sessions (9 tests)
  - Tests verify uniqueness, URL-safety, collision handling, and API validation
  - All validation checks passing (typecheck, lint, format, tests) - 110 tests total

- [x] Create session creation flow with name prompt
  - Updated app/page.tsx to add session creation form in create mode
  - Added input fields for session name (max 100 chars) and moderator name (max 50 chars)
  - Implemented client-side validation using isValidSessionName and isValidParticipantName
  - Added form submission handler that calls POST /api/sessions endpoint
  - Implemented error display for validation and API errors
  - Added loading state during session creation with disabled inputs
  - Stored moderator ID in localStorage for session access
  - Implemented navigation to /session/[roomId] on successful creation
  - Input fields trim whitespace before validation and submission
  - Added back button that resets form state when navigating to landing
  - Updated tests to use role-based queries to avoid ambiguity
  - Added 9 new tests covering form display, validation, API integration, loading state, and error handling
  - All validation checks passing (typecheck, lint, format, tests) - 119 tests total

- [x] Implement session join flow with code validation and error messaging
  - Updated app/page.tsx to add room code and participant name state variables
  - Imported isValidRoomCode utility and nanoid for participant ID generation
  - Implemented handleJoinSession function with validation and error handling
  - Added room code input field (6 characters, auto-uppercase)
  - Added participant name input field (max 50 characters)
  - Implemented client-side validation using isValidRoomCode and isValidParticipantName
  - Created GET /api/sessions/[roomId]/validate endpoint for room code validation
  - Endpoint returns 200 if room exists, 404 if not found, 400 if invalid request
  - Added specific error messaging: "Room code not found" for 404, "Failed to validate room code" for other errors
  - Form submission validates room code with API before navigation
  - Generates unique participant ID using nanoid on successful validation
  - Stores participant ID and name in localStorage for session access
  - Implements navigation to /session/[roomId] on successful join
  - Added loading state during join with disabled inputs and "Joining..." text
  - Back button resets form state when navigating to landing
  - Room code input converts to uppercase automatically
  - Created comprehensive test suite for join flow (13 new tests)
  - Created comprehensive test suite for validate API endpoint (4 tests)
  - Tests cover: form display, input conversion, validation, API integration, loading, error messages, state reset
  - All validation checks passing (typecheck, lint, format, tests) - 135 tests total

- [x] Add display name prompt and validation for create/join
  - Display name prompt already implemented in create flow (moderatorName field)
  - Display name prompt implemented in join flow (participantName field)
  - Both flows validate display names using isValidParticipantName (1-50 characters)
  - Both flows trim whitespace before validation and storage
  - Both flows show clear error messages for invalid names
  - Tests verify validation and trimming behavior in both flows
  - All validation checks passing (typecheck, lint, format, tests) - 135 tests total

- [x] Implement WebSocket connection on session join
  - Created useWebSocket custom hook at lib/hooks/useWebSocket.ts
  - Hook manages WebSocket lifecycle (connection, disconnection, reconnection)
  - Implements automatic reconnection with exponential backoff (1s → 30s max)
  - Uses configurable constants (WS_RECONNECT_INTERVAL, WS_MAX_RECONNECT_INTERVAL, WS_RECONNECT_BACKOFF)
  - Provides isConnected state, sendMessage function, and reconnect function
  - Accepts callbacks: onMessage, onConnect, onDisconnect, onError
  - Builds WebSocket URL with roomId and userId query params
  - Uses wss:// protocol for HTTPS connections, ws:// for HTTP
  - Handles malformed JSON messages gracefully with error logging
  - Created session page at app/session/[roomId]/page.tsx
  - Session page retrieves userId from localStorage (set during create/join)
  - Redirects to home if no userId found
  - Establishes WebSocket connection using useWebSocket hook
  - Displays connection status (connected/disconnected) with visual indicator
  - Provides manual reconnect button when disconnected
  - Shows room code prominently
  - Created comprehensive test suite for useWebSocket hook (12 tests)
  - Created comprehensive test suite for session page (11 tests)
  - Tests cover: connection establishment, URL construction, message handling, send functionality, reconnection, cleanup, error handling
  - All validation checks passing (typecheck, lint, format, tests) - 158 tests total

- [x] Build JSON message protocol with type-based routing
  - Created lib/websocket-messages.ts with comprehensive TypeScript message types
  - Defined ClientMessage types: JoinSessionMessage, SubmitVoteMessage, SetTopicMessage, RevealVotesMessage, NewRoundMessage
  - Defined ServerMessage types: ConnectedMessage, SessionStateMessage, ParticipantJoinedMessage, ParticipantLeftMessage, VoteSubmittedMessage, TopicChangedMessage, VotesRevealedMessage, RoundStartedMessage, ErrorMessage
  - Updated WebSocket server (server/websocket.ts) with type-based routing in handleMessage
  - Implemented message handlers: handleJoinSession, handleSubmitVote, handleSetTopic, handleRevealVotes, handleNewRound
  - Added authorization checks (only moderator can set topic, reveal votes, start new round)
  - Implemented session state sync with sendSessionState (hides vote values when not revealed)
  - Added error handling with sendError for invalid messages and unauthorized actions
  - Updated useWebSocket hook to use typed ClientMessage and ServerMessage
  - Updated session page to use ServerMessage type
  - Created comprehensive test suite for message protocol (15 tests)
  - Tests cover: join-session, submit-vote, set-topic, reveal-votes, new-round, authorization, session-state sync, error handling
  - Updated existing tests to use valid message types (replaced "test" and "private" with protocol types)
  - All validation checks passing (typecheck, lint, format, tests) - 173 tests total

- [x] Implement server-side room-based message broadcasting
  - Task was already complete from previous implementation
  - broadcastToRoom method exists in server/websocket.ts (lines 358-371)
  - Method correctly filters clients by roomId, excludes sender when appropriate, checks WebSocket readyState
  - Already used throughout codebase for all message types (participant-joined, participant-left, vote-submitted, topic-changed, votes-revealed, round-started)
  - Comprehensive tests verify room isolation and broadcast functionality (**tests**/websocket.test.ts)
  - Tests cover: broadcasting to same room, room isolation, disconnection notifications
  - All validation checks passing (typecheck, lint, format, tests) - 173 tests total

- [x] Implement current state sync on reconnection
  - Updated session page (app/session/[roomId]/page.tsx) to send join-session message when connected
  - Added participantName state from localStorage (session\_{roomId}\_name)
  - Implemented useEffect that triggers on isConnected and participantName changes
  - Added hasJoinedRef to track if join-session message was sent
  - handleConnect callback resets hasJoinedRef to false on reconnection
  - Server already had sendSessionState method that sends current state on join-session
  - Session state includes: sessionName, moderatorId, currentTopic, isRevealed, participants, votes (hidden when not revealed), statistics (if revealed)
  - Updated all session page tests to mock both userId and participantName in localStorage
  - Added test for join-session message being sent on initial connection
  - Added test for join-session message being sent on reconnection (with connection state changes)
  - Tests verify message sent with correct participantName
  - All validation checks passing (typecheck, lint, format, tests) - 176 tests total

- [x] Implement moderator assignment (session creator = moderator)
  - Moderator assignment already implemented in server/sessionStorage.ts
  - Session creator stored as moderatorId in Session interface (lib/types.ts line 8)
  - Moderator participant created with isModerator: true flag (server/sessionStorage.ts line 45)
  - All other participants added with isModerator: false flag (server/sessionStorage.ts line 109)
  - Moderator role checked for authorization in WebSocket message handlers
  - Tests verify moderator flag in sessionStorage.test.ts and sessions.test.ts
  - All validation checks passing (typecheck, lint, format, tests) - 176 tests total

- [x] Add role indicators (badges/icons) in participant list
- [x] Build participant list with real-time updates
- [x] Handle participant join/leave events via WebSocket
- [x] Display online/offline status for participants
  - Created ParticipantList component (components/ParticipantList.tsx)
  - Displays all participants with names, moderator badges, and online/offline status
  - Moderator badge shown as primary-colored badge next to moderator's name
  - Online status indicated by green dot (bg-green-500), offline by gray dot (bg-gray-400)
  - Current user marked with "(You)" indicator
  - Empty state shows "No participants yet" message
  - Updated session page to track participants state and handle WebSocket messages
  - Implemented message handlers for session-state, participant-joined, participant-left
  - Participant list updates in real-time when participants join or leave
  - Participants marked as disconnected (not removed) when they leave
  - Duplicate participant handling prevents same user from being added twice
  - Component uses responsive grid layout (lg:col-span-1 for participant list, lg:col-span-2 for voting area)
  - Created comprehensive test suite for ParticipantList component (12 tests)
  - Added 6 new tests to session page for participant list integration
  - Tests verify: role badges, online/offline status, real-time updates, join/leave handling, duplicate prevention
  - All validation checks passing (typecheck, lint, format, tests) - 193 tests total

- [x] Implement card deck with values: 0,1,2,3,5,8,13,21,?,coffee
- [x] Build card selection UI with visual feedback
- [x] Allow vote changes before reveal
- [x] Show "voted" status without revealing values
- [x] Sync vote submissions via WebSocket (hidden values)
  - Created CardDeck component (components/CardDeck.tsx) with all card values
  - Implemented responsive grid layout (5 columns) with hover and active states
  - Coffee card displays with ☕ emoji
  - Selected card highlighted with primary color and visual scale effect
  - Cards disabled when WebSocket disconnected
  - Vote selection triggers submit-vote message to WebSocket server
  - Allows changing vote by selecting different card (updates via WebSocket)
  - Updated ParticipantList component to accept votedUserIds prop
  - Added "✓ Voted" indicator next to participants who have submitted votes
  - Vote values remain hidden until reveal (only status shown)
  - Updated session page to track votedUserIds state via vote-submitted messages
  - Installed @testing-library/user-event for user interaction testing
  - Created comprehensive test suite for CardDeck component (12 tests)
  - Added 4 new tests to ParticipantList for voted status display
  - Added 4 new tests to session page for vote submission and status tracking
  - All validation checks passing (typecheck, lint, format, tests) - 213 tests total

- [x] Implement topic setting/updating (moderator only)
- [x] Display topic to all participants
- [x] Sync topic changes via WebSocket
  - Added currentTopic, topicInput, and moderatorId state to session page
  - Implemented handleUpdateTopic function with validation and trimming
  - Added isModerator check (userId === moderatorId) for role-based UI
  - Created topic section UI with card border and header
  - Moderators see input field (maxLength 200) and "Update Topic" button
  - Non-moderators see current topic text or "No topic set yet" message
  - Topic input and button disabled when WebSocket disconnected
  - Update Topic button disabled when topic is invalid (>200 chars)
  - handleMessage now handles session-state to sync moderatorId and currentTopic
  - handleMessage now handles topic-changed to update topic in real-time
  - Topic input syncs with currentTopic on session-state messages
  - Send set-topic message with trimmed topic when moderator clicks Update Topic
  - Added isValidTopic import from lib/utils
  - Server-side set-topic handler already implemented with moderator authorization
  - Created comprehensive test suite with 10 new tests covering all topic functionality
  - Tests verify: topic section display, moderator input, non-moderator view, empty topic message, set-topic message sending, topic-changed handling, disabled state when disconnected, maxLength attribute, topic input sync, whitespace trimming
  - All validation checks passing (typecheck, lint, format, tests) - 223 tests total

- [x] Implement simultaneous vote reveal (moderator action)
- [x] Sync vote reveals via WebSocket
  - Added isRevealed state to session page to track reveal status
  - Updated session-state message handler to sync isRevealed state
  - Implemented handleRevealVotes function that sends reveal-votes message
  - Added votes-revealed message handler that sets isRevealed to true
  - Created Moderator Controls section in UI (only visible to moderator)
  - Reveal Votes button shown only when: user is moderator AND votes not yet revealed
  - Reveal Votes button disabled when WebSocket disconnected
  - Button styled with primary color and semibold font for prominence
  - Server-side reveal-votes handler already implemented with moderator authorization check
  - Server broadcasts votes-revealed message with all vote values and statistics
  - Created comprehensive test suite with 6 new tests covering reveal functionality
  - Tests verify: button visibility for moderator, button hidden for non-moderator, button hidden when already revealed, reveal-votes message sent on click, button disabled when disconnected, reveal state updated on votes-revealed message
  - All validation checks passing (typecheck, lint, format, tests) - 229 tests total

- [x] Display revealed votes with participant names
- [x] Calculate average (excluding ?,coffee)
- [x] Calculate most common vote (mode)
- [x] Calculate vote range (min/max)
- [x] Display statistics after reveal
  - Created VoteResults component (components/VoteResults.tsx) with votes and statistics display
  - Displays individual votes sorted alphabetically by participant name
  - Shows vote values with color-coded badges (numeric values, ?, and coffee emoji)
  - Statistics section displays average, most common, range (min-max), and spread
  - Shows "N/A" for statistics when no numeric votes available
  - Gracefully handles unknown participants (displays "Unknown")
  - Shows empty state when no votes have been submitted
  - Updated session page to track revealedVotes and statistics state
  - Added votes-revealed message handler to store votes and statistics
  - Results section only visible after votes are revealed
  - Created comprehensive test suite for VoteResults component (12 tests)
  - Added 4 new tests to session page for vote results integration
  - Tests verify: vote display, sorting, statistics calculation, empty state, unknown participants, emoji handling
  - All validation checks passing (typecheck, lint, format, tests) - 245 tests total

- [x] Implement new round action (moderator only)
- [x] Clear all votes on new round
- [x] Sync new round start via WebSocket
- [x] Reset UI state for new voting round
  - Added handleNewRound function in session page to send new-round message
  - Added "New Round" button in moderator controls (only visible when votes are revealed)
  - Button disabled when WebSocket disconnected
  - Implemented round-started message handler to reset UI state
  - Resets: isRevealed, revealedVotes, statistics, selectedCard, votedUserIds
  - Server-side handler already implemented (handleNewRound in websocket.ts)
  - Server calls sessionStorage.startNewRound which clears votes and resets reveal state
  - Server broadcasts round-started message to all participants
  - Created comprehensive test suite with 6 new tests
  - Tests verify: button visibility for moderator/non-moderator, button visibility based on reveal state, new-round message sending, button disabled when disconnected, UI state reset on round-started message
  - All validation checks passing (typecheck, lint, format, tests) - 251 tests total

- [x] Show moderator controls (reveal, new round, set topic) to moderator only
- [x] Show voter UI (card deck, results) to all participants
- [x] Hide moderator controls from voters
- [x] Ensure voters can see results after reveal
  - Role-based UI was already fully implemented from previous tasks
  - Topic input/update shown to moderator only (app/session/[roomId]/page.tsx line 245)
  - Reveal Votes button shown to moderator only when not revealed (line 285)
  - New Round button shown to moderator only when revealed (line 313)
  - Card deck shown to all participants including moderator (line 276)
  - Vote results shown to all participants after reveal based on isRevealed state (line 300)
  - Non-moderators see current topic as read-only text (line 264)
  - Created comprehensive test suite with 6 new tests for role-based UI verification
  - Tests verify: moderator controls visibility, voter UI visibility, control hiding from voters, results visibility for all roles
  - All validation checks passing (typecheck, lint, format, tests) - 257 tests total

- [x] Add loading states for WebSocket connection
  - Added isConnecting state to useWebSocket hook (lib/hooks/useWebSocket.ts)
  - State is true when WebSocket is connecting, false when connected or disconnected
  - Updated session page to display "Connecting..." status with yellow pulsing indicator (app/session/[roomId]/page.tsx)
  - Connection status indicator shows: green dot for connected, yellow pulsing dot for connecting, red dot for disconnected
  - Reconnect button hidden during connecting state
  - Enhanced initial loading state with animated spinner (app/session/[roomId]/page.tsx)
  - Created comprehensive test suite with 4 new tests for isConnecting state (**tests**/useWebSocket.test.ts)
  - Added 4 new tests to session page for connecting/loading UI states (**tests**/session-page.test.tsx)
  - Updated all existing mock return values to include isConnecting property
  - All validation checks passing (typecheck, lint, format, tests) - 263 tests total

- [x] Add error handling for connection failures
  - Added error state tracking to useWebSocket hook with error message display (lib/hooks/useWebSocket.ts)
  - Error set on WebSocket error event: "Connection error. Attempting to reconnect..."
  - Error set on abnormal connection close with reconnection attempt count: "Connection lost. Reconnecting (attempt X)..."
  - Error cleared automatically on successful connection
  - Added clearError function to manually dismiss error messages
  - Added reconnectAttemptsRef to track reconnection attempts across connection cycles
  - Reset reconnection attempts counter on successful connection and manual reconnect
  - Updated session page to display error banner with warning icon and dismiss button (app/session/[roomId]/page.tsx)
  - Error banner styled with red border and background, includes error icon (⚠️) and close button
  - Error banner positioned below connection status, dismissible via clearError function
  - Created comprehensive test suite with 7 new tests for error handling (**tests**/useWebSocket.test.ts)
  - Tests cover: error state exposure, error on WebSocket error, error clearing on connection, clearError function, abnormal close errors, reconnection attempt tracking
  - Added 7 new tests to session page for error display and dismissal (**tests**/session-page.test.tsx)
  - Tests verify: error message display, no error when null, dismiss button functionality, warning icon, different error scenarios, connecting state indicator
  - Updated all mock return values to include error and clearError properties
  - All validation checks passing (typecheck, lint, format, tests) - 278 tests total

- [x] Test multiple simultaneous rooms
  - Created comprehensive test suite for multiple simultaneous rooms (**tests**/multiple-rooms.test.ts)
  - Tests verify independent participant lists across rooms
  - Tests verify independent voting workflows in parallel (different votes per room, no cross-contamination)
  - Tests verify independent topic changes in parallel (different topics per room)
  - Tests verify independent vote reveals in parallel (different statistics per room)
  - Tests verify independent new rounds in parallel (state reset isolated per room)
  - Tests verify complete voting workflow in multiple rooms simultaneously (votes, reveals, statistics all independent)
  - Tests verify no message leakage between rooms during active voting
  - Tests verify session state isolation when users join mid-session (each gets correct room state)
  - All 8 tests passing, covering room isolation at WebSocket, storage, and protocol levels
  - All validation checks passing (typecheck, lint, format, tests) - 286 tests total

- [x] Verify updates propagate within 500ms
  - Created comprehensive performance test suite (**tests**/websocket-performance.test.ts)
  - Implemented 6 performance tests measuring WebSocket message propagation times
  - Tests verify vote submissions propagate within 500ms (measures time from ws1.send to ws2.receive)
  - Tests verify topic changes propagate within 500ms
  - Tests verify vote reveals propagate within 500ms (includes votes submission setup)
  - Tests verify new round starts propagate within 500ms
  - Tests verify participant join events propagate within 500ms
  - Tests verify multiple rapid actions (vote, topic, reveal) all propagate within 500ms with average under 250ms
  - All tests use realistic WebSocket connection flow (connected → join-session → session-state → actions)
  - Tests create actual sessions via sessionStorage for accurate simulation
  - All 6 performance tests passing, confirming real-time sync meets <500ms requirement from spec
  - All validation checks passing (typecheck, lint, format, tests) - 292 tests total

- [x] Test participant join/leave during active voting
  - Created comprehensive test suite for join/leave scenarios (**tests**/join-leave-during-voting.test.ts)
  - Implemented 5 tests covering participant join/leave behavior during active voting sessions
  - Tests verify participant-joined message sent to all participants when new user joins during voting
  - Tests verify late joiners can see existing vote status (hasVoted) but not values (hidden until reveal)
  - Tests verify participant-left message sent to all participants when user disconnects
  - Tests verify votes from disconnected users are preserved and included in reveal
  - Tests verify late joiners can submit votes in an ongoing round
  - Tests verify users can reconnect after disconnecting and receive current session state with existing vote
  - All tests verify real-time notification propagation (participant join/leave messages)
  - All tests verify vote integrity (disconnected users' votes preserved)
  - All 5 tests passing, confirming session-management.md and real-time-sync.md requirements
  - Requirements verified: "Handle participants leaving", "Participant list updates in real-time as people join/leave"
  - All validation checks passing (typecheck, lint, format, tests) - 297 tests total

## Maintenance

- [x] Fix test flakiness in join-leave-during-voting.test.ts (Build iteration 22)
  - Added connection tracking with activeConnections array
  - Implemented proper WebSocket cleanup in afterEach hook
  - Handle CONNECTING state properly (wait for open before close)
  - Added error handling to prevent uncaught exceptions during cleanup
  - Increased server close timeout to 300ms to allow connections to settle
  - All 297 tests now passing reliably with no unhandled errors

## Notes

### Architectural Decisions

1. **WebSocket over Firebase**: Specifications explicitly require WebSocket server (real-time-sync.md). Previous plans referenced Firebase, but specs take precedence.

2. **In-Memory Storage**: Session state stored in memory on server (session-management.md). No database for MVP.

3. **Server as Source of Truth**: All state managed server-side, clients receive updates via WebSocket broadcast (real-time-sync.md).

4. **Room Code Format**: Must be URL-safe and unique (session-management.md). Suggest nanoid or similar.

5. **Card Deck Values**: Fixed Fibonacci-like sequence: 0,1,2,3,5,8,13,21,?,coffee (voting.md). Custom decks out of scope for MVP.

6. **Statistics Calculation**: Exclude non-numeric values (?,coffee) from average calculation (voting.md).

7. **Moderator Assignment**: Automatic - session creator becomes moderator, no manual role changes in MVP (user-identity.md, session-management.md).

### Implementation Priority Rationale

- Foundation first (Next.js, WebSocket setup)
- Session management before voting (can't vote without session)
- Real-time sync infrastructure before features that need it
- User identity early (needed for participant list)
- Voting features incrementally (deck → reveal → stats → rounds)
- Polish and testing last
