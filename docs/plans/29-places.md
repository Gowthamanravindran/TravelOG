# Plan 29 — Places autocomplete: our own places database

**Status:** ✅ Built (the server half switches on once the owner steps below are done)

## Context
Destinations were free text. The owner wants autocomplete for cities, countries and continents, with the data **stored in our databases**, and with places someone searches for saved so everyone finds them after.

Google can't be the source: its terms forbid storing place results beyond the place ID (`docs/06`). We use open data we're allowed to keep:
- **GeoNames** (CC-BY 4.0) to seed;
- **OpenStreetMap through Geoapify** (ODbL; credit OpenStreetMap) for places we don't have yet.

OpenStreetMap's geocoding guideline allows storing individual results; it doesn't allow bulk-copying a substantial part of its database. Our table only grows from real searches. Owner to confirm Geoapify's own storage terms when signing up.

## How a search works
1. **The phone's database first:** `places` and `place_names`, migration `0005`, seeded on first launch from `apps/mobile/assets/places/basic.places`. It covers countries, continents, cities over 15,000 people, their states, and our own places. Instant, and works offline.
2. **Fewer than 3 matches and online:** after a 300 ms pause, the app asks our Supabase function `place-search`. It searches our Supabase `places` table, seeded with every town over 500 people.
3. **Still no match:** the function asks Geoapify once, **saves the results** to the table, and returns them. The phone saves them too, so they work offline next time.
4. **Nothing found:** "Use "…" as typed" keeps the old free-text behaviour.

**Display:** "Tokyo · Japan" in the list, and "Tokyo, Japan" on the trip. Picking a place fills the trip's time zone and currency, unless you already changed them, shown in plain words ("Japan time (GMT+9)", "Japanese Yen (JPY)"). Profile credits GeoNames and OpenStreetMap.

## Data pipeline
- `scripts/places/` holds:
  - `lib.mjs`: parsing, building and checks. Tested with `node --test` in `pnpm test`.
  - `build.mjs`: makes the phone's list.
  - `seed-server.mjs`: loads Supabase over the database connection. The service-role key stays in Supabase (docs/14 §4).
- `data/places/overrides.json` is our corrections file: popular regions such as Spiti Valley, Kodagu (Coorg), Hampi and the Kerala backwaters, plus ranking boosts. A rule that matches nothing stops the build.
- **Every build stops if a check fails:**
  - 7 continents, at least 240 countries, at least 20,000 cities;
  - known places present with the right country;
  - no incomplete rows;
  - every country has a currency;
  - the row count hasn't dropped more than 10%.
- **GitHub Action "Places data":** run it before each release. It rebuilds and commits the phone's list, and can load Supabase. GeoNames can't be reached from the cloud dev environment, so the build runs on GitHub. Until it runs, the phone's list holds the 7 continents only.
- **Stable IDs:** `gn:`, `adm1:`, `ctry:`, `cont:`, `ours:`, `osm:`.

## Code
| Area | Files |
|---|---|
| Core | `packages/core/src/places.ts`: ranking, labels, plain-word time zone and currency, seed and server-row readers |
| Phone database | `packages/db`: tables, `seedPlaces`, `searchPlaces`, `savePlaces`, `getPlace`; `trips.destination_place_id` |
| Supabase | migration `places` with `pg_trgm`, RLS (anyone reads, only the service role writes), `search_places`; pgTAP `01_places.test.sql` |
| Function | `supabase/functions/place-search` and `_shared/places-osm.ts` (tested in core) |
| App | `lib/places.ts` (seed, phone search, server search); `ui/place-field.tsx`; `components/trip-form.tsx`; `expo-asset` (in Expo Go) |
| Deploy | `db-deploy.yml` now also deploys the function; `places-data.yml` (new) |

## Owner steps
See `docs/14-owner-setup.md` §4, step 8:
- the `.env` values;
- the `STAGING_DB_URL` GitHub secret;
- a Geoapify key as the Supabase secret `PLACES_API_KEY`;
- run "Deploy database and functions", then "Places data" with the Supabase load ticked.

No new app build is needed; Expo Go is enough.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`:
  - core places 9 + OSM mapping 4;
  - db places 4;
  - pipeline 6;
  - app places screen 4: pick Tokyo, a country with its continent, "Use as typed", a server result saved to the phone.
- The pgTAP test runs in CI's database job.
- The Android export is within budget (+2.7%); the seed ships as an asset, not JavaScript.
