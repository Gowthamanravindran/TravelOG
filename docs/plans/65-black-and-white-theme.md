# Plan 65 — A black and white theme, the default for new installs

**Status:** ✅ Built · Design: [`docs/superpowers/specs/2026-11-17-globe-home-design.md`](../superpowers/specs/2026-11-17-globe-home-design.md) (Part 1)

## Context
The owner asked for a simple black and white look for the app, to go with the globe home screen (Plan 66). The app is still in beta and the owner is trying themes, so Sunset and Colour block stay.

## Change
- **A third theme, `mono`** ("Black & white" in Profile → Appearance), in `packages/ui/src/themes.ts`:
  - light: white screens and cards, black ink; dark: black screens, near-black cards, white ink;
  - one ink accent in all three areas (home, plan, trip), so the areas no longer differ by colour in this theme;
  - icon tiles and art backdrops are greys; the 3D art keeps its colours;
  - red is kept only through the shared `danger` colour (errors, "too many days").
- **Default:** `DEFAULT_APPEARANCE.theme` is `mono`. Someone who already chose a theme keeps it; only people with no saved choice see the new default.
- **Tests:** the contrast and no-violet test covers the new theme; one test pins its black and white values; the "each mode has its own accent" test now expects one accent for `mono`.

## Known limits
- Spending categories all draw in one grey in this theme, so the spend chart tells them apart by label only.
