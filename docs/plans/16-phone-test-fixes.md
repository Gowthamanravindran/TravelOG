# Plan 16 — Fixes from the owner's phone test ✅

**Status:** Built on `claude/kind-allen-2woote`: film fix `190e585`, Instagram `c1f8be5`, icons `eb0f141`, trip setup `12f9284`, build check + docs (the commit that adds this file).

### Context
The owner tested on Android and reported:
1. Emoji are used everywhere; they want **professional icons**.
2. The **film strip** layout errors as soon as it is created.
3. After creating a trip there's **no clear way to add a budget, people or other details**. The creation form itself is fine.
4. **Post to Instagram opens Instagram's home feed** without the photos.

Findings (read-only investigation):
- Icons: `expo-symbols` (already installed) draws SF Symbols on iPhone and Google Material Symbols on Android (font asset ~1 MB, not JS). All 4,055 Material names we need exist (`flight`, `luggage`, `account_balance_wallet`, `how_to_vote`, `photo_library`, …). No new package.
- Film error: the core template builds fine for every format and slide count (checked). The likely cause is Android rejecting a **dashed border with uneven side widths**. The old Plan 13 "Film strip" drew one, and the Studio seams still draw `borderLeftWidth: 2` + `borderStyle: 'dashed'` (`studio-canvas.tsx`). "Film strip" is the Plan 13 name (the Studio calls it "Film roll"), so the phone may still have an older build. Both are fixed, and the build check is in the owner steps.
- Budget: editing hides behind a small "Edit" link next to "By category" and exists only in Plan mode (`budget-view.tsx`); people can only be added from trip settings (`trip/[id]/edit.tsx`).
- Instagram: home feed means the share either didn't reach Instagram's post screen (older build: the Plan 13 share sheet), or Instagram's matching activity ignored the images.

### Changes
| # | What | Where |
|---|---|---|
| 1 | **Icon system:** `<Icon name=…>` with one semantic map (e.g. `flight → {ios:'airplane', android:'flight'}`); tinted by the theme, with an accessible label when it stands alone. Replace emoji in tab bars, buttons, item types, budget categories, booking types, poll types, the trip header, empty states, the error screen, Studio tools and the export screen. Kit `Button`/`Chip`/`Empty` get an `icon` prop. | `ui/icon.tsx`, `lib/labels.ts`, `ui/tab-bar.tsx`, `ui/kit.tsx`, screens and components using emoji |
| 1b | **Trip icon** instead of a trip emoji: a picker of travel icons (luggage, beach, mountain, city, road trip, flight, train, camping, food, festival). Stored in the existing `trips.emoji` column as an icon key; old emoji values map to luggage, so no migration is needed. | `trip-form.tsx`, `trip-card.tsx`, `trip-header.tsx`, `lib/labels.ts` |
| 1c | **Studio stickers become icon stickers** (travel icons drawn in a colour you pick). Old emoji stickers in saved projects still draw. | `core/studio/model.ts` (sticker `icon` + `color`, tolerant parse), `layer-view.tsx`, `panels.tsx` |
| 2 | **Film fix:** draw dashed lines (Studio seams, the new-carousel strip, the crop outline) as short solid segments, never non-uniform dashed borders. Add a screen test that opens the editor and the export screen for **every template in every format**, so a render error in any layout fails CI. | `studio-canvas.tsx`, `selection.tsx`, `studio/new.tsx`, new test |
| 3 | **Set up after creating a trip:** the new trip opens on a **"Set up your trip" card** at the top of the Itinerary tab: Add people · Set budget · Add bookings · Plan day 1. Each shows a tick when done; the card can be dismissed (per trip, device setting). The Budget tab gets a clear **Set budget** button (also in Trip mode) and a **People** row to add travellers inline (name + optional UPI). | `components/trip-setup.tsx`, `itinerary-view.tsx`, `budget-view.tsx`, `new-trip.tsx` (open Plan mode) |
| 4 | **Instagram on Android:** target Instagram's **feed share screen** explicitly. Look up Instagram's share activities for the multi-image intent and pick the feed one (not Stories / Direct). If none is found, show Android's chooser limited to Instagram (Feed / Story / Chats). After handing off, the screen says "Instagram should show your N slides. If it didn't, tap **Save & open Instagram**". That button saves all slides to the gallery in order and launches Instagram, so you pick them there (works on every Instagram version). | `modules/social-share/android/…/SocialShareModule.kt` (new `openInstagramFeed`, `launchApp`), `lib/social-share.ts`, `share-actions.tsx` |
| 5 | **Know which build is installed:** Profile shows the app build's commit / build date and whether the sharing module is present, so "old build" problems are obvious. | `(home)/profile.tsx`, `app.config.ts` (`extra.gitCommit` from EAS env) |

### Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`; new tests: every template × format renders in the editor and export; icon map has a name for both platforms for every key; trip setup card ticks and hides; budget and people can be added from the Budget tab in both modes; social-share Android flow picks the feed activity and falls back to save + open.
- Android bundle within budget (icons add a font asset, not JS).
- `expo prebuild` in a scratch copy still clean.
- Owner: build with **development** or **preview** from `claude/kind-allen-2woote` (check Profile shows the new build), then re-test film roll, trip setup and Post to Instagram.

### What was built (changes from the plan above)
- **5 (build check):** Profile shows what the installed build can do (no sharing module / Plan 15 module / Plan 16 module), not a commit hash. With a development build, the app's config comes from the computer's dev server, so a hash there wouldn't describe the installed app.
- **Not verifiable here:** the Android dashed-border fix and the Instagram feed targeting need a phone; jest can't reproduce either. Every layout × format now renders in tests.

### Owner test (Android)
1. Run **Actions → EAS build (Android development)** (or `preview`) on `claude/kind-allen-2woote`, uninstall the old app, install the new one. **Profile → This app build** should say "Up to date".
2. Icons everywhere, no emoji; create a trip and pick an icon.
3. After **Create trip**: the "Set up your trip" card → Add people, Set a budget, Add bookings, Plan the first day.
4. Memories → New carousel → **Film roll** → Create: opens without errors.
5. Export → **Post to Instagram**: Instagram's new-post screen should show the slides. If not, use **Save & open Instagram** and say which screen Instagram showed.
