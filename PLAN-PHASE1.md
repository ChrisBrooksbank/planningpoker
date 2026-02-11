# Phase 1: Project Foundation

## Goals
- User can visit landing page, create a room, get redirected to `/room/{id}`
- Dark/light theme toggle with localStorage persistence

## Tasks

### 1.1 Initialize Next.js Project
- `npx create-next-app@latest` with TypeScript + Tailwind + App Router
- Configure `tsconfig.json` path aliases (`@/`)

### 1.2 Install Dependencies
```bash
npm install firebase firebase-admin zustand nanoid motion canvas-confetti use-sound clsx tailwind-merge
npm install -D @types/canvas-confetti
```

### 1.3 Set Up Firebase
- Create `src/lib/firebase/config.ts` - Client SDK init with env vars
- Create `src/lib/firebase/admin.ts` - Admin SDK for API routes
- Create `.env.local` template with all Firebase config keys
- Create `.env.example` documenting required env vars

### 1.4 Build Landing Page
- `src/app/layout.tsx` - Root layout with ThemeProvider, Inter font
- `src/app/globals.css` - Tailwind base + dark mode CSS variables
- `src/components/landing/Hero.tsx` - Title, tagline, animated hero
- `src/components/landing/CreateRoomForm.tsx` - Room name input, deck type selector, create button
- `src/components/landing/FeatureGrid.tsx` - Feature highlights grid
- `src/app/page.tsx` - Compose landing page components

### 1.5 API Route for Room Creation
- `src/app/api/room/route.ts` - POST handler
  - Validate request body (room name, deck type)
  - Generate room ID with nanoid
  - Create Firestore document with initial room structure
  - Return `{ roomId }` response

### 1.6 Dark/Light Theme Toggle
- `src/lib/stores/settingsStore.ts` - Zustand store with persist middleware
- `src/components/ui/ThemeToggle.tsx` - Sun/Moon toggle button
- Wire into root layout with `class` strategy dark mode

### 1.7 Utility Files
- `src/lib/utils/cn.ts` - clsx + tailwind-merge helper
- `src/lib/room/types.ts` - Core TypeScript interfaces
- `src/lib/room/constants.ts` - Deck definitions (fibonacci, tshirt, powers2)

### 1.8 Basic UI Components
- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`

## Deliverables
- Working landing page with hero, create room form, feature grid
- Theme toggle persisted to localStorage
- POST /api/room creates Firestore doc and returns roomId
- Redirect to /room/{roomId} after creation
