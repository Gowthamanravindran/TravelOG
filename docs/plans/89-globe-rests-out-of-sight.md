# Plan 89 — The globe rests while out of sight, and stops reloading behind trips

**Status:** ✅ Built, not yet seen on a phone · Found by the owner: the globe redrew after every trip, and the whole app felt slow

## What was wrong
- **The globe started again behind every trip.** With a trip open over the tabs, the phone can take the globe's drawing context away. The map page counted a context not back within 3 seconds as a crash, and the app reloaded the whole page (about 1 MB of map code, the star flight, the fly-in) behind the trip screen, slowing it, and again on coming back.
- **The page never rested.** It asked for a frame 60 times a second even with nothing moving, to measure smoothness.
- A slow start counted while hidden too, so retries could run behind other screens, and the star flight kept its frames running there.
- Each globe start mounted about 650 views for the star flight, 216 of them gradient views, the heaviest kind.

Measured in tests, the app's own screens were not the cause: idle for 10 seconds they did no work, and a trip opened and closed kept the same globe.

## Change
- The app tells the globe when it is out of sight (a screen over the tabs, or the Feed tab). Hidden, losing the drawing context is not a crash; the map library restores it on coming back. Only a context still gone 3 seconds after coming back into sight is a crash. A reload asked for while hidden waits until the globe is back in sight.
- A slow start does not count while hidden, and the star flight stops while hidden.
- The page asks for frames only while the globe moves: at rest, none.
- A streak's fading tail is two plain shapes instead of a gradient view; frames drawn in desktop Chrome look the same.

## Checks
`globe-hidden.test.tsx` (told when hidden and shown; a crash while hidden waits; a slow start while hidden does not count). `scripts/globe/page-check.py`: `idle_quiet` (0 frames asked for in a second at rest), `hidden_no_crash` (context lost while hidden and restored: no crash), `shown_lost_crashes` (in sight, a lost context still reloads).
