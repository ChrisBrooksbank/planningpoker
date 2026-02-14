// Application constants

// WebSocket configuration
export const WS_RECONNECT_INTERVAL = 1000; // Initial reconnect delay (ms)
export const WS_MAX_RECONNECT_INTERVAL = 30000; // Max reconnect delay (ms)
export const WS_RECONNECT_BACKOFF = 1.5; // Exponential backoff multiplier
export const WS_MAX_RECONNECT_ATTEMPTS = 20; // Stop auto-reconnecting after this many attempts

// Session configuration
export const ROOM_CODE_LENGTH = 6; // Length of generated room codes
export const SESSION_NAME_MAX_LENGTH = 100;
export const PARTICIPANT_NAME_MAX_LENGTH = 50;
export const TOPIC_MAX_LENGTH = 200;

// Performance requirements (from specs)
export const UPDATE_PROPAGATION_TIME_MS = 500; // Max time for updates to propagate
