# components/

Reusable React components for the Planning Poker application.

## Components

- **theme-provider.tsx** - Theme context provider for light/dark mode support
- **ThemeToggle.tsx** - Light/Dark/System theme switcher
- **FontSizeControl.tsx** - Adjustable font size (14-20px)
- **AccessibilityToolbar.tsx** - Theme toggle + font size controls
- **ModeratorWelcomeModal.tsx** - Room URL display + copy on session creation
- **ParticipantList.tsx** - Live participant list with status badges
- **CardDeck.tsx** - Card selection with keyboard navigation
- **VoteValueDisplay.tsx** - Card value renderer
- **VoteResults.tsx** - Revealed votes with statistics
- **RoundHistory.tsx** - Expandable history of past rounds
- **SessionHint.tsx** - Context-aware role/state hints

## Usage

Import components using the `@/components` path alias:

```typescript
import { ThemeProvider } from "@/components/theme-provider";
import { CardDeck } from "@/components/CardDeck";
```
