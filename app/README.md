# app/

Next.js App Router pages and layouts.

## Current Structure

- **layout.tsx** - Root layout with theme provider and metadata
- **page.tsx** - Home page (landing page)
- **globals.css** - Global styles with Tailwind and theme CSS variables

## Planned Routes

- **/** - Landing page with Create/Join session options
- **/session/[id]** - Active poker session room
- **/api/** - API routes for session management

## Conventions

- Use Server Components by default
- Add `"use client"` directive only when needed (interactivity, hooks, browser APIs)
- Co-locate route-specific components in the route folder
- Use layout.tsx for shared UI across route segments
