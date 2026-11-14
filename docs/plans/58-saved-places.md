# Plan 58 — Saved places, across trips

**Status:** ✅ Built (step 2 of 4, after Plan 57)

## Context
Step 2 of the features the owner chose from the mocks: a list of places you want to go that isn't tied to one trip. The owner chose its own home tab, not a section in Explore.

## Decisions
- **Data:** a new synced table `saved_places` (migration `0008_saved_places`), registered in `syncedTables`:
  - title, kind, address, area, country, coordinates and map id;
  - where it came from (`typed`, `stop`, and for Plan 59 `instagram`, `youtube`, `tiktok`, `web`), with link, source title, thumbnail and note.
  - Saving the same place again (same map id, or same name within 50 m) updates it rather than adding a copy.
- **Saved tab** (Trips · Saved · Feed · ＋ · Explore · Profile):
  - places grouped by country, then area, with search and kind filters;
  - the **+** on a row adds the place to a trip's Ideas;
  - tapping a row offers Add to a trip, Open in maps or Remove;
  - **Add** opens Save a place, which searches places anywhere (the Plan 57 search, without a trip).
- **From a trip:** the stop editor has **Save to Saved**, which shows **In Saved** once it's there. The area comes from the place search (the server now returns area and country); otherwise it's guessed from the address, else taken from the trip's destination.
- **On the Ideas day:** a banner such as "3 saved places near Goa" lists Saved places within 75 km of the trip that aren't on it yet. If the trip has no location, it matches by the destination's country instead. **Add** lets you untick some first. Added stops remember their saved place (`saved_place_id`).
- **Plan these ideas:** `spreadOverDays` (`@travelog/core`) groups ideas by area with k-means, keeps groups within 6 km on one day, and gives the biggest group to the emptiest day. Ideas without a place stay in Ideas. A preview comes first; **Add to days** moves them to the end of each day (`moveItemsToDays`).

## Not in this plan
Saving from a link or post (Plan 59) and from other apps' share sheet (Plan 60).
