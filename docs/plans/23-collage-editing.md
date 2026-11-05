# Plan 23 — Edit collages directly: handles, frames, background, text ✅

**Status:** Built in the same commit as this file.

### Context
The owner wants to resize, rotate and crop photos, resize template frames, change the background (basic colours and gradients) and add/edit/delete text, including the trip title. The editor has most of these, but only behind "Fine-tune", while the Plan 22 compose screen only previews. Its gestures use gesture-handler v3 hooks, which may not respond reliably in Expo Go / older builds.

### Changes
- **Make a collage opens the editor** (project saved straight away as "<trip> · n") with the **Layouts** tool first: a horizontal strip of live previews of your photos; tapping applies the layout to the canvas (undo restores). Format switch there too. The compose screen goes away.
- **Selection handles** (React Native's own touch system, works in Expo Go and every build): drag the body to move, two fingers to pinch and twist, **four corner handles to resize** (photo frames and template frames resize freely; text corners scale the text), a **round handle above to rotate** (snaps to straight). Crop mode: drag pans the photo inside its frame, pinch zooms. The canvas stops scrolling while something is selected (tap the background to deselect and scroll).
- **Buttons as well:** Smaller / Bigger, Rotate ↺ / ↻ 15°, Straighten; in crop, Zoom − / +.
- **Background:** more colours and gradients in the Background tool.
- **Text:** "Add text" up front; tapping any text (including the template's title) selects it; edit, restyle or Delete.
- Pure maths in `@travelog/core/studio/transform.ts`: `resizeLayer` (corner handles in the layer's rotated frame, opposite corner fixed) and `rotateWithHandle`, with tests.

### Verification
`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (core maths, editor buttons, layouts strip, Make a collage → editor); full export contains the editor; the owner checks gestures on the phone with `pnpm dev:go`.

### What was built (notes)
- The editor's touch handling no longer uses gesture-handler v3 hooks (suspected cause of the reported crashes while editing): React Native's PanResponder drives move, pinch/twist, four corner handles and the rotate handle; the touch area is padded so handles outside the frame can be grabbed on Android.
- New stress tests drive every control and simulated finger drags (one and two fingers) on photos, text (incl. the template title), stickers, stats card, background, slides and every layout/format, failing on any console error or NaN. They found and fixed a bug: the first movement of a drag was dropped.
- "Make a collage" saves the collage and opens the editor on the Layouts strip; the separate compose screen from Plan 22 was removed.
- Template title text uses the trip's destination or name.
- Not verifiable here: how the gestures feel on a real phone; the owner checks with `pnpm dev:go`.
