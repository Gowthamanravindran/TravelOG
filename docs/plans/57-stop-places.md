# Plan 57 — Stops get a real place: travel time and Best order

**Status:** ✅ Built (step 1 of 4)

## Context
The owner shared a reference app (reference only) that turns saved travel videos and links into a library of places, day plans, a map and travel times. They chose four features, mocked first and approved:
1. stops get a real place, with travel time and **Best order** (this plan);
2. a **Saved places** library as its own home tab (Plan 58);
3. **Paste a link** and a place finder for posts (Plan 59);
4. **Save to TravelOG** from other apps' share sheet, which needs a new development build (Plan 60).

Before this plan a stop was only a name, and place search only knew cities.

## Decisions
- **A stop's place:** new nullable columns on `itinerary_items`: `place_name`, `address`, `lat`, `lng`, `poi_id`, `url`, `saved_place_id` (migration `0007_item_places`). Plan B copies them.
- **Searching places for stops:** `place-search` gains `scope=poi&near=lat,lng`. It uses Geoapify autocomplete for amenities, biased to the trip's destination, and returns name, address, suggested kind and coordinates (`poiFromGeoapify`). Results aren't saved in `places` (that table is for cities); each server instance keeps them in memory for six hours to save lookups.
  - The app shows places already used on the trip at once and offline, then the server's results.
  - "Use as typed" keeps a name with no map spot.
  - It works once the function is deployed to staging (merge to `main`). Until then names are typed.
- **Travel time:** estimated on the phone (`@travelog/core` `geo.ts`):
  - the straight line × 1.35 for roads;
  - walking up to 1.5 km at 4.5 km/h;
  - else driving at 22 km/h for the first 10 km and 45 km/h beyond, plus 3 minutes to get going.

  It's shown as "≈ 26 min drive · 11 km" between stops that both have a place. Legs over 45 minutes stand out.
- **Best order:** on the day (the owner's choice), shown only when it saves time.
  - It tries every order up to 7 movable stops, else uses segment reversals.
  - Stops with a set time, and stops without a place, keep their position.
  - A sheet compares Now and Suggested with the time saved. Nothing changes until **Use this order**, and **Undo** puts the old order back (`setItemOrder`).
- **Real road times:** not decided. The owner asked for a spike first and for routing to be part of the cost and pricing work; it's recorded in `docs/07`. The ~$40/month routing line in `docs/04` is marked unmeasured.

## Not in this plan
The map, real routing, Saved places (Plan 58), the place finder (Plan 59) and the share sheet (Plan 60).
