# Plan 41 — Polls only for trips with more than one person

**Status:** ✅ Built

## Context
The owner: when a trip has only one person, the Polls tab isn't needed; it should show only once more people are added.

## Change
- **Plan mode hides the Polls tab while the trip has one person** (`app/trip/[id]/plan/_layout.tsx`: the tab bar leaves it out and the route gets `href: null`). It appears as soon as a second person is added, under Budget → People or in trip settings.
- **The itinerary's "Let the group vote" button** (on a day with Plan A and Plan B) follows the same rule.
- Polls already made aren't deleted; they show again once the trip has more than one person.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. A real-router test checks that a one-person trip has no Polls tab and that adding a person brings it back.
- Owner: `git pull && pnpm dev:go`. A new trip shows Itinerary · Budget · Bookings · Memories; add someone under Budget → People and Polls appears. No new build is needed.
