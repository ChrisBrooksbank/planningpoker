# Session Management

## Overview

Users can create and join planning poker rooms to collaboratively estimate work items.

## User Stories

- As a moderator, I want to create a new poker session so that my team can estimate stories
- As a participant, I want to join an existing session via a link or room code so that I can participate in estimation
- As a moderator, I want to name my session so that participants know which meeting they're in
- As a participant, I want to see who else is in the session so that I know when everyone has joined

## Requirements

- [x] Create a new session with a unique room ID (short, shareable code)
- [x] Join an existing session by entering its room code or following a link
- [x] Display session name prominently in the room
- [x] Show a participant list with all current members
- [x] Handle participants leaving (browser close, disconnect)
- [x] Persist session state in memory on the server (no database required for MVP)
- [x] Landing page with "Create Session" and "Join Session" options
- [x] Observer mode toggle allowing participants to switch between voter and observer roles
- [x] Rate limiting: max 10 session creations per IP per minute
- [x] Session capacity: max 1000 sessions, 50 participants per session
- [x] 24-hour session TTL with hourly cleanup of stale sessions

## Acceptance Criteria

- [x] Creating a session generates a unique, URL-safe room code
- [x] Joining with a valid code connects the user to the correct room
- [x] Joining with an invalid code shows a clear error message
- [x] Participant list updates in real-time as people join/leave
- [x] Session creator is automatically assigned the moderator role

## Out of Scope

- Persistent storage (database) - sessions live in server memory
- Authentication / user accounts
- Session history or replay
