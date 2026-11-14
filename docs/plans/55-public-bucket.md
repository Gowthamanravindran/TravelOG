# Plan 55 — A separate public bucket for destination photos

**Status:** ✅ Done (docs only)

## Context
Plan 53's owner steps (`docs/14` §3 step 6) said to turn on public access for `travelog-media-prod`. That bucket is planned (`docs/09`) for people's own photos and tickets, which must stay private: a public bucket lets anyone with a file's link read it.

## Decision
- Destination photos, and later any other image meant for everyone, go in a separate bucket, **`travelog-public`**. It is the only bucket that is ever public.
- `travelog-media-staging` and `travelog-media-prod` stay private. User media is served through short-lived signed links or a Worker that checks access, as `docs/09` already says.
- Public access is read-only: viewing a file needs its exact link, listing is not possible, and writes need the owner's Cloudflare login or an R2 token, never kept in the app or repo.
- To protect the free resize quota: allow transformations only for our own domain, with an optional rate limit on `/cdn-cgi/image/`. If the quota runs out, covers fall back to the 3D art.

## Changes
- `docs/14` §3: bucket creation, step 6 (public access, what it means, transformation limits, what to upload).
- `data/destinations/README.md`, `docs/08`, `docs/09`: name `travelog-public`.
- No code changes: the app only reads `EXPO_PUBLIC_MEDIA_URL`.
