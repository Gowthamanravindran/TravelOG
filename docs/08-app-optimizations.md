# 08 · App-Level Optimisations

How the app stays fast, light on data and battery, and small. These are rules for the build, checked in code review. Cost-side savings are in [06](06-cost-optimization.md).

## Startup
- **Hermes** engine (default) and the New Architecture.
- Splash screen stays only until the local database has opened and run its migrations, then the first screen renders from local data. **No network request on the startup path.**
- Routes load lazily (Expo Router), so code for Trip mode or the collage editor isn't parsed at launch.
- Fonts: two families, subset, loaded once.
- Target: first screen in under 1.5 s on a mid-range Android phone (measured in Phase 1 and on every release).

## Screens and rendering
- Every screen reads from the **local SQLite database** through live queries. Data appears instantly; sync updates it in the background.
- Long lists (expenses, feed, places) use **FlashList** with fixed item heights where possible and memoised rows.
- Animations run on the UI thread (Reanimated); no JavaScript-driven animation loops.
- Global state (Zustand) holds only UI state; components subscribe to the slices they use.
- Heavy screens (map, collage editor) mount only when opened and release memory on leave.

## Images
- **expo-image** with disk caching and blurhash placeholders.
- Lists load ~320 px thumbnails; full images load only on open.
- Photos are resized on the device before upload (already in [03](03-architecture.md)).

## Network and sync
- **Delta sync:** only rows changed since the last sync cursor (see [11](11-local-db-and-sync.md)).
- **Batched writes:** queued edits are sent together; text edits are debounced (500 ms).
- **No polling:** the server's Realtime channel is joined only for the trip that's open and only sends a "something changed" nudge, which triggers one delta pull.
- Feed and Explore are paginated (20 items) and cached; public pages are served from the CDN.
- Responses are compressed (gzip/brotli by default); RPCs return what one screen needs in one call.
- Requests retry with backoff and give up quietly offline; the outbox retries later.

## Battery
- Location runs **only while a trip is live and the user has opted in**, using significant-change and geofences around planned stops instead of continuous GPS.
- Background tasks stop when the trip ends; no background fetch for non-live trips.
- Map rendering pauses when the map screen isn't visible.

## Storage on the phone
- Image cache capped (e.g. 300 MB) with least-recently-used eviction.
- Offline map packs and ticket attachments for trips that ended more than 30 days ago are deleted automatically (re-downloadable).
- SQLite `VACUUM` occasionally after large deletes.

## App size and updates
- Avoid heavy libraries (no full lodash or moment; use date-fns and native APIs).
- Android App Bundle so each phone downloads only its architecture.
- **EAS Update** for JavaScript-only fixes; bytecode diffing keeps updates small. Native changes go through a store release.
- Track bundle size in CI and fail if it grows more than 10 % in one change.

## Server-side support for a fast app
- Indexes that match permission checks, e.g. `trip_members(user_id, trip_id)`.
- Permission helper `is_trip_member(trip_id)` written as `stable security definer` so Postgres can cache it within a query.
- Screen-shaped RPCs instead of many small queries.
- Edge-cached public itineraries, templates and Explore pages.

## Perceived speed
- Optimistic updates: votes, expenses and edits appear immediately; failures roll back with a message.
- Skeletons only on a first-ever load; afterwards cached data shows at once.
- AI answers stream; blueprint answers are instant.

## How we check
| Metric | Target | Tool |
|---|---|---|
| Cold start to first screen | < 1.5 s mid-range Android | Sentry performance + manual check per release |
| Dropped frames on lists | < 1 % | React Native perf monitor, Sentry |
| Crash-free sessions | > 99.5 % | Sentry |
| JS bundle size | No > 10 % jump per change | CI check |
| Data per active trip-day | < 5 MB excluding photos | Sync logs |
| Battery during a live day | No noticeable drain from location | Manual test on two phones |
