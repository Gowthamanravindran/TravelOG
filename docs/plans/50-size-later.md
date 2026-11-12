# Plan 50 — App size: track it, don't block on it (for now)

**Status:** ✅ Built

## Context
After Plan 49 the owner decided not to worry about app size until most of the planned app is built. Two things still acted on size:
- CI's bundle check failed the build past +10% of the baseline, and the app was already at +9.1%.
- The e2e workflow tested a second, tree-shaken release variant only to check a size saving that is now on hold.

## Change
- **`scripts/check-bundle-size.mjs` reports, it doesn't fail.**
  - It prints the size and the change against the baseline in every CI run.
  - Past the limit it adds a GitHub warning and exits 0.
  - `BUNDLE_BUDGET_ENFORCE=1` restores failing (one line in `ci.yml` when the time comes).
  - `BUNDLE_BUDGET_FILE` lets a test point it at another budget file.
- **`bundle-budget.json`:** the baseline is unchanged, so the % keeps showing growth since Plan 15. Its note records the pause.
- **`.github/workflows/e2e.yml`:** back to one job, the normal release build, like the owner's preview and production builds. Nightly CI time halves.
- **Unchanged:**
  - tree shaking stays off in builds;
  - the gesture-handler lookup in `app/_layout.tsx` stays, so turning tree shaking on later doesn't bring back the launch crash.
- **`docs/08`** and **`CLAUDE.md`** say size is tracked, not enforced, until it's revisited before beta (Phase 8), with the options Plan 49 measured.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.
- The size script on a fresh export:
  - it passes as usual;
  - with a lowered baseline it warns and still exits 0;
  - with `BUNDLE_BUDGET_ENFORCE=1` it exits 1.
- CI green; one e2e run passes the full flow.
