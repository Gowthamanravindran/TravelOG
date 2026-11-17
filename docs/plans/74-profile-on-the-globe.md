# Plan 74 — Profile on the globe: countries visited, and Settings behind a gear

**Status:** ✅ Built, not yet seen on a phone · Design: [`docs/superpowers/specs/2026-11-17-globe-behind-tabs-design.md`](../superpowers/specs/2026-11-17-globe-behind-tabs-design.md)

## Context
The owner wants Profile to keep the globe and to let people set which countries they have visited, shown on it. Profile had also grown into one long page of settings and notes about the app.

## Change
- **Profile draws on the shared globe** (Plan 72). The globe takes the top 45 %, still, showing the countries marked as visited. The marks belong to Profile: on Trips, Explore or anywhere else the globe is plain again.
- **Marking a country:** tap it on the globe to mark it, tap again to unmark it; or open the section and search. A tap here only marks: the globe does not zoom or outline.
- **Countries you've visited:** the name line says "{n} countries visited". The section shows the total, three countries, and "+{n} more"; opened, it lists them all, each removable, with a search to add.
- **Saved on this phone only**, as a list of country codes in the order added (`profile.visitedCountries`). Territories count as their parent country, as they are drawn on the globe. It is the person's own list and is not worked out from their trips.
- **Settings behind a gear** at the top right (an icon with the spoken name "Settings" and a 48 pt target). Settings has three sections that open in place, one at a time: **Trip reminders**, **Appearance** (showing the current choice), and **About**, which now holds Licences and credits, This app build, Account and sync and the version.
- **Without the globe** (Plan 71's cases) Profile, Explore and Trips are plain pages with the same content; countries are added by search. Covered by `no-globe-pages.test.tsx`.

## Not verified
- Nothing in Plans 72–74 has been seen on a phone. The map page is checked in desktop Chrome (`scripts/globe/page-check.py`); the screens by tests that stand in for the web view.
- The end-to-end flow (`apps/mobile/e2e/01-plan-a-trip.yaml`) gained Profile, Settings and Explore steps and has not been run.

## Open, for the owner
Listed in [`docs/07-open-items.md`](../07-open-items.md): what a city tile and a curated trip open, where curated trips come from, and whether to offer the countries of past trips as visited.
