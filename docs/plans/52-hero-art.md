# Plan 52 — 3D hero art across the app, with proper licences

**Status:** ✅ Built · Design: [`docs/superpowers/specs/2026-11-13-hero-art-design.md`](../superpowers/specs/2026-11-13-hero-art-design.md)

## Context
The owner found the app empty and not fun. Two rounds of mockups followed:
- **Round 1:** code-drawn scenes and free 2D illustration sets, both rejected as basic.
- **Round 2:** 3D objects, approved.

Real destination photos for trip covers come later (an open item in `docs/07`); they need a photo service and network access. The owner also asked for the art to be licensed properly.

## Change
- **Art:** 23 Microsoft Fluent Emoji 3D objects (MIT) in `apps/mobile/assets/art`, unmodified 256×256 PNGs, about 0.8 MB. Alongside them:
  - Microsoft's `LICENSE`;
  - `SOURCE.md`, mapping each file to its path in the Fluent repository.
- **`ui/art.tsx`:**
  - `Art`: an object that floats gently, still with Reduce motion, hidden from screen readers;
  - `ArtBackdrop`: a theme-tinted gradient.
- **Trips:** each trip's object follows its trip type (`tripArt` in `lib/labels.ts`), and a new **Desert** type was added. Objects show:
  - on trip cards (on a gradient);
  - in the trip header's tile;
  - on Trip mode Today, as a greeting hero ("Good morning", by the trip's local time).
- **Welcome screen:** a world map with a plane and sparkles.
- **Empty screens:** `Empty` takes `art`, and every empty screen has its object (trips, day and ideas, bookings, documents, expenses, memories, polls, Today, Nearby, Feed, Explore, Settle up). The texts are unchanged.
- **Licences:**
  - `pnpm licenses:build` (`scripts/licenses/build.mjs`) writes:
    - `assets/licenses.json`: the 663 open-source packages the app ships, with their licences;
    - `assets/notices.json`: art, fonts, icons and place data, with **full licence texts read from their own files**;
    - `THIRD_PARTY_NOTICES.md` at the repo root.
  - Profile's "Place data" card is replaced by **Licences and credits**. It opens a screen with each notice (licence text expandable, source link) and the package list.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` and `pnpm check:native`. No new native packages: expo-image and expo-linear-gradient were already in the app.
- New `hero-art.test.tsx`:
  - every trip type has its object, and unknown or legacy icons fall back to the suitcase;
  - cards and empty screens show their art;
  - greetings by time;
  - Microsoft's licence ships next to the art, and every image is in `SOURCE.md`;
  - every app dependency is in the licence list (it fails until `pnpm licenses:build` runs);
  - the Licences screen shows all notices and the full MIT text.
- Rendered with the real components (react-native-web): trip cards, header, empty screens light and dark, welcome, Licences.
- Owner: `git pull && pnpm dev:go`. No new build is needed.
