# Plan 24 — Layouts always visible while editing

**Status:** ✅ Built

## Context
In the Plan 23 editor the layouts strip was one tool among several, and selecting a photo or text
replaced it with that item's tools. The owner wants to choose layouts and edit in the same place,
applying a layout and checking it without switching back ("Keep layouts visible").

The same phone test reported two more things:
- **Rotating isn't smooth.**
- **The post looks bad in Instagram.** The owner's screenshot shows Instagram's new-post screen
  cropping the 4:5 slides to a square. Instagram does this to every carousel it receives. The
  sharing app can't choose the ratio, so the slides lose their top and bottom and stop joining up.

## Changes
- **Editor bottom area** (`app/trip/[id]/studio/[projectId].tsx`), top to bottom:
  1. **Layouts row, always shown:** a "Layouts" label, the format switch (4:5 · Square · 9:16) and
     a compact strip of live previews (`LayoutStrip compact`, 60 pt thumbnails). Tapping a layout
     applies it at once (Undo restores) and clears the selection.
  2. **Context tools below**, in a scroll area: the selected item's tools, or the Photos / Text /
     Stickers / Background / Slides chips. The separate "Layout" chip is gone.
- **Smoother gestures** (`components/studio/selection.tsx`):
  - The canvas is redrawn at most once per screen frame, always with the newest finger position.
    Before, it redrew for every touch event, which can be 120 a second.
  - Two-finger twist sorts fingers by id. Android can list them in a different order between
    events, which made the angle jump 180°. A turn across ±180° is also unwrapped.
  - The item tools show the committed item, so they don't re-render while dragging.
- **Instagram hint:** for 4:5 collages, the export screen says that Instagram crops carousels to
  square at first, and to tap **Ratio → 4:5** there.

## Verification
`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. New tests:
- Layouts are visible with nothing selected, with a photo selected and while cropping, and a
  layout applied from there takes effect.
- A format change while a photo is selected applies.
- Swapping finger order mid-twist doesn't rotate the item.

The full Android export is 5,172,430 bytes, within budget. Owner: `git pull && pnpm dev:go`.
No new build is needed.
