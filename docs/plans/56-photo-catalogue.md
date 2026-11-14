# Plan 56 — Destination photo catalogue in Supabase

**Status:** 📝 Decided; build before beta (Phase 8). Docs corrected now.

## Context
In Plan 53, destination photos are listed in `data/destinations/destinations.csv`, turned by `pnpm media:destinations` into `apps/mobile/assets/destinations.json`, and bundled in the app. Adding or changing a photo therefore needs an app release, which isn't production-ready. Production apps keep a backend catalogue of place → photo (or use a place-photo API) and the app asks it.

Also, `docs/14` said the free `r2.dev` address would do until the domain exists. Cloudflare image resizing doesn't work on `r2.dev`, so covers would stay on the 3D art. The owner chose to set up the domain, the bucket and the photos before beta.

## Decision
Move the catalogue to Supabase; keep R2 (`travelog-public`, Plan 55) for the files and `RemoteImage` with the 3D art fallback (Plan 53) for display.

- **Table** `destination_photos(id, place_id, names text[], country, key, blurhash, width, height, credit, license, source, created_at)`:
  - indexes on `place_id`, `country`, and a GIN index on `names`;
  - RLS: anyone (anon included) may read; only the service role writes;
  - pgTAP test in the same change.
- **Owner script** `pnpm media:add`, run locally with the R2 token and the Supabase service key from the shell environment (never committed): uploads to `travelog-public` as `destinations/<file>`, computes BlurHash and size (helpers from `scripts/media/destinations.mjs`), inserts the row.
- **Matching** in an RPC `cover_for(place_id, destination, country)`: exact place id, then the normalized first part of the destination name, then the country. Same rules as `coverFor` in `apps/mobile/src/lib/destinations.ts`.
- **App:** on trip create, and on a later online refresh, call the RPC and store the cover on the trip (new local columns via a Drizzle migration, synced like other trip fields), so covers work offline. When this works, retire the bundled `destinations.json`, the CSV and `pnpm media:destinations`; the Licences screen reads credits from the stored covers.
- **Later, optional:** a place-photo API as an extra source when nothing in the catalogue matches, if the cost makes sense.

## Changes now
- `docs/14` §3 step 6: before beta; custom domain required, `r2.dev` off; the photo steps point at Plan 56.
- `docs/07`: the open item rewritten.
- `docs/09`: the Destination photos row.
- `data/destinations/README.md`: marked interim.
