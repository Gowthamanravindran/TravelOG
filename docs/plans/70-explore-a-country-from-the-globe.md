# Plan 70 — Tap a country on the home globe to explore it

**Status:** ✅ Built, not yet seen on a phone · placeholder content

## Context
The home globe (Plan 66) did nothing when a country was tapped. The owner wants a tap to lead somewhere: the Explore tab, as that country's page. What the page finally holds is to be decided; for now it shows stand-in content.

## Change
- **Home globe:** tapping a country opens the Explore tab for it (`/explore?country=<ISO alpha-3>`). While a trip is being created, a tap still picks the country, as before.
- **Explore for a country:** the title **Exploring {Country}**, then
  - **Curated trips:** a few placeholder cards made up from the country's largest cities ("Tokyo → Yokohama → Osaka", "Tokyo long weekend", "Japan highlights", "A week in Japan"). Each is marked "Sample · coming soon" and does nothing when tapped.
  - **Cities:** the country's largest cities from the globe's city list (real names, up to eight).
  - **All of Explore** goes back to the general Explore page, which is unchanged.
- A place with no cities in the list (Antarctica) still gets its page; an unknown code shows the general page.

## To decide later (owner)
- What a country page really holds: curated trips, cities, or both, and where the content comes from.
- What tapping a trip or a city does.
