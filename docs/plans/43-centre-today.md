# Plan 43 — Today's day slides to the centre of the day strip

**Status:** ✅ Built

## Context
In Plan mode's Itinerary and Trip mode's Plan tab, today was selected on opening, but the day strip always started at Day 1. On Day 10 of a trip, today's chip was off-screen. The owner wanted it to glide into the centre.

## Change (`components/itinerary-view.tsx`, used by both screens)
- The day strip and its chips report their sizes. Once both are measured on opening, the strip scrolls so the selected day (today, when the trip is on) is centred, with the native smooth scroll. It runs once per opening, so it never fights your own scrolling.
- `centreOffset()` keeps the first and last days at their edges instead of over-scrolling.
- Tapping a day also centres it.
- With Reduce motion on, the strip jumps there without animating.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. New tests cover `centreOffset` (centre, both ends, a short strip), today's chip centred once and animated on opening, a tap centring the tapped day, and no animation with Reduce motion.
- Owner: `git pull && pnpm dev:go`, then open a trip where today is Day 8 or later, in the Itinerary and in Trip mode's Plan. No new build is needed.
