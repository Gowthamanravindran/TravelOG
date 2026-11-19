# Plan 79 — The globe's start: progress, not a fixed limit, and no silent dark area

**Status:** ✅ Built, not yet seen on a phone · The owner's call · Follows Plan 77

## Context
Plan 77 reloaded the map page if it was not ready within 15 seconds. On the owner's phone this happened on development reloads and starts that had to build the bundle; the globe then came back by itself. But for those 15 seconds the app showed only a dark, empty globe area, which looks broken. A flat 5-second limit would cut off slow starts that were about to finish, and after three it would give up.

## Change
- **The map page reports each step of its start:** page running, data in, map library in, map created, map loaded, then ready.
- **A start is reloaded only after 5 seconds with no step at all.** A stuck page is caught in 5 seconds; a slow page that keeps reporting is left to finish. Three failed starts in a row still end in the fallback.
- **The stall message names the step:** e.g. "Map made no progress for 5 s after “map”" (Settings → About, and `[globe]` in the Metro log).
- **"Loading the globe…"** with a spinner shows in the globe's visible part until it is ready.
- **After giving up**, the globe area says "The globe couldn’t load." with **Try again**, instead of staying empty.
- **Development log:** `[globe] ready in N ms` after each start, to set the limit from real phones.

## Checks
`globe-recovery.test.tsx` (stall, slow-but-progressing start, silent page, loading note, give-up and try again); `scripts/globe/page-check.py` checks the page reports its steps in order in Chrome.
