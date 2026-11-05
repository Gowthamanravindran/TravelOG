# Plan 27 — Exported collage photos came out half see-through

**Status:** ✅ Built

## Context
The owner's exported slides had a photo drawn at reduced opacity, with the photo behind showing through it. This showed in Instagram and also in **Save all to gallery**, so it was in the saved image, not Instagram's editor. (An earlier reply guessed it was Instagram's editor; that was wrong.)

## Cause
On Android, React Native's `Image` fades every photo loaded from a file in over **300 ms** (`fadeDuration`, default 300; see `ReactImageView.kt`), starting after the photo loads. The export waits for each photo's load event, then two frames (about 33 ms), and captures. So a photo that loaded last was captured mid-fade, partly transparent. That's why it hit some photos and not others.

## Fix
- Collage photos (`components/studio/layer-view.tsx`) draw with `fadeDuration={0}`, at full opacity as soon as they load. The editor and export preview look the same as before, minus the fade.
- Test: `__tests__/studio-capture.test.tsx` checks every collage photo has no fade-in. It failed before the fix.

## Owner check
`git pull && pnpm dev:go`, export the same collage again, then **Save all to gallery**. Every photo should be solid. No new build is needed.
