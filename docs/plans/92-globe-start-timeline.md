# Plan 92 — Where the globe's start-up time goes

**Status:** ✅ Built, waiting on numbers from the owner's phone · Follows Plans 79 and 89

## Context
The owner's log showed `Map made no progress for 5 s after “library”`, then `ready in 1295 ms` on the retry. Once running, the page is ready in about 1.3 s; the problem is a stall on some starts, and the time before the page runs at all, which nothing measured.

## What was ruled out
Loading the page as files instead of one 1.9 MB string, so the browser could keep its compiled code between launches, does not work: Chromium caches compiled code only for scripts loaded over http(s), not file://, and on Android WebView not reliably even then. Dropped.

## Change
- The page reports two more steps between the map library and the map: `sky` (its background stars are drawn) and `creating` (just before the map is made, with the globe's size). A stall after `creating` is the map being made (the drawing context, the first time after launch with a cold graphics process); a stall before it is the page's own work.
- The app times each step from when the globe was made, which includes the browser starting and the page arriving.
- The development log after each start: `[globe] ready in 1295 ms (page started 800 ms after the globe was made; data +115, library +280, sky +20, creating +10, map +470, ready +395)`.
- A stall names its step and the globe's size: `Map made no progress for 5 s after “creating” (390×260)`; a page that never ran says `Map page never started within 5 s`.

## Next
The owner sends a few of these lines from cold starts (app fully closed first); the fix follows from which step is slow.
