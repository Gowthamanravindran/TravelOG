# Plan 83 — The star flight drawn in layers, so it runs smoothly

**Status:** ✅ Built, not yet seen on a phone · Follows Plan 82

## Context
On the owner's phone Plan 82's flight ran very slowly and looked stuck. Every one of its 180 stars was its own animated view, so each frame the phone updated 180 views one by one through the app's rendering layer.

## Change
- **Stars at one depth share a layer:** 12 layers of 18 stars (216 stars). A layer zooms out from the middle as it comes closer, which moves its stars exactly as perspective does; its points and its streaks are each one view.
- **Each frame updates 24 views** (two per layer: zoom and opacity), not 180. The stars inside are drawn once, at their nearest, and only scaled.
- The look is kept: far layers sit near the middle and fade in; near ones grow, brighten and spread past the edges; streaks show at warp and fade to points when dropping out of warp. The deep field behind is lighter (one star per 1,400 square points, at most 200).
- Within a layer, stars grow in proportion to their nearness (Plan 82 grew them more gently).

## Checks
`star-warp.test.tsx`: the layer maths (`layerAt`: nearer is larger and brighter, layers coming round are faint, streaks at warp and none at a stop), a moment of the flight fills every quarter with stars near the edges, at least 150 stars but at most 30 moving views. Frames drawn in desktop Chrome with the same maths were looked at before handing over. Smoothness itself can only be judged on the phone.
