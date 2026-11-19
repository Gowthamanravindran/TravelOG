# Plan 81 — A fuller night sky while the globe starts

**Status:** ✅ Built, not yet seen on a phone · The owner's call · Follows Plan 80

## Context
Plan 80's sky looked like plain white dots coming out of the middle, and the edges were empty: every star started at the centre and moved slowly at first.

## Change
- **A fixed field of stars out to every edge**, as dense as the globe's own sky (one per 800 square points, at most 320), drifting slowly closer while the globe loads.
- **Twelve bright stars** with a soft glow that twinkle at their own pace.
- **More stars streaming past** (96, was 64), starting a little way out from the centre.
- **Tints as in the globe's sky:** mostly white, a quarter blue-white, a few warm. The two tints now live in the globe's theme (`starCool`, `starWarm`), so the app takes them from there.
- Reduce motion: all still, as before.

## Checks
`star-warp.test.tsx`: at least 180 fixed stars reaching every edge with each quarter of the sky filled, at least 8 bright stars, at least 90 streaming. The recovery tests run with Reduce motion on, since they fast-forward the clock.
