# Plan 82 — A flight through the stars while the globe starts

**Status:** ✅ Built, not yet seen on a phone · The owner's call · Replaces the sky of Plans 80–81

## Context
Plan 81's sky still looked flat: every star followed the same path out from the middle, the bright stars sat still on top of the moving ones, and nothing streaked. The owner asked for it to look like moving through stars, as in references of hyperspace travel.

## What the references share
Each star has a depth and is drawn by perspective (screen offset grows as 1/depth), so far stars are faint points near the middle and near ones are larger, brighter and rush past the edges. At speed the stars stretch into streaks with trails. Stars move at different speeds (parallax), stars coming round fade in from far away rather than popping in, and the point they come from glows faintly.

## Change
- **A 3D starfield:** 180 stars at different depths and speeds, drawn by perspective. Size and brightness follow depth.
- **Streaks:** each star draws a tail back to where it was a moment ago, fading towards the tail; long for near, fast stars, a point for far ones.
- **A speed curve:** it cruises, builds to warp after 0.7 s, and when the globe is ready it drops out of warp: the streaks shrink back to points while the sky fades and the globe travels in (Plan 80).
- **Behind it:** a dim field of distant stars so the edges are never empty, and a faint, smooth glow at the point the stars come from. The fixed bright twinkling stars of Plan 81 are gone.
- Reduce motion: still points, no flight.

## Checks
`star-warp.test.tsx` tests the star maths (`starAt`): near stars bigger, brighter and longer than far ones; far stars near the middle; streaks point away from it; at a stop streaks are points; stars coming round are faint; a moment of the flight fills every quarter of the sky with some stars out near the edges. Frames were also drawn in desktop Chrome with the same maths and looked at before handing over.
