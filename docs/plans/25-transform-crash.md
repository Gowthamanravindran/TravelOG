# Plan 25 — Crash when an item returns to straight

**Status:** ✅ Built

## Context
While editing collages the owner kept hitting a render error: `Cannot read property 'forEach' of
null` in React Native's `processTransform.js`, raised while the new renderer (Fabric) diffs style
props.

**Cause.** Three studio views set the rotation as
`transform: layer.rotation ? [{ rotate: … }] : undefined`. When rotation became exactly 0, the
prop changed from an array to `undefined`. Fabric then sent `null` for the removed prop, and the
transform check crashed on it. Rotation reaches 0 in several ways:
- snapping straight with the rotate handle or a two-finger twist;
- Straighten;
- Rotate left/right back to 0;
- Undo.

So the crash came during editing, never on first open. Jest doesn't run Fabric's prop diff, so the
earlier stress tests could not see it.

## Changes
- `components/studio/rotation.ts`: `rotationStyle(deg)` always returns an array, and draws NaN,
  Infinity or a missing angle as 0°.
- Used in `selection.tsx`, `layer-view.tsx` and `studio-canvas.tsx`.
- `__tests__/style-guard.test.ts` fails if any app file sets `transform:` to a conditional that
  can be `undefined`/`null`. It was shown failing on the three places before the fix.
- A new editing test rotates an item back to 0° with Rotate left, Straighten and Undo, and checks
  that every rendered transform is an array.

## Verification
`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (101 mobile tests); the full
Android export is within budget. Owner: `git pull && pnpm dev:go`. No new build is needed.
