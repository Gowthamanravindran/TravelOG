# Globe home, create-a-trip on the globe, and a black and white theme — design

**Date:** 2026-11-17 · **Plan:** to be numbered (65 onward) · **Status:** draft for the owner's approval

**Mock:** https://claude.ai/artifact/FSi6AFNRutvDJvjUSvSSgm (one clickable phone screen; the globe and map in it are sketches, and it knows three countries and one month).

**Source of the globe:** the owner's proof of concept at `~/Documents/POCs/globechk/globe-test` (MapLibre GL JS 5.24.1 in a `react-native-webview`): `GlobeMap.tsx`, `globeHtml.ts`, `maplibreAssets.ts`, `flags.ts`, `cityData.ts`, `cities.json`, `countries.json`, `countries.in.json`. Its `App.tsx` is a benchmark screen and is not carried over. The folder is on the owner's computer, outside the repo; the first build step copies these files into `packages/globe`. This is a port of working code, not a new MapLibre build.

**The mock illustrates; this document governs.** Where they differ, the differences are called out below.

> **Changed during the build (17 Nov, owner):** "You don't have to make the globe black and white." The globe keeps the proof of concept's own colours and satellite imagery in every app theme; only the app around it is themed. The lines below that said otherwise have been updated.

## Intent
The owner's words: the app "feels like filling out forms over and over again and sucks the fun out of planning". People should feel engaged and want to come back. So the front door becomes a globe, and making a trip becomes something you do on that globe.

**The yardstick for every choice here:** an action on the globe beats a typed field. Typing is the fallback, and nothing is asked that the app can work out.

## Goals, non-goals, anti-goals
**Goals**
- The Trips tab shows the globe on top and the trip list in a bottom drawer.
- A trip is created in four steps on that screen: countries → dates → cities → days per city, with the name filled in automatically.
- Motion makes it feel like one continuous move.
- A black and white theme, added as a third theme and made the default.

**Non-goals (not in this work)**
- Changing the edit-trip screen, the trip's own screens, or the Saved, Feed, Explore and Profile tabs (they only pick up the new theme).
- Showing past trips, visited countries or saved places on the home globe. The home globe may show existing trips' pins if cheap (builder's call), nothing more.
- Hosting our own satellite imagery. The globe uses the proof of concept's public mirror for now; hosting it ourselves stays on the owner's list before launch. Offline or on a slow connection the flat map shows, as the proof of concept already does.
- Removing the `sunset` and `block` themes. The owner is still trying themes in beta.

**Anti-goals (a failure even if it works)**
- A create flow that is a form again: a screen of labelled fields with a save button.
- The globe reloading or flashing between steps.
- Any step that cannot be completed offline, apart from finding a small town that is not in the bundled list.
- Motion that ignores Reduce motion, or that makes a tap wait.
- A crash in the owner's installed development build or in Expo Go.

## Constraints (from the project)
- **Native package:** `react-native-webview` is added with `npx expo install`, listed in `apps/mobile/native-packages.json`, and the plan summary must tell the owner a new development build is needed. It is included in Expo Go. Until the owner installs the new build, the Trips tab must not crash there: check the native module is present and fall back to today's list screen without the globe.
- **App size:** the design estimated about 3 MB (MapLibre 1.1 MB, cities 1 MB, one countries file 0.5 MB, flags 0.3 MB). Measured after the build: the Android bundle grew by 5.5 MB (5.1 → 10.6 MB), because data kept as JavaScript takes more room once compiled. Moving the map library and the data to asset files is recorded as a follow-up (Plan 66). Size enforcement is paused (Plan 50); the plan should record the measured number. Only one countries file (see Borders) should be loaded at run time, and the city list only on first search or first city step, as the proof of concept already does.
- **Design rules:** colours only from `useTheme()`; no hex colours or `fontWeight` in app chrome; fonts from `font(role, weight)`; every text pair at least 4.5:1 (theme test); no violet. The globe keeps its own colours (see the note at the top); the app chrome around it follows these rules.
- **Motion:** through `apps/mobile/src/ui/motion.tsx`; Reduce motion respected; follow `.claude/skills/react-native-skills`.
- **Data:** money, time and database conventions in `CLAUDE.md` apply. No server change is expected. If the builder finds a local schema change is needed, it follows `docs/12` and gets its own migration; the design below is meant to need none.
- **Licences:** GeoNames (CC BY 4.0) is already credited for places; add MapLibre GL JS (BSD-3) and Natural Earth (public domain) to `apps/mobile/assets/licenses.json`. Flags: record their source and licence from the proof of concept, or leave flags out if it cannot be established.
- **Reference apps** are never named in docs, code or commits.
- **Plan log:** this work gets new numbered plan files; earlier plans are not edited.

## Approaches considered
1. **One living screen — chosen by the owner.** The Trips tab is the globe plus drawer, and creating a trip is the same screen changing its bottom panel. The globe never reloads, which is what makes the motion possible. The globe code moves into the repo as its own package, in greyscale with imagery off. The proof of concept's city list is bundled for city dots and instant search; its ids are GeoNames ids, the same as TravelOG's `gn:<id>` places, so picks save into the existing stops table. Cost: about 3 MB and a new development build.
2. **Same screen, no bundled cities.** Dots and search come from the server only. Saves about 1 MB, but dots arrive after a network wait and not at all offline. Rejected: it works against the instant, playful feel.
3. **Globe only in a separate create screen.** The Trips tab stays a list. Least risk, but the globe loads fresh each time (one to two seconds), the move from home to create cannot be continuous, and it drops "globe by default". Rejected.

## Part 1 — Black and white theme (built first)
*Owner decided:* add it as a third theme, make it the default, keep `sunset` and `block`.

- A new theme in `packages/ui/src/themes.ts` alongside the two there (working name `mono`; the name shown in the appearance picker is the builder's call, for example "Black & white").
- Light: white surfaces, black ink. Dark: black surfaces, white ink. Greys for secondary text and lines, all passing the 4.5:1 theme test.
- The three areas (home, plan, trip) do not get their own colours in this theme: the accent is ink in all three. *(My call: it is what "simple black and white" means. The areas stay distinguishable by their headers and tab bars, not by colour.)*
- One non-grey colour is allowed: the existing error red, for "too many days" and other errors. *(My call.)*
- The five tile families and the hero-art backdrops resolve to greys in this theme; the 3D art itself keeps its colours. *(My call; the alternative, greyscale art, is more work for a look the owner has not asked for.)*
- `DEFAULT_APPEARANCE.theme` becomes the new theme. Someone who already saved a theme choice keeps it; only people with no saved choice see the new default. *(My call.)*
- The appearance card lists three themes.

## Part 2 — Globe home and create flow

### The screen
*Owner decided:* globe on top, bottom drawer with the trip list, as in the mock.

- `app/(home)/index.tsx` becomes one screen with two layers: the globe filling the area above, and a drawer.
- **Drawer:** two resting heights. Lowered, it shows the handle, "Your trips", the **Create a trip** button, the Upcoming / Planning / Past filter and the first trips. Raised, it covers most of the globe and scrolls. It follows the finger and settles with a spring. The existing `ui/bottom-sheet.tsx` is a modal and does not fit; this is a new non-modal drawer built on Reanimated and Gesture Handler, both already installed. *(My call: no new sheet library.)*
- The trip list keeps what it has today: the live-trip card, trip cards, filters, the empty state and its wording.
- **Create a trip** lives in the drawer header. The centre "New trip" button in the tab bar starts the same flow. *(Changed from the mock, which dropped the centre button: keeping it costs nothing and people already know it. Owner to confirm.)*
- The `/new-trip` route and its form stay in the code for now as the fallback: where the web view's native module is missing (the owner's current development build), **Create a trip** opens it as today. Where the module is present, both buttons start the globe flow. Removing the old route is a later, separate change once the new build is installed. `components/trip-form.tsx` also stays for editing a trip. *(My call.)*
- The tab bar stays visible on home and is hidden during the create flow. *(My call.)*
- The globe stops spinning when the tab is not focused (`active` prop) and when the drawer is raised.

### The create flow
One screen; the bottom panel changes; a back arrow steps back; leaving at step 1 returns home. Nothing is saved until **Create trip**. *(My call: an unfinished flow is discarded on leaving; no drafts.)*

**Step 1 — Where to?** *(owner decided: tap the globe or search, both available from the start)*
- Tapping a country on the globe toggles it. The globe outlines it and flies to it.
- A search field finds countries and cities. Picking a city adds the city and its country in one go. *(My reading of "faster to type"; the owner tried it in the mock and approved.)*
- Picked countries show as removable chips. Removing a country removes its cities.
- **Let's go →** appears once at least one country is picked.

**Step 2 — When?** *(owner decided: dates come after Let's go)*
- A calendar; tap the first day, then the last. Reuse the app's `DateRangeField` calendar if it can sit inline in the panel; otherwise build an inline month grid from the same parts.
- The trip length is counted in **days, both ends included** (12–18 March is 7 days). *(My call, from the owner's wording "number of days on the trip".)*
- Dates are required in this flow. *(My call. Today a trip can be made without dates and settled later by a dates poll; the day split cannot work without a length. If the owner wants date-less trips here, the smallest change is a "Not sure yet" choice that skips steps 3's ordering and step 4 and creates a trip in Planning with countries only. Not built unless asked.)*

**Step 3 — Pick your stops** *(owner decided: tap cities on the globe, search as the fallback)*
- The globe flies to the picked countries and shows each one's best-known cities as dots: the largest by population from the bundled list, about 8 per country, fewer where they would overlap. *(My call on the number; tune on a real phone.)* With several countries, chips or swipes move the globe between them.
- Tap a dot to add it, tap again to remove it. **Tap order is visit order**; each picked pin shows its number, and a dashed great-circle line joins them in order.
- A city search covers what is not shown: the bundled list first (instant, offline), then the app's existing server search (`lib/places.ts`) for anything smaller. A city from another country adds that country.
- The dates stay visible at the top.
- **Next →** appears once at least one city is picked.
- **A country with no city picked is left out of the trip** when moving on, with a short line saying so ("No stops in South Korea, so it's left out"). From here on, "the trip's countries" means the countries of the picked cities; the name rule, destination text and `destinationPlaceId` all use that. *(My call: days can only be given to cities, so a country without one has nothing to hold.)*

**Step 4 — Days per city** *(owner decided: dates on top, a number next to each place, total must match, red when over)*
- The globe pulls back to fit the whole route.
- Each stop has − and + (minimum 1) and shows its own dates, worked out from the order and the counts. New stops start at 1 day.
- A line shows "5 of 7 days" with "2 days left to place", "All days placed", or in red "2 days too many". Stops that run past the last day show their dates in red.
- **Create trip** is disabled until the total matches exactly.
- The **trip name** field is here, filled in automatically and editable. Once edited by hand, it stops updating itself.
- Reordering stops by dragging is not in this version; removing and re-tapping changes the order. *(My call, to keep the first build small.)*

**Trip name rule** *(owner decided)*
1. One city → "{City} trip"
2. Otherwise one country → "{Country} Trip"
3. Otherwise several countries on one continent → "Exploring {Continent}"
4. Otherwise → "{Month} Trip" (month of the first day)

Capitalisation follows the owner's examples. The owner wrote the fallback as "{{Month}} - Trip"; it is built as "{Month} Trip" unless the owner wants the dash.

The rule is a pure function in `packages/core` with tests.

### What gets saved
On **Create trip**, in one database transaction:
- A `trips` row through the existing `createTrip`:
  - `title`: the name.
  - `startDate`, `endDate`: the picked dates.
  - `destination`: readable text of the stops ("Tokyo, Kyoto, Seoul"; one city uses the existing "City, Country" wording).
  - `destinationPlaceId`: the single city, or the single country (`ctry:XX`), or the continent (`cont:XX`) when all countries share one, else null.
  - `currency`: the first stop's country currency; `timeZone`: the first stop's zone. *(My call: never asked in the flow, editable later in edit trip.)* If the zone is not known offline, use the device zone as today.
  - `emoji`: today's default icon.
- One `trip_stops` row per city: `kind: 'stay'`, `placeId: 'gn:<id>'`, `startDate` = the stop's first day and `endDate` = its last day, both included, so stops never overlap and together cover the trip exactly (12–18 March as Tokyo 3, Seoul 4 saves Tokyo 12–14 and Seoul 15–18). *(My call. It fits the existing check in `repo/stops.ts`, which only requires the last day not to be before the first, and allows a one-day stop. The builder confirms the existing stops and Today screens read such rows correctly and covers it with a test; if they expect the last day to be the leaving day, save the next stop's first day instead and keep what the person sees unchanged.)*
- A `places` row for any picked city not already on the phone (id, name, country, lat, lng from the bundled list; country name, continent and currency from the phone's country rows), so stops, covers and travel times keep working. Time zone may be filled later from the server.

Then the celebration (`useCelebrate`), the drawer shows the new trip, and the app opens it the way it does today (`tripHref`). *(My call: open the trip, as now. The mock stayed on home.)*

### The globe package
- New workspace package `packages/globe` holding the component, the map page, the bundled MapLibre, country shapes, flags and the city list with its search. Vitest for the pure parts (city search, top cities per country, route order).
- **Look:** the proof of concept's own colours and satellite imagery, the same in every app theme *(owner, during the build)*. Text the app draws over the globe takes the theme's dark-scheme colours, since the globe's ground is dark.
- **Borders:** `worldview="IN"` for everyone for now (India-first), loading only `countries.in.json`. *(My call. The proof of concept's README says the borders need a review before launch; that stays an open item for the owner, not part of this build.)*
- **Additions the map page needs** beyond the proof of concept:
  - a layer of candidate city dots, tappable, separate from picked pins;
  - numbered pins for picked cities;
  - a route line that can draw itself from the previous stop;
  - fit-to-route and fly-to-several-countries;
  - a way to switch country tapping on (step 1) and off (steps 3, 4, home);
  - theme colours changeable without rebuilding the page, if cheap, else a rebuild on theme change is acceptable.
- Messages between the app and the page stay as typed JSON, as now.
- The self-reload on a killed web view and the `fallback` prop are kept. If the globe cannot start, the flow still works through search and lists alone.
- `benchmark` is off. `quality="auto"` stays.

### Motion *(owner asked for good animations and proper transitions; the specifics are my proposal, approved in outline)*
- **Between steps:** the globe stays; the panel's content slides and cross-fades (about 250 ms); the panel height animates to fit.
- **Globe:** flies to a picked country; tilts and zooms for cities; fits the route for days. Camera moves 600–900 ms, eased, interruptible by touch.
- **Picks:** a pin pops (scale spring) with a light haptic; the route line draws from the previous stop (about 400 ms).
- **Days:** the count rolls when changed (`CountUp`); going over shakes the total once as it turns red, with a warning haptic; reaching "All days placed" gives a success haptic.
- **Drawer:** follows the finger, springs to rest; the globe scales down slightly as the drawer rises.
- **Create:** the route draws once more, then the existing celebration.
- **Reduce motion:** slides, pops, shakes and draws become plain fades or instant changes; camera moves jump. Haptics stay.
- Nothing blocks input; app-side transitions stay within about 200–350 ms.

### Accessibility
- Every globe action has a non-globe way: search for countries and cities, chips to remove, buttons for days.
- The web view is one opaque element to screen readers: give it a label ("Globe") and announce picks ("Tokyo added, stop 2").
- Touch targets at least 44 pt; red is always paired with words ("2 days too many").

## Left to the builder
- File layout inside `packages/globe` and how Metro bundles the large generated files.
- Whether the drawer and the create panel are one component with modes or two.
- How candidate cities are thinned when they overlap, and the exact count per country.
- The exact greys of the new theme, within the contrast test.
- Whether the home globe shows existing trips' pins.
- Test split: pure logic in Vitest (`core`, `globe`); screen behaviour in Jest with the web view mocked.
- How many numbered plans this becomes. Suggested order: theme → globe package → home screen with drawer → create flow steps 1–2 → steps 3–4 and saving → motion pass.

## Open items for the owner (not blocking)
- Border data review before launch.
- Whether flags are needed at all in a black and white app.
