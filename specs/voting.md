# Voting

## Overview

Participants submit story point estimates that remain hidden until the moderator reveals all votes simultaneously.

## User Stories

- As a participant, I want to select a story point value so that I can submit my estimate
- As a moderator, I want to set the topic/story being estimated so that everyone knows what they're voting on
- As a moderator, I want to reveal all votes at once so that estimates aren't biased by others
- As a moderator, I want to start a new round so that we can estimate the next item
- As a participant, I want to see the results after reveal so that the team can discuss

## Requirements

- [ ] Display a card deck with standard Fibonacci-like values: 0, 1, 2, 3, 5, 8, 13, 21, ?, coffee
- [ ] Allow participants to select one card as their estimate
- [ ] Allow participants to change their selection before reveal
- [ ] Show which participants have voted (without revealing values) before reveal
- [ ] Moderator can set/update the current topic being estimated
- [ ] Moderator can reveal all votes simultaneously
- [ ] After reveal, display all votes with participant names
- [ ] Show basic statistics after reveal: average, most common, range
- [ ] Moderator can start a new voting round (clears all votes)

## Acceptance Criteria

- [ ] Clicking a card selects it and shows visual feedback
- [ ] Other participants see a "voted" indicator but not the value
- [ ] Reveal shows all votes at the same time for all participants
- [ ] Statistics are calculated correctly
- [ ] New round clears all votes and statistics
- [ ] Topic text is visible to all participants

## Out of Scope

- Custom card decks (configurable values)
- Timer/countdown for voting
- Automatic consensus detection
