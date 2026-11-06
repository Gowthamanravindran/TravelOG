# Plan 36 — Open a trip without the blank page

**Status:** ✅ Built

## Context
Tapping a trip in the Trips list showed a whole blank page sliding in, and only then the trip. It looked unfinished. There were three causes:

1. **A redirect page in between.** The Trips list, New trip and reminder taps opened `/trip/<id>`. That page (`app/trip/[id]/index.tsx`) draws nothing; it only redirects to Plan mode, Trip mode or Memories. So an empty page slid in first, and then the real trip screen was pushed on top of it.
2. **Content faded in on top of the slide.** `Screen` faded its content in from transparent every time it opened (Plan 28), so a page sliding in was still nearly empty.
3. **Stock colours behind pages.** Navigation used the stock light and dark themes' background, not ours.

## Change
- **`lib/trip-route.ts` `tripHref(trip)`** returns `/trip/<id>/live` while the trip is on, `/trip/<id>/plan/memories` once it's over, else `/trip/<id>/plan`. The Trips list, New trip and reminder taps go straight there. `/trip/<id>` still works for links and uses the same rule.
- **`Screen` draws its content at once.** Plan and Trip mode tabs cross-fade when you switch (the tab navigator's `animation: 'fade'`), never on first open.
- **Navigation colours come from our theme:** background, cards, text, borders and accent. The trip's pages sit on Plan mode's background.
- **Guards:** `Screen` has no fade-in, and no screen navigates to the bare `/trip/<id>`.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. New tests cover `tripHref` (upcoming, no dates, live, past) and the Trips list opening `/trip/<id>/plan`. Both failed before the change. The guard also found the reminder tap, which is fixed.
- Owner: `git pull && pnpm dev:go`. No new build is needed.
  - Tap a trip: it slides in already showing its header and Itinerary.
  - A trip happening now opens Today; a past one opens Memories.
  - Switching tabs cross-fades.
