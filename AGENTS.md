# PersonalOS

## Purpose

PersonalOS is a private operating system for a single user.

Its goal is to reduce cognitive load by helping the user decide where their attention belongs.

It is NOT a generic task manager.

---

## Architecture

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- PostgreSQL
- Prisma
- Mobile-first
- Server Components by default

---

## Design Principles

- Calm
- Minimal
- Fast
- Beautiful
- Accessible

Never overwhelm the user.

Every screen should answer ONE question.

---

## Code Standards

- Strict TypeScript
- Functional components
- No inline styles
- Tailwind only
- Components should be small and composable
- Reuse existing components
- Avoid unnecessary dependencies
- Prefer composition over inheritance

---

## UI Principles

Large typography

Lots of whitespace

One primary accent colour

Rounded cards

Soft shadows

No clutter

---

## Domain Model

Everything is an Item.

Items have:

- id
- title
- type
- status
- area
- energy
- urgency

Items can belong to other Items.

Avoid creating special cases.

---

## Development Workflow

Before implementing a feature:

1. Understand the intent.
2. Reuse existing components.
3. Keep code simple.
4. Explain tradeoffs when appropriate.

Never sacrifice clarity for cleverness.