# Plan 46 — Itinerary opens straight away, with a skeleton while it fills in

**Status:** ✅ Built

## Context
After Plan 45 the Itinerary (Plan mode) and Plan (Trip mode) rendered faster, but the first open still paused. The screen only appeared once its whole first render was done: the trip, members, variants, items, bookings, whereabouts and plan checks, the route strip, every day chip and the day's cards. The native slide or fade only starts when React hands the screen over, so the tap seemed to do nothing for a moment. Coming back was already instant, because tabs stay mounted.

## Change
- `ui/skeleton.tsx`:
  - **`Shimmer`**: a soft block in the theme's `surface2` that gently pulses (opacity only, on the UI thread). It stays still with Reduce motion on.
  - **`ItinerarySkeleton`**: the Itinerary's shape, so nothing jumps when the real content arrives. A route-strip bar, five day chips, then three stop rows, each with a time column and a card with an icon tile and two lines. Screen readers hear one "Loading your plan".
- `ui/motion.tsx` **`Deferred`**: draws the fallback first, then the content two animation frames later, fading in (no fade with Reduce motion). It never returns to the fallback. It can be reused for any other slow first screen.
- `app/trip/[id]/plan/index.tsx` and `app/trip/[id]/live/plan.tsx` wrap their content in `<Deferred fallback={<ItinerarySkeleton />}>`. The page or tab appears on the tap, and the plan fills in while the native animation runs. Plan 44's re-centring is unchanged.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. The new `skeleton.test.tsx` checks:
  - the skeleton shows first, then the content, and never again on re-render;
  - the skeleton has the plan's shape;
  - it stays still with Reduce motion on.

  The tab and real-router navigation tests still pass.
- The skeleton was rendered with react-native-web at 390 pt in Sunset light, Colour block dark and Trip mode dark.
- Owner: `git pull && pnpm dev:go`. No new build is needed.
  - Tap a trip: the page slides in at once with the skeleton, and the plan fades in.
  - Open Trip mode's Plan for the first time: the same.
  - Return to either tab: instant, with no skeleton.
