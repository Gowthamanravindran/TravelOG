# Plan 93 — Every cold start stalled for 5 s: the stars were drawn before the globe had a size

**Status:** ✅ Fixed, not yet seen on a phone · Found from the owner's logs (Plan 92)

## What was wrong
The owner's logs showed every cold start stalling right after the map library (`no progress for 5 s after “library”`), then a retry ready in about 1.2 s. The page starts before the globe has been given a size. Its first job after the library is drawing the background stars into a tile and copying it onto the page; with no size the tile is 0 × 0, and copying a 0 × 0 canvas throws ("The image argument is a canvas element with a width or height of 0"). Nothing caught it, so the page stopped before making its map and sat silent until the app reloaded it 5 s later; by then the globe had its size.

## Change
- The stars are not drawn while the page has no size; they are drawn on the first resize.
- Drawing the stars can no longer stop the start: the map is made whatever happens there.
- Any error nothing caught is reported to the app. Before the globe is ready it counts as a failed start, so the app tries again at once instead of after 5 s.

## Checks
`scripts/globe/zero-size-check.py` starts the page in a frame with no size, then gives it one: the page must make its map, report no error and come up. It fails on the old code with the owner's error and passes now. The page building for the desktop checks moved to `scripts/globe/globe_page.py`, shared by both checks.

Expected on the phone: a cold start in about 1.2–1.5 s instead of 6–7 s.
