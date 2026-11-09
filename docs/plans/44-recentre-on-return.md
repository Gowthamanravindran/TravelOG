# Plan 44 — The day strip re-centres every time you come back to it

**Status:** ✅ Built

## Context
After Plan 43, today's day glided to the centre when the Itinerary (Plan mode) or Plan (Trip mode) first opened. But tabs stay alive in the background: after swiping the strip away, going to Budget and coming back, the screen wasn't rebuilt and the "once per opening" guard had already fired, so nothing moved. The owner wanted the glide every time the section comes into view.

## Change
- `app/trip/[id]/plan/index.tsx` and `app/trip/[id]/live/plan.tsx` count each time the tab comes into view (expo-router's `useFocusEffect`) and pass the count to `ItineraryView` as `focusKey`.
- `ItineraryView`: when `focusKey` changes, the selected day glides back to the centre (the same `centre()` and `centreOffset`; a jump with Reduce motion). The selected day stays as the person left it: today, or the day they tapped.
- The first opening is still driven by layout; a focus that centres first marks it done, so there is never a double scroll.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. New test in `day-strip.test.tsx`: after the opening glide and a swipe, a new `focusKey` centres today again; after tapping Day 12, Day 12 comes back instead. `trip-tabs.test.tsx`'s router mock gains `useFocusEffect`; the real-router navigation test still passes.
- Owner: `git pull && pnpm dev:go`. Open the Itinerary, swipe the days away, go to Budget, come back: the strip glides to today again. The same in Trip mode's Plan tab. No new build is needed.
