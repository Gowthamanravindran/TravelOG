# Plan 73 — Explore on the globe: the plain globe, and a country's page

**Status:** ✅ Built, not yet seen on a phone · placeholder content · Design: [`docs/superpowers/specs/2026-11-17-globe-behind-tabs-design.md`](../superpowers/specs/2026-11-17-globe-behind-tabs-design.md)

## Context
Plan 70 gave a tapped country a plain Explore page with no globe. The owner wants the globe to stay, turn and zoom to the country, and the page to rise from below. This replaces Plan 70's page.

## Change
- **Explore with no country:** the plain spinning globe, with a drawer holding a **Search a country** field (a way in without tapping the globe) and the general content as before.
- **A country's page** (`/explore?country=<ISO alpha-3>`), opened by tapping a country on the globe from Trips or Explore, or by the search:
  - the globe turns and zooms to the country and outlines it, in the top 28 % of the screen; the drawer takes the rest and, raised, covers the globe;
  - **Search cities in {Country}** over every city of that country in the app's city list;
  - **Explore by city:** the country's largest cities, up to eight, as tiles and as dots on the globe. Tapping a tile, a dot or a search result flies the globe to that city;
  - **Curated trips:** sample cards made up from the country's cities, marked "Sample", and a **Share your itinerary** button that says "Coming soon";
  - **All of Explore** goes back and the globe pulls back out.
- Tapping another country on the globe switches the page to it. Leaving for another tab takes the outline and the dots off the globe.
- A place with no cities in the list still gets its page; an unknown code is Explore with no country.
- **Without the globe** the same content shows as a plain page; picking a city does nothing there.

## Placeholders, to be decided by the owner
- What a city tile and a curated trip open, and where curated trips come from.
- Photos for cities and trips: the tiles and covers are plain tinted blocks.
- Sharing an itinerary.
