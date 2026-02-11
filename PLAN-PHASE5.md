# Phase 5: Polish & Responsive

## Goals
- Production-quality UI with animations, mobile support, and accessibility

## Tasks

### 5.1 Card Animations (Motion/Framer Motion)
- Hover: slight lift (translateY -4px) + subtle shadow increase
- Selection: raise up (translateY -12px) + primary color border + glow
- Reveal flip: 3D rotateY 180deg animation, back-face shows vote value
- Card deal: staggered entry animation when deck first renders
- Deselect: smooth return to resting position

### 5.2 Player Join/Leave Animations
- `AnimatePresence` for player list items
- Join: slide in from left + fade in
- Leave: slide out to left + fade out
- Vote indicator: scale pop animation when player votes

### 5.3 Mobile Layout (< 768px)
- Cards: horizontal scroll at bottom of screen (snap scrolling)
- Player list: slide-up drawer (swipe up from bottom handle)
- Voting table: simplified vertical layout
- Round controls: fixed bottom bar above card deck
- Story input: full-width above voting area
- Touch-friendly: larger tap targets (min 44px)

### 5.4 Copy Room Link
- `src/components/room/RoomHeader.tsx`:
  - Copy link button with clipboard API
  - Toast notification on copy: "Link copied!"
  - Share button on mobile (Web Share API fallback)

### 5.5 Toast Notifications
- `src/components/ui/Toast.tsx`:
  - Lightweight toast system (no external library)
  - Position: bottom-right (desktop), bottom-center (mobile)
  - Auto-dismiss after 3 seconds
  - Types: success, info, warning
- Events that trigger toasts:
  - Player joined: "{name} joined the room"
  - Player left: "{name} left the room"
  - Votes revealed: "Votes revealed!"
  - Link copied: "Room link copied to clipboard"
  - Timer started/ended

### 5.6 Loading & Error States
- `src/app/room/[roomId]/loading.tsx` - Skeleton layout
- `src/components/ui/Skeleton.tsx` - Skeleton primitives
- Room not found: friendly 404 with "Create a room" CTA
- Connection lost: banner with reconnection indicator
- Error boundary for unexpected errors

### 5.7 SEO & Meta
- Favicon (card/poker chip icon)
- OG image for social sharing
- Meta tags: title, description, og:title, og:description, og:image
- `robots.txt` and `sitemap.xml`

### 5.8 Accessibility
- Keyboard navigation: Tab through cards, Enter to select
- ARIA labels on all interactive elements
- Focus management: auto-focus name input in JoinDialog
- Screen reader announcements for vote reveals
- Sufficient color contrast in both themes
- Reduced motion preference respected (`prefers-reduced-motion`)

### 5.9 Final UI Polish
- Consistent spacing and typography scale
- Smooth transitions on theme toggle
- Empty states with helpful messaging
- Hover states on all interactive elements
- Focus visible rings for keyboard users

## Deliverables
- Smooth animations on all interactions
- Fully functional on mobile (375px+)
- Toast notifications for key events
- Loading skeletons and error states
- Accessible with keyboard and screen readers
- SEO-ready with meta tags and OG image
