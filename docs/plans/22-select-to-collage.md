# Plan 22 — Select photos, then make a collage ✅

**Status:** Built in the same commit as this file.

### Context
Adding photos and sharing now work. The owner wants one flow instead of separate "Photos" and "New carousel": **add photos → select any number → choose "Make a collage" (first option) or "Delete" → swipe through templates horizontally; tapping one shows a live preview of *your selected photos* in it → save**, with the title set automatically to the trip name plus a number. "Carousel" is renamed **"Collage"** in the UI for now (the owner will revisit the name).

### Flow
1. **Memories tab:** photos grouped by day as now. **Tap a photo to select it** (check badge and accent outline); "Select all" per day. While anything is selected, a floating action bar above the bottom bar shows **"Make a collage (n)"** (primary, first) and **"Delete"** (confirm; removes from the trip, not the gallery), plus "Clear". The "New carousel" button and the long-press-to-delete go away. Saved collages stay listed as "Collages".
2. **Make a collage** opens `studio/compose?photos=…`:
   - **Live preview** at the top: the whole strip of slides with your selected photos, scrollable sideways, seams shown.
   - **Templates in a horizontal, swipeable strip** below, each a small live thumbnail of *your* photos in that layout. Tap one to switch the big preview. Format toggle (4:5 · 1:1 · 9:16).
   - The slide count is chosen per template to fit the selection (the fewest slides whose slots hold all selected photos, up to 10), and unused empty frames are removed, so there are no blank holes.
   - Buttons: **Save & share** (creates the collage, opens Export) and **Fine-tune** (creates it, opens the editor).
3. **Title:** `<trip name> · <n>` where n is the next number for that trip (e.g. "Europe · 3"); renamable later.

### Changes
| Where | Change |
|---|---|
| `packages/core/src/studio/templates.ts` | `fitTemplate(template, format, photoIds, makeId, heading)`: pick slides to fit, fill in order, drop unused empty photo frames; tests for each template |
| `packages/db/src/repo/studio.ts` | `createProjectFromDoc(db, tripId, doc)`, `nextCollageTitle(db, tripId)` ("Europe · 3"); `deletePhotos(db, ids)` in `repo/photos.ts`; tests |
| `components/memories-view.tsx` | Selection state, selectable photo tiles, floating action bar; "Collages" naming; remove New carousel / long-press delete; delete also removes the app's file copies (`deletePhotoFile`) |
| `app/trip/[id]/studio/compose.tsx` (new) | Live preview + horizontal template strip (reuses `StudioCanvas`, `docFromTemplate`/`fitTemplate`, `COLLAGE_FORMATS`) + Save & share / Fine-tune |
| `app/trip/[id]/studio/new.tsx` | Removed (replaced by compose); route registration updated in `trip/[id]/_layout.tsx` |
| UI text | "carousel" → "collage" in Memories, editor, export screen |
| Tests | Select 3 photos → action bar → Make a collage → tap the "Film roll" template → preview updates → Save & share creates "Europe · 1" and opens Export; delete selected photos; core fit tests |
| `docs/plans/22-select-to-collage.md`, README | Plan log |

### Verification
`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (incl. the real-router navigation test); full `expo export` contains the compose screen. Owner: `git pull && pnpm dev:go` → Memories → select photos → Make a collage → swipe templates → Save & share. No new build needed.

### What was built (notes)
- Templates whose frame count doesn't grow with slides (Panorama) use a 3-slide strip; others use the fewest slides that hold the selection (up to 10).
- Collage numbers count every collage ever made for the trip, so a number isn't reused after a delete.
- The selection badge shows each photo's pick order, but collages use the photos in the order they were taken.
- The Memories tab scrolls itself so the selection bar can float over the photos.
