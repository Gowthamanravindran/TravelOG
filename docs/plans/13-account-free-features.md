# Plan 13 — More account-free features ✅

**Status:** Built in five commits on `claude/kind-allen-2woote` (M1 `e3a480c`, M2 `58328dd`, M3 `eba8387`, M4 `db63502`, M5 the commit that adds this file).

### Context
Plan 12 is pushed. The owner will test the new build in parallel and asked to keep building. Everything here works on one phone with no accounts or paid keys; anything that needs an account still waits.

### Milestones
| M | What | Notes |
|---|---|---|
| 1 | **Reminders** (local notifications): booking departures (flights/trains/buses 3 h before, others 1 h), itinerary items with a time (30 min before, Upcoming/Live trips), poll deadlines (1 h before); on/off in Profile | Planner is pure code in `packages/core` with tests; the phone re-schedules the next 50 after every change (iOS allows 64) |
| 2 | **Multi-currency expenses**: pick the currency paid; rate fetched from the free ECB-based Frankfurter API (no key), cached on the phone per day; offline → last saved rate or type one in; rate stored on the expense | New `fx_rate` column (migration 0001) |
| 3 | **Memories**: trip photo pool on the phone (`photos` table, synced later), collage editor with templates (grid, 1+2, 3×3, story with title), post (4:5) and story (9:16) exports, save to gallery, share sheet | Collages drawn with plain views and captured with `react-native-view-shot` instead of Skia: much smaller app, enough for templates; Skia stays the option for filters/stickers later |
| 4 | **Check-ins**: "I'm here" on Today items (optional one-off location, never in the background), day timeline with time spent between check-ins | Background location timeline waits for a battery test on a real phone |
| 5 | **Polish**: error screen with retry, accessibility labels/roles on the kit, empty states review | Forced-update screen needs `app_config` from the server → waits for Supabase |

### Moved back
Admin app skeleton: its only page edits `app_config` on Supabase, so it is built with accounts.

### Owner impact
New native modules (notifications, image picker, media library, sharing, view-shot, location) → one more Android build at the end of this plan.

### Verification
Per milestone: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`, Android export within budget (raise deliberately if needed), CI green.

### What was built (changes from the plan above)
- **M1 Reminders** as planned. Permission is asked only once there is something to remind about.
- **M2 Currencies:** the form asks for the rate (prefilled) instead of a second amount; the converted amount shows before saving. Migration `0001` adds `expenses.fx_rate`.
- **M3 Memories:** `photos` table (migration `0002`). Templates: grid, big + small, polaroids, film strip, trip stats; formats post / story / square. Completed trips now open on Memories; 📸 in the trip header otherwise. **Changed:** no "save to gallery" button. Saving goes through the share sheet ("Save image"), because the gallery library adds `READ_MEDIA_*` permissions that Google Play restricts. The Instagram Stories direct-share intent still waits for the Meta app id.
- **M4 Check-ins:** `check_ins` table (migration `0003`); "I'm here" on current/next stops, free check-in sheet, timeline with time spent (gaps over 6 h left unknown). Location off by default, foreground only.
- **M5 Polish:** app-wide error screen with "Try again" (also for storage failures at start-up), screen-reader labels for icon buttons, progress-bar semantics, field hints, 44 pt touch targets.
- Android bundle 3.81 MB; baseline raised deliberately (`bundle-budget.json`).

### Owner action
New native modules (notifications, image picker, sharing, view-shot, location): run **Actions → EAS build (Android development)** once more and install the new APK.
