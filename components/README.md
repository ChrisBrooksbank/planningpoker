# components/

Reusable React components for the Planning Poker application.

## Current Components

- **theme-provider.tsx** - Theme context provider for light/dark mode support

## Planned Components

- **ui/** - Base UI components (buttons, cards, inputs, dialogs)
- **poker/** - Domain-specific components (card deck, voting UI, participant list)
- **session/** - Session management components (create/join forms, session header)

## Usage

Import components using the `@/components` path alias:

```typescript
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
```
