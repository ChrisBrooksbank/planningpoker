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

- [x] Display a card deck with values depending on deck type:
  - Fibonacci: 1, 2, 3, 5, 8, 13, 21
  - T-shirt: XS, S, M, L, XL, XXL
- [x] Allow participants to select one card as their estimate
- [x] Allow participants to change their selection before reveal
- [x] Show which participants have voted (without revealing values) before reveal
- [x] Moderator can set/update the current topic being estimated
- [x] Moderator can reveal all votes simultaneously
- [x] Moderator is prompted with a confirmation dialog before revealing votes
- [x] After reveal, display all votes with participant names
- [x] Show basic statistics after reveal: average, most common, range
- [x] Moderator can start a new voting round (clears all votes)
- [x] Round history is maintained showing previous rounds with topic and results
- [x] Observers cannot vote and do not appear in the voting tally

## Acceptance Criteria

- [x] Clicking a card selects it and shows visual feedback
- [x] Other participants see a "voted" indicator but not the value
- [x] Reveal shows all votes at the same time for all participants
- [x] Statistics are calculated correctly
- [x] New round clears all votes and statistics
- [x] Topic text is visible to all participants

## Out of Scope

- Custom card decks (configurable values beyond Fibonacci and T-shirt)
- Timer/countdown for voting
- Automatic consensus detection
