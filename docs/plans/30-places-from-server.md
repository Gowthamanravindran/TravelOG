# Plan 30 — Cities come from our server, not the app

**Status:** ✅ Built

## Context
The first full GeoNames build (Plan 29) made the phone's place file 6.2 MB (37,161 places). The owner asked why we keep cities in the app at all, when our Supabase database can serve them. Agreed: destinations are mostly chosen while planning, online, and a small wait is normal. Shipping cities costs app size, first-launch time, and an app release for every data update.

## Change
- **The phone ships only continents and countries:** 259 places, 34 KB (`scripts/places/lib.mjs` `phoneList`). The build still checks the full GeoNames data first, and fails if the phone file passes 200 KB.
- **The app always asks our Supabase `place-search` function** for cities and regions as you type, after a 300 ms pause. Countries and continents still show instantly from the phone.
- **Places you pick or see from the server are saved on the phone,** so your destinations and recent searches still work offline.
- **Offline with no match:** "Use as typed", as before.
- **`place-search` is deployed without JWT checks** (`supabase/config.toml`, `--no-verify-jwt`). The search is public, the app calls it with the public key, and the function limits each address to 30 searches a minute.
- **The "Places data" workflow** installs the Postgres client before loading Supabase.

## Owner impact
City search only works once the Supabase steps in `docs/14-owner-setup.md` §4 step 8 are done and the full list is loaded. Until then, the app finds countries, continents, and "Use as typed".

## Verification
- `pnpm test`, including:
  - the pipeline test: the phone list holds only continents and countries, under 5 KB for the fixture;
  - the app test: the server is asked even when the phone has matches.
- The Android export is checked.
