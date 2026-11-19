# Plan 80 — Arriving at the globe

**Status:** ✅ Built, not yet seen on a phone · The owner's call · Follows Plan 79

## Context
While the globe started, the owner saw a dark area with "Loading the globe…", and when it came the globe slid up from the bottom. The owner asked for the wait to feel like travelling to the globe.

## Change
- **While the globe starts**, the app draws a night sky over the globe's visible part: stars stream outward and speed up towards the edges, as when flying forward through them. It is drawn by the app, so it shows from the first frame, before the map page is running. "Loading the globe…" is added only if the wait passes 3 seconds.
- **When the map is ready**, it starts far away and small, and travels in to its full size in the visible part over 1.8 seconds, turning a little as it comes (it eases out; nothing bounces). The sky fades over 0.6 seconds as it arrives. A move already asked for (a country's page in Explore) flies in from far away in the same way.
- **No slide from the bottom:** the drawer's height reaches the globe before it arrives and is applied at once. Easing it was what made the globe slide up on every start.
- If the globe has to load again (Plan 79's retry), the sky comes back.
- **Reduce motion:** the stars stay still, and the globe appears at its size without travelling.

## Checks
`globe-recovery.test.tsx` (sky while loading, words after 3 s, arrive is the last thing sent, sky leaves and comes back). `scripts/globe/page-check.py`: the globe is small and centred before it arrives, grows while arriving, and ends at full size in the visible part.
