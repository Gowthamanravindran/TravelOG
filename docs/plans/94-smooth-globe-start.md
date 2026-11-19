# Plan 94 — No dark screen and no jump when the globe starts

Reported with a screen recording after Plan 93: the start was faster, but
1. a dark screen showed before the stars appeared, and
2. the globe flashed up once, then jumped, before it settled.
The recording also showed the whole globe flashing full screen when going from Feed back to Trips.

## Causes
- **Dark screen.** The star animation waited to measure its own size before drawing any star, so the
  first frames were the bare night colour.
- **Flash and jump.** The map was visible while it loaded. It drew a frame at the library's default
  place and size before it was moved far away, and the flight in was timed from before the first
  frame it was seen in. That frame can be slow to draw, so the flight jumped ahead when it showed.
  Once that frame took longer than the pause before the auto-spin, the spin also took over the
  camera half-way in and the globe stopped while it was still small.
- **Feed → Trips flash.** The globe stage was unmounted on Feed, so coming back it started again at
  full size before the drawer covered it.

## Changes
- `star-warp.tsx`: stars are placed in percentages of the screen and drawn on the first frame, with
  an assumed size until the real one is measured; a deeper field of 170 faint stars fills the sky.
- `globeHtml.ts`:
  - the map stays hidden (`opacity: 0`) until it arrives;
  - it is created far away and put there again when ready;
  - `arrive()` shows it, then starts the flight two frames later, once the first visible frame is
    drawn;
  - the spin is held off from when the flight starts, not from when `arrive()` was called.
- `(home)/_layout.tsx`: the globe stage stays mounted, hidden, on tabs without it, and keeps the last
  tab it showed.

## Checks
- `scripts/globe/page-check.py`:
  - new checks `hidden_until_arrive`, `shown_on_arrive` and `creating_has_size`;
  - `arrive_moves` now waits for the flight to begin, since the software renderer can take over a
    second for that first frame. With the old pause it timed out, because the spin stopped the flight.
- App tests for the star field drawing before layout and the stage kept on Feed.
