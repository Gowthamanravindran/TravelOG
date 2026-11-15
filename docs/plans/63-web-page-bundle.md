# Plan 63 — The dev server's web page: blank, now a notice

**Status:** ✅ Built

## Context
With `pnpm dev:go` the owner saw a blank white screen, and Metro logged `Unable to resolve "./wa-sqlite/wa-sqlite.wasm" from expo-sqlite/web/worker.ts`.

Reproduced here:
- Expo Go's own request (the manifest, then the Android bundle) works.
- A browser request for the dev server's page returned 500 with that error. That's what you get when the QR code is opened with the phone camera or Lens instead of Expo Go.
- With `wasm` fixed, the page then failed to render, because the root layout calls `TurboModuleRegistry.get`, which doesn't exist on web.

**Why tests missed it:** Jest doesn't bundle, and CI and e2e build Android only. Nothing built the web page, which TravelOG doesn't support.

## Decisions
- `metro.config.js`: `wasm` added to `assetExts` (expo-sqlite's web worker).
- On web, the root layout shows a short notice ("TravelOG runs on your phone… scan the code from inside Expo Go"). It doesn't open the database or the native module lookups. No web support is promised.
- CI: a new step, **Export web page** (`expo export --platform web`), so a page that can't bundle or render fails CI.
- `docs/14` §5: scan the QR code from inside Expo Go.
