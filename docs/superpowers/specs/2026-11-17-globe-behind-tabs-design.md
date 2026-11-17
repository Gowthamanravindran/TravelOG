# One globe behind the tabs: explore a country, and countries visited on Profile — design

**Date:** 2026-11-17 · **Plans:** to be numbered (72 onward) · **Status:** draft for the owner's approval

**Mock:** https://claude.ai/artifact/FSi6AFNRutvDJvjUSvSSgm — the artboards "Clickable: exploring a country" and "Clickable: profile with countries visited" (Settings on top, gear icon). Globes there are sketches; city tiles and trip covers are grey stand-ins for photos.

**Builds on:** `2026-11-17-globe-home-design.md` (Plans 65–71): the globe package, the Trips tab's globe and drawer, the create flow, and the placeholder country page (Plan 70), which this replaces.

**The mock illustrates; this document governs.**

## Intent
The owner wants the globe to stay with the person as they move around the app, not be a picture on one tab. Tapping a country should feel like going there: the globe turns and zooms to it and the page about it rises from below. Profile should show where the person has been, on the same globe.

The yardstick from the first design still holds: an action on the globe beats a typed field, and nothing is asked that the app can work out.

## Goals, non-goals, anti-goals
**Goals**
- One globe, shared by Trips, Explore and Profile. Moving between them moves the same globe; it never reloads.
- **Explore a country:** tapping a country on the globe (from Trips or from Explore) turns and zooms the globe to it and shows the country's page in a drawer: a city search, "Explore by city", and "Curated trips".
- **Explore with no country:** the plain globe, with a drawer of general content.
- **Profile:** the globe marks the countries the person has visited; they add and remove them by tapping the globe or by search. Leaving Profile clears the marks; the globe is plain again on the other tabs.
- Profile's settings move behind a gear: Trip reminders, Appearance, and an About section.

**Non-goals (not in this work)**
- Real content for curated trips, sharing an itinerary, a city's own page, or photos for cities and trips. All placeholders, marked as such. The owner will design the itinerary flow later.
- The Feed tab: it stays a normal page that covers the globe.
- Syncing visited countries to an account (there are no accounts yet).
- Deriving visited countries from past trips automatically. *(My call: the owner asked for people to set them. A later "add the countries from your past trips" is cheap once this exists.)*
- Showing existing trips on the home globe.

**Anti-goals (a failure even if it works)**
- The globe reloading, flashing or resetting its position when switching between Trips, Explore and Profile.
- Visited marks or a country's highlight leaking onto another tab, or into the create flow.
- A tap on the globe doing two things at once (picking a country for a trip and opening its page).
- Any of this crashing, or leaving a blank screen, where the web view is missing or the map fails to start.

## Constraints (from the project)
- Everything in the first design's Constraints still applies: colours from `useTheme()`, no hex or `fontWeight` in app chrome, motion through `ui/motion.tsx` with no springs (Plan 32), Reduce motion respected, 4.5:1 text contrast, no reference apps named, new numbered plan files.
- **No new native package and no new build:** this uses what Plan 66 added.
- **No server change and no local schema migration:** visited countries are a device setting.
- **Where `hasGlobe()` is false** (Plan 71), Trips, Explore and Profile are ordinary full-screen pages with the same drawer content laid out in a normal scroll view, and visited countries are managed by search and chips alone.
- The globe keeps its own colours and imagery (owner, Plan 66). Text the app draws over it uses the theme's dark-scheme colours.
- Touch targets at least 48 pt for icon-only buttons (covers both platforms' minimums).

## Approaches considered
1. **One globe behind the tabs — chosen by the owner.** The globe moves out of the Trips screen into the tabs layout and sits once behind Trips, Explore and Profile. Each of those screens is a transparent layer with a drawer, and tells the globe what to show. Feed covers it. This is the only way the globe can visibly turn from where it was to the tapped country, and it gives "reset when moving to other sections" for free. Cost: the Trips screen from Plans 66–67 is reworked so the globe lives one level up.
2. **A globe in each screen.** Simpler, but three globes load separately (about a second each), use three times the memory, and a tap would cut to a new globe instead of flying there. Rejected.
3. **Everything as modes of the Trips screen.** Keeps one globe but breaks the tab navigation and back behaviour the app has. Rejected.

## The design

### The shared globe
- **The tabs layout draws the globe and the drawers.** In `app/(home)/_layout.tsx` a stage sits over the tab scenes and above the tab bar: the globe, and on top of it the drawer of whichever tab is focused (Trips, Explore or Profile). On Feed the stage is hidden and Feed shows as a normal page.
  - *(My call, and the reason:)* the alternative, transparent tab screens with the globe behind them, depends on touches passing through the navigator's scenes to the web view on both platforms. That cannot be checked without a phone, so the design does not rely on it.
  - The Trips, Explore and Profile routes stay (for the tab bar, links and back). With the globe they draw nothing themselves; where `hasGlobe()` is false they draw the ordinary full pages.
- **A scene tells the globe what to show.** Exactly one scene is current: the focused tab's. A scene is plain data:
  - highlighted countries, candidate cities, stops (as today);
  - what a tap on a country does (see Tapping a country);
  - how much of the globe the drawer covers;
  - whether the globe spins;
  - optionally a camera target: a country, a point, the stops, or "home" (pulled back).
- **Changing tabs changes the scene,** so marks from one tab cannot show on another. The camera eases to the new scene's target (or home); with Reduce motion it jumps. On Feed the globe is paused.
- One-off camera moves (fly to this city now) are commands, not held state.
- The create flow (Plan 67) behaves exactly as built; its state and globe props become the Trips scene while the flow is open. Its tests keep every assertion; they may be re-hosted to render the layout's stage instead of the Trips screen alone.
- **If the map fails to start or is lost at run time,** the drawers stay where they are over the dark area and everything works through search and buttons, as today. The screens do not switch layout. *(My call: one behaviour, already tested in the create flow.)*

### What the map page must learn
The page today centres every camera move on the whole web view and only allows for the drawer when fitting stops. Three changes, all in `packages/globe/src/globeHtml.ts`, switched at run time so the page never reloads:
- **The covered part is camera padding for everything:** `focusCountry`, `flyTo`, the fits, the spin and the resting view all centre in the part that shows. The resting globe is sized to fit that visible band (so the whole Earth still shows in Profile's 45 %).
- **Tap mode, switchable:** "focus" (today's behaviour: outline, name tag and zoom, then report) or "report" (only tell the app which country was tapped). The create flow's first step uses "focus"; everywhere else uses "report" and the app decides what happens.
- **Two kinds of mark stay distinct:** the coral fill means picked or visited (create flow, Profile); the outline with a name tag means "the country this page is about" (Explore). Explore does not fill its country.

### Globe sizes
The globe view itself always fills the space above the tab bar, so it never resizes or reloads. Each screen's drawer covers the lower part and reports that as the scene's inset:

| Screen | Globe showing at rest | Drawer raised |
|---|---|---|
| Trips | top 55 % (as now) | globe covered (today a sliver shows at 88 %; it now goes to the top like the others) |
| Explore, no country | top 55 % | globe covered |
| Explore, a country | top 28 % *(owner: 25–30 %)* | globe covered *(owner: "the globe disappears")* |
| Profile | top 45 % | globe covered |

Outside the create flow each drawer has two heights: at rest (the table), and raised to the top of the screen, below the status bar, so the globe is fully covered. The create flow keeps its own three heights (45 / 62 / 88 %).

### Tapping a country
| Where | What a tap does |
|---|---|
| Trips, not creating | opens Explore for that country |
| Trips, creating a trip, step 1 | picks or unpicks the country (unchanged) |
| Explore, no country | opens that country |
| Explore, a country | switches to the tapped country |
| Profile | marks or unmarks it as visited |

Opening a country: the app tells the globe to turn and zoom to it and outline it (the page's `focusCountry`, now centred in the visible 28 %), and Explore's drawer changes to that country, lowered so the globe shows at 28 %. From Trips this also switches to the Explore tab; the globe is already moving as the tab changes.

### Explore, no country
- The plain spinning globe.
- Drawer: title "Explore"; a field **"Search a country"** that lists matching countries and opens the one picked *(my call, approved in conversation: a way in without tapping the globe)*; then today's general content (the "Ready-made trips are on the way" block and its three sample cards), unchanged.

### Explore, a country
*(Owner decided the three parts and their order.)*
- **Header:** a back arrow ("All of Explore") that returns to Explore with no country and pulls the globe back; the title **"Exploring {Country}"**.
- **Search:** a field with the placeholder **"Search cities in {Country}"**. It filters the country's cities from the bundled list as you type (all of that country's cities, not only the tiles shown). Picking a result flies the globe to that city.
- **Explore by city:** tiles for the country's largest cities (`topCities`, up to 8), two per row. A tile shows the city's name on a plain tinted block (no photos yet). **Tapping a tile flies the globe to that city** *(owner)* and lowers the drawer if it was raised, so the move can be seen. Nothing else happens yet. With no cities in the list: "No cities listed here yet."
- **Curated trips:** cards at the bottom, each with a tinted cover, a length ("7 days"), a title and a route line, marked **"Sample"**. They are generated from the country's cities as in Plan 70 (no invented people or numbers), and tapping one does nothing yet. Under them, a **"Share your itinerary"** button that for now shows a short "Coming soon" message. *(My call, shown in the mock: it tells people this is where their trips will appear.)*
- The country is outlined and name-tagged on the globe while its page is open (not filled), with city dots for the tiles' cities so the flights have somewhere to land. *(My call.)*
- The country is carried in the route (`/explore?country=<ISO alpha-3>`, as Plan 70), so it survives a reload and can be linked to. An unknown code shows Explore with no country.

### Profile
*(Owner decided: globe stays; countries visited are set by the person and marked; settings on top as a gear; three countries shown with the total, opening to all; About merges licences, app build, account and version.)*

- **Globe:** shows every visited country filled. Tapping a country marks it; tapping a marked one unmarks it; a tap does not zoom or outline (tap mode "report"). It does not spin while Profile is open *(my call: a spinning globe is hard to tap)*, and is pulled back to show the whole Earth.
- **Drawer, top row:** the person's name, with "{n} countries visited" under it, and a **gear button** at the trailing edge (48 pt, labelled "Settings" for screen readers).
- **Profile card:** home currency and UPI id with **Edit**, and the Trips / Completed counts, as today. *(My call: these are about the person, so they stay on Profile, under the name.)*
- **Countries you've visited:** a heading with the **total in a badge**, and a chevron.
  - Closed: the first three countries as chips, and a "+{n} more" chip when there are more. With none: "Tap a country on the globe to mark it."
  - Tapping the heading or "+{n} more" opens it: a field **"Add a country you've visited"** (country search), every visited country as a chip that removes it when tapped, and the hint "Tap a country on the globe to mark it, or tap it again to unmark it."
  - Order is the order added.
- **Settings** (opened by the gear, inside the same drawer, raised): a back arrow and the title "Settings", then three rows that open in place:
  - **Trip reminders:** the switch and its explanation, as today. *(My call: it is a setting, so it moves here.)*
  - **Appearance:** closed, it shows the current choice ("Black & white · Match phone"); open, the existing theme and mode pickers.
  - **About:** closed, "Licences, this app build, account and version"; open: Licences and credits (opens the licences screen as today), This app build (today's wording, including the Globe line from Plan 71), Account and sync (today's wording), and the version.
- Leaving Settings returns to Profile's main view. Leaving the Profile tab closes Settings.

### Visited countries: what is saved
- A device setting through the existing `getSetting` / `setSetting`: key `profile.visitedCountries`, value a JSON array of ISO alpha-2 codes in the order added (`["IN","JP","FR"]`). Device-only, like the appearance settings; never synced.
- Pure helpers with tests: read (bad or missing JSON gives an empty list; unknown and duplicate codes are dropped), add, remove.
- Territories the globe draws under a parent count as the parent (as elsewhere).
- A place the globe has no alpha-2 code for cannot be marked; a tap on it does nothing.

### Motion
- Country opened: camera 900 ms (the page's existing fly), drawer eases to its height (`MOTION.slow`), drawer content fades and rises in (`Swap`).
- City tile or search result: camera to the city (zoom about 5), 900 ms.
- Leaving a country, or changing tabs: camera eases home.
- Marking a country on Profile: a light haptic, and the count changes.
- Settings rows open and close with a short fade of their content; no height springs.
- Reduce motion: camera jumps, content fades only.

### Accessibility
- Every globe action has another way: country search on Explore and Profile, the city search and tiles on a country page, chips to remove.
- Marking and unmarking announce "{Country} marked as visited" / "{Country} removed". Opening a country announces "Exploring {Country}".
- Expandable rows expose their expanded state; the gear and back buttons have spoken names.

## Left to the builder
- How scenes and one-off camera commands reach the layout, and the scene type's exact shape.
- Whether Explore's two states are one screen or two components; same for Profile and its Settings view.
- How the fallback pages (no globe) reuse the drawer content.
- Tints for city tiles and trip covers, from theme colours only.
- How many numbered plans this becomes. Suggested order: shared globe and scenes (Trips unchanged in behaviour) → Explore → Profile and Settings.
- Updating the end-to-end flow where it touches Profile or Explore.

## Open items for the owner (not blocking)
- What a city tile and a curated trip open, and where curated trips come from.
- Whether past trips should offer their countries as visited.
