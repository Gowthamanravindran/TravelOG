# Plan 15 — Memories tab + Studio (seamless carousel maker) ✅

**Status:** Built in seven commits on `claude/kind-allen-2woote`: M1 `3623b7b`, M2 `fd6011c`, M3 `e871dec`, M4 `c0236f3`, M5 `c0758ba`, M6 `3cace55`, and M7 (the commit that adds this file).

### Context
The owner wants an in-trip collage maker like **SCRL**: photos placed freely across a wide canvas that is cut into carousel slides, so the post scrolls seamlessly on Instagram. It should live as its own section inside each trip and post to Instagram and Facebook. Plan 13 already built a basic version (photo pool + one-page collage templates, opened from 📸 in the trip header). This plan replaces that with a full editor.

**Decisions (asked):**
- **Placement:** a **Memories** tab in both Plan mode and Trip mode, holding the photo pool, the Studio and saved projects. The 📸 header button goes away.
- **Posting:** hand the slides off to the Instagram / Facebook apps, as SCRL does. Personal accounts can't be posted for: Meta's publishing API covers only Business/Creator accounts, after app review.
- **Pricing:** everything free for now, with a small "Made with TravelOG" mark on the last slide. Premium templates and HD export are noted as Plus candidates for when payments exist.

### What the person gets
1. **Memories tab:** the photo pool, grouped by day (existing); "New carousel" (format 4:5, 1:1 or 9:16, 1–10 slides, pick a template); a grid of saved projects (thumbnail, slides, edited date; long-press to duplicate or delete). Completed trips open here.
2. **Studio editor** (full screen, dark):
   - One wide canvas with dashed seams and slide numbers; scroll sideways; pinch to zoom out and see the whole strip.
   - Photos: drag in from the trip tray; move, pinch-resize and rotate with two fingers, across seams; double-tap to crop (pan/zoom inside the frame). Snapping to slide edges, centres and other items, with guide lines.
   - Text (fonts, size, colour, alignment), emoji stickers, and a **trip-stats sticker** (days, stops, people, ₹ spent; reuses `tripRecap` from `packages/db/src/repo/photos.ts`).
   - Frames: border, rounded corners, shadow. Background: colour or gradient.
   - Slides: add, remove, reorder. Layers: forward/back, duplicate, delete. Undo/redo. Autosave.
   - **Templates:** seamless ones (Panorama across all slides, Bridge over the seam, Film roll, Polaroid scatter, Split grid) plus the Plan 13 one-page templates. Each is filled automatically with photos spread across the trip days (reuses `pickForCollage`, `packages/core/src/collage.ts`).
3. **Export and post:** every slide at exact size (1080×1350 / 1080×1080 / 1080×1920), shown in a swipe preview, then:
   - **Instagram post:** Android opens Instagram's new-post screen with all slides in order. iPhone saves them to Photos in order and opens Instagram; you pick them there (Instagram doesn't accept several images from other apps on iOS).
   - **Instagram Story:** the current slide, direct. Shown only once the Meta App ID is set (`EXPO_PUBLIC_FACEBOOK_APP_ID`, docs/14 §12).
   - **Facebook:** all slides through Facebook's share screen; on iPhone via the share sheet.
   - **Save all to gallery** (Android, no photo-read permission) and **Share…** (all slides through the system sheet: WhatsApp and others).

### How it's built
| Layer | What | Reuses |
|---|---|---|
| `packages/core/src/studio/` (pure, tested) | Project document (format, slide count, background, layers: photo / text / sticker with position, size, rotation, crop, style) in canvas units (one slide = 1080 wide); `parseProject` (versioned, tolerant); templates → layers; slice rects per slide; which layers touch each slide; snapping; edit operations with undo/redo history | `collageLayout`, `COLLAGE_FORMATS`, `pickForCollage` (`collage.ts`) |
| `packages/db` | `studio_projects` table (trip, title, format, slide count, `doc` JSON, local thumbnail, exported_at), sync-ready like every other table (device migration `0004`); repo: create, save document, list, duplicate, delete | `insertRow`/`updateRow`/`deleteRow` (`src/db.ts`) |
| `apps/mobile` screens | `trip/[id]/plan/memories.tsx` and `trip/[id]/live/memories.tsx` (one shared `MemoriesView`, moved from `trip/[id]/memories.tsx`); `trip/[id]/studio/[projectId].tsx` editor; `trip/[id]/studio/export.tsx` preview and post. Completed trips redirect to `plan/memories`. Remove 📸 from `trip-header.tsx`, the old `collage.tsx` and `collage-canvas.tsx` | `pickPhotos`, `deletePhotoFile` (`src/lib/photos.ts`), `ModeTabBar`, UI kit |
| Gestures | `react-native-gesture-handler` + `react-native-reanimated` (already installed): pan/pinch/rotate run on the UI thread and are written to the document when the gesture ends | — |
| Export | Each slide drawn as a window onto the canvas, sized `1080 / PixelRatio` points, and captured with `react-native-view-shot` at exact pixels. What you see is what you post, text and emoji included. No Skia: keeps the app small. Skia is the fallback only if the device test shows capture problems. | `react-native-view-shot` (installed in Plan 13) |
| Native sharing | Small local Expo module `apps/mobile/modules/social-share` (Kotlin + Swift) with a config plugin: Android multi-image intents to `com.instagram.android` and `com.facebook.katana`, Story intent, save to gallery via MediaStore (no read permission), multi-file share sheet, and `<queries>` for package checks. iOS: save to Photos (add-only permission), open `instagram://library`, Stories via pasteboard + `instagram-stories://`, multi-item share sheet, `LSApplicationQueriesSchemes`. | Replaces single-file `expo-sharing` for these flows |

### Milestones (each committed with tests)
1. Core studio model, templates, slicing, snapping, history: Vitest.
2. `studio_projects` table + repository: Vitest on real SQLite.
3. Memories tab in both modes, projects list, new-carousel sheet; old collage and 📸 removed: screen tests.
4. Editor: canvas, seams, selection, gestures, crop, text, stickers, background, slides, undo/redo, autosave: screen tests for tools and saved results; gesture feel checked on the phone.
5. Export: exact-size slides, progress, swipe preview, "Made with TravelOG" mark on the last slide.
6. Social-share module + plugin: Instagram post / Story, Facebook, gallery, share sheet. Check `expo prebuild` output (manifest queries, Info.plist keys).
7. Docs (01 §6 Memories, 09 stack: Skia → view-shot + native module, 11 table list, 13 Phase 5 note, 14 §12 App ID use), plan log `docs/plans/15-studio.md`, bundle budget, owner test checklist.

### Owner
- One new development or preview build when M6 lands (new native module). Test on your Android phone: post a 3-slide carousel to Instagram and to Facebook, save to gallery.
- Optional: Meta App ID (docs/14 §12) to switch on Instagram Story sharing.
- iPhone flows need the Apple Developer account first.

### Risks
- Instagram/Facebook share intents aren't formal APIs and can change. Every path falls back to "save to gallery + open the app" and the system share sheet.
- Capturing slides that are off screen can come out blank on some Android phones. Slides are rendered inside the window behind the preview; Skia is the fallback.

### Verification
`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` per milestone; Android export within budget; `expo prebuild` in a scratch copy shows the module, plugin entries and no `READ_MEDIA_*` permissions; CI green; owner device test as above.

### What was built (changes from the plan above)
- As planned, with these notes:
  - **Gestures** use react-native-gesture-handler v3 (hook API), running on the JS thread so snapping can draw guide lines. It pulls in Reanimated/Worklets, so the Android bundle grew from 3.81 MB to 5.11 MB. The budget was raised deliberately: both are in the planned stack (docs/09), and they handle "drag a photo vs scroll the canvas" natively.
  - **Export** draws each slide at `1080 / pixel ratio` points and captures it with view-shot at exact size, waiting for that slide's photos to load. No Skia.
  - **Native module** `apps/mobile/modules/social-share` (Kotlin + Swift) with a config plugin. It wasn't compiled in this environment (no Android SDK / Xcode); `expo prebuild` and autolinking were checked, and the first real compile is the next EAS build.
  - **Device migration `0004`** adds `studio_projects`.
- Two bugs found by tests and fixed: undoing back to the saved state could still save the undone change; the editor tests also covered an un-awaited text edit.

### Owner test on an Android phone (after a new build)
1. Run **Actions → EAS build (Android development)** (or `preview`) on `claude/kind-allen-2woote`, then install. This build adds the native module and gesture handling.
2. Open a trip → **Memories** tab → add 6+ photos from different days.
3. **New carousel** → 3 slides → Bridge → Create. Drag a photo across a dashed seam, pinch, twist; select a photo → Crop → pan/zoom; add a Heading and a sticker; Undo/Redo; Close and reopen (it's saved).
4. **Export** → swipe the preview → **Post to Instagram**: Instagram should open its new-post screen with the 3 slides in order. Also try **Share to Facebook** and **Save all to gallery** (check Photos → Pictures/TravelOG).
5. Optional: add `EXPO_PUBLIC_FACEBOOK_APP_ID` (docs/14 §12), rebuild, then try **Instagram Story**.
Report anything that doesn't open or looks off (screenshots help).
