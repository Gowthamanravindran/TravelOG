# Plan 26 — App redesign: Sunset and Colour block themes

**Status:** ✅ Built

## Context
The owner asked for a redesign of the phone app on the principles of the design-taste-frontend skill: a new look with the same screens and navigation.

Findings:
- **Skill safety.** The skill is safe: it reads no secrets and runs nothing on install. Its files are for websites, so nothing from it is copied into the app.
- **Fonts.** The app's fonts were never loaded.
- **Violet.** The Plan-mode indigo and the navy neutrals are in the violet band the skill bans.
- **Contrast.** White on the Home coral was only 2.9:1.

## How the direction was chosen
The owner reviewed live mock pages (https://claude.ai/artifact/KSicGSuSPm6xfjabrEvYh9, private):
1. "Warm & calm" was found too bland.
2. Four brighter schemes (Sunset, Monsoon, Bazaar, Coastal) followed.
3. Four bold themes followed (Poster, Night market, Colour block, Signal).

The owner chose **Sunset** and **Colour block**, switchable in settings, plus a **Light / Dark / Match phone** switch, with **Trip mode following the switch**. Until now Trip mode was always dark.

## Spec
[`docs/superpowers/specs/2026-11-05-app-redesign-design.md`](../superpowers/specs/2026-11-05-app-redesign-design.md)

## Built
Implementation plan: [`docs/superpowers/plans/2026-11-05-app-redesign.md`](../superpowers/plans/2026-11-05-app-redesign.md), built in seven tested commits:
1. Theme data with a contrast and violet test.
2. Fonts, loaded.
3. The appearance setting, with the collage editor kept dark.
4. Kit components, tab bar, tiles and header band.
5. Colours taken from the theme only.
6. Profile → Appearance.
7. Docs.

Owner: `git pull && pnpm dev:go`, then try both themes × Light / Dark / Match phone. No new build is needed.
