# User Identity

## Overview

Participants identify themselves with a display name and are assigned a role within each session.

## User Stories

- As a participant, I want to enter my name when joining so that others know who I am
- As a moderator, I want to be distinguished from voters so that my controls are visible
- As a participant, I want to see who is the moderator so that I know who controls the session

## Requirements

- [ ] Prompt for display name when creating or joining a session
- [ ] Validate display name (non-empty, reasonable length, trimmed)
- [ ] Two roles: moderator and voter
- [ ] Session creator is automatically the moderator
- [ ] All other joiners are voters by default
- [ ] Display role indicator (badge/icon) next to participant names
- [ ] Moderator sees additional controls (reveal, new round, set topic)
- [ ] Voters see only the card deck and results

## Acceptance Criteria

- [ ] Cannot join a session without entering a name
- [ ] Display names appear in the participant list
- [ ] Moderator has a visual badge distinguishing them
- [ ] Moderator controls are only visible to the moderator
- [ ] Voter UI does not show moderator-only controls

## Out of Scope

- User accounts or authentication
- Avatar / profile pictures
- Role reassignment (transferring moderator)
- Persistent identity across sessions
