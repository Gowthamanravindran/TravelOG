# Plan 48 — Expenses chart without react-native-svg (crash fix)

**Status:** ✅ Built

## Context
After Plan 47 the owner's phone crashed on Trip mode's Expenses:

> `Can't find ViewManager 'RNSVGCircle' nor 'RCTRNSVGCircle' in ViewManagerRegistry`

The donut chart drew with react-native-svg. That package's native part isn't in the app the owner runs, so drawing a circle crashed the screen. Plan 47 assumed it was safe because Expo Go includes it. That was wrong for the owner's installed app, and it broke the project rule that packages must fall back gracefully.

## Change
- `components/spend-chart.tsx` draws the donut with plain React Native views. Each slice is a half-ring rotated by its sweep, clipped to the right half, then turned to its start. Slices over 180° are drawn as two pieces. It uses the same `donutArcs()` slices, colours, gaps, legend and switch as Plan 47. It works in Expo Go, the development build and release builds alike.
- react-native-svg is removed from `apps/mobile/package.json`.
- `__tests__/expo-go-guard.test.ts` now also bans `react-native-svg`, so it can't come back by accident.
- `bundle-budget.json` goes back to its pre-Plan 47 baseline. Without the package the bundle is 5.57 MB, inside the original allowance.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. The guard test failed with the old chart and passes now.
- Rendered with react-native-web: By category, By person and a solo trip, matching Plan 47's look.
- `node scripts/check-bundle-size.mjs` after a fresh Android export: 5,573,947 bytes, within budget.
- Owner: `git pull && pnpm dev:go`, then open Trip mode → Expenses. No new build is needed.
