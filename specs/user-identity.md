# User Identity

## Overview

Participants identify themselves with a display name and are assigned a role within each session.

## User Stories

- As a participant, I want to enter my name when joining so that others know who I am
- As a moderator, I want to be distinguished from voters so that my controls are visible
- As a participant, I want to see who is the moderator so that I know who controls the session

## Requirements

- [x] Prompt for display name when creating or joining a session
- [x] Validate display name (non-empty, reasonable length, trimmed)
- [x] Three roles: moderator, voter, and observer
- [x] Session creator is automatically the moderator
- [x] All other joiners are voters by default
- [x] Participants can toggle between voter and observer roles (moderator cannot toggle to observer)
- [x] Display role indicator (badge/icon) next to participant names
- [x] Moderator sees additional controls (reveal, new round, set topic)
- [x] Voters see only the card deck and results
- [x] Observers see votes and results but cannot submit votes

## Acceptance Criteria

- [x] Cannot join a session without entering a name
- [x] Display names appear in the participant list
- [x] Moderator has a visual badge distinguishing them
- [x] Moderator controls are only visible to the moderator
- [x] Voter UI does not show moderator-only controls
- [x] Observer badge is displayed for observers

## Out of Scope

- User accounts or authentication
- Avatar / profile pictures
- Role reassignment (transferring moderator)
- Persistent identity across sessions
