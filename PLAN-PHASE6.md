# Phase 6: Testing & Deploy

## Goals

- Secure, tested, and deployed to production

## Tasks

### 6.1 Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read: if true;
      allow create: if true;
      allow update: if true;

      match /players/{playerId} {
        allow read: if true;
        allow write: if true;
      }

      match /rounds/{roundId} {
        allow read: if true;
        allow write: if true;
      }
    }
  }
}
```

Note: Since we use anonymous session IDs (no Firebase Auth), rules are permissive. This is acceptable for a free, no-signup tool.

### 6.2 Unit Tests (Vitest)

- `src/lib/utils/statistics.test.ts`:
  - Test mean, median, mode, distribution calculations
  - Edge cases: single vote, all same, empty, non-numeric
- `src/lib/room/constants.test.ts`:
  - Verify deck definitions have correct values
- Component tests with React Testing Library:
  - `VotingCard` - renders, click handler, selected state
  - `VoteStatistics` - renders stats correctly
  - `CreateRoomForm` - form validation, submission

### 6.3 E2E Tests (Playwright)

- Full voting cycle test:
  1. Open landing page
  2. Create room
  3. Open second browser context
  4. Both join room
  5. Both vote
  6. Moderator reveals
  7. Verify stats displayed
  8. Start new round
- Timer test:
  1. Start timer
  2. Verify countdown visible
  3. Wait for expiry or stop

### 6.4 Deploy to Vercel

- Connect GitHub repo to Vercel
- Set environment variables in Vercel dashboard
- Configure Firebase for production project
- Verify WebSocket/real-time connections work in production

### 6.5 Lighthouse Audit

- Run Lighthouse on landing page
- Target scores: Performance 95+, Accessibility 95+, Best Practices 95+, SEO 95+
- Fix any issues found

## Deliverables

- Firestore security rules deployed
- Unit tests passing with good coverage
- E2E test passing for full voting cycle
- Deployed to Vercel with custom domain (if applicable)
- Lighthouse scores 95+ across all categories
