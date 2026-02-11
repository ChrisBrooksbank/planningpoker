# Session Management

## Overview

Users can create and join planning poker rooms to collaboratively estimate work items.

## User Stories

- As a moderator, I want to create a new poker session so that my team can estimate stories
- As a participant, I want to join an existing session via a link or room code so that I can participate in estimation
- As a moderator, I want to name my session so that participants know which meeting they're in
- As a participant, I want to see who else is in the session so that I know when everyone has joined

## Requirements

- [ ] Create a new session with a unique room ID (short, shareable code)
- [ ] Join an existing session by entering its room code or following a link
- [ ] Display session name prominently in the room
- [ ] Show a participant list with all current members
- [ ] Handle participants leaving (browser close, disconnect)
- [ ] Persist session state in memory on the server (no database required for MVP)
- [ ] Landing page with "Create Session" and "Join Session" options

## Acceptance Criteria

- [ ] Creating a session generates a unique, URL-safe room code
- [ ] Joining with a valid code connects the user to the correct room
- [ ] Joining with an invalid code shows a clear error message
- [ ] Participant list updates in real-time as people join/leave
- [ ] Session creator is automatically assigned the moderator role

## Out of Scope

- Persistent storage (database) - sessions live in server memory
- Authentication / user accounts
- Session history or replay
