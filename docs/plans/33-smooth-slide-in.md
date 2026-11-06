# Plan 33 — Slide-ins land smoothly (no jump at the end)

**Status:** ✅ Built

## Context
The owner saw every slide-in go past its place and then drop suddenly after a render. It happened on the small sheets (calendar, time, "Add a booking") and on the full-page forms (booking, expense, stop, poll, trip edit). Plan 32 had already removed the springs, so the cause was layout changing during or right after the animation.

## Causes
- **Full-page forms:** `Screen` used the native `SafeAreaView`. On Android it works out the status-bar and gesture-bar padding from where it sits on screen. While a page slides in it sits lower, so it got no top padding, and the content rode high. When the slide ended the padding appeared and the content dropped. The trip header and the collage editor and export screens used it too.
- **Small sheets:** they were plain React Native `Modal`s, which aren't edge to edge, in an edge-to-edge app. Their window settled after the first frame, while Reanimated's slide-in could draw one frame in the final place first.

## Change
- **`ui/inset-view.tsx` `InsetView`** pads by the insets from the app's root provider, which don't change while a page moves. It replaces every `SafeAreaView`: `Screen`, the trip header, the collage editor and the collage export screen.
- **`ui/bottom-sheet.tsx` `BottomSheet`** is now the only way a sheet is drawn. The modal is edge to edge from its first frame (`statusBarTranslucent`, `navigationBarTranslucent`). The sheet starts below the screen and slides up (300 ms, eased out) only after it has been measured, and the backdrop fades with it. With Reduce motion on it just appears. The calendar, time and choice sheets use it.
- **Guards** (`style-guard.test.ts`): no `SafeAreaView` in the app, and `<Modal` only inside `bottom-sheet.tsx`.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. The guards failed before the change and pass after. New tests cover the sheet (open, backdrop close, not dismissable while busy) and the inset padding.
- Owner: `git pull && pnpm dev:go`. No new build is needed.
