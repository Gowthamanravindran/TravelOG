# Plan 32 — No bounce; the booking form scrolls again

**Status:** ✅ Built

## Context
Owner feedback after Plan 31:
1. **Too much bounce.** Plan 28 used springs that overshoot. The owner wants a plain slide up from the bottom, especially for the booking form.
2. **After uploading a PDF, the booking form couldn't scroll,** so Save was out of reach. The Plan 31 bottom sheet sized to its content (`formSheet` + `fitToContents`) is capped at screen height on Android, and the scroll view inside it got no height to scroll in. A filled-in form is taller than the screen.

Owner choices:
- **Remove the bounce only.** Fades, the sliding pill and the list fade-in stay.
- **The booking form opens full screen, sliding up from the bottom.**

## Change
- **No springs anywhere.** `MOTION.spring` is replaced by `MOTION.ease`: 220 ms, eased out, no overshoot. It's used by the tab bar pill and the segmented-control pill.
- **Bottom sheets slide up and stop.** `sheetEntering()` in `ui/motion.tsx` drives the calendar, time and "Add a booking" sheets.
- **The celebration check and the photo selection badge** zoom in with plain timing.
- **The booking form** goes back to `presentation: 'modal'` with `slide_from_bottom`, and uses the scrolling `Screen` like the other forms. `SheetScreen` is removed.
- **Guard test** (`style-guard.test.ts`): no app file may use `springify(` or `withSpring`.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. The guard failed on 9 places before the change and passes after.
- Owner: `git pull && pnpm dev:go`. No new build is needed.
