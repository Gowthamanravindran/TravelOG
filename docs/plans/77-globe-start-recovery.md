# Plan 77 — The globe tries again when it fails to start

**Status:** ✅ Built, not yet seen on a phone · Cause on the owner's phone not yet known

## Context
On the owner's phone the globe sometimes does not load: the globe area stays empty and nearly black (the colour behind the globe). Until now a failed start showed that empty area for good, until the app was restarted, and a page that never reported anything was waited on forever. Nothing recorded why.

## Change
- **A failed start loads the map page again** after a second, up to three starts in a row. Only then is the empty area left.
- **A page that has not said it is ready within 15 seconds** counts as a failed start and is loaded again. Ready means the country shapes are in; satellite imagery is not waited for.
- **The last problem is kept:** Settings → About → This app build says "Globe: included. Last problem starting it: …", and it is written to the developer log (`[globe] …` in the Metro terminal).

## Next
When it happens again, the About line or the Metro log says why. That decides the real fix; this plan only makes the globe recover and report.
