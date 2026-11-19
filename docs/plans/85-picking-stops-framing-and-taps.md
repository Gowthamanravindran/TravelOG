# Plan 85 — Picking stops: the countries fill the view, and a tap picks the city under it

**Status:** ✅ Built, not yet seen on a phone · Found by the owner while picking stops

## What was wrong
- **The picked countries looked small.** Framing them left wide margins (90 points above, 60 below, 48 at the sides), and worse, the margins were handed to the map library as its own padding, so it centred the countries on the whole screen rather than on the part above the drawer. Measured in desktop Chrome: Italy filled 44% of the visible part.
- **A tap in a cluster picked a neighbour.** A tap looked at a 28-point square around the finger and took whichever dot the map listed first, which is drawing order, not distance. Tapping the middle of three cities 14 points apart picked the one below.

## Change
- Framing works out the zoom for the visible part (the drawer's height added to the bottom margin) and centres the countries in it, with close margins (28 above, 20 below, 16 at the sides; at most zoom 5). Italy now fills 80% of the visible part and fits inside it. Country focus in Explore uses the same framing and is centred the same way.
- A tap picks the dot nearest the finger's middle, for cities to pick, stops and saved places.

## Checks
`scripts/globe/page-check.py`: `fit_fills` (the country fills at least 70% of the visible part and stays inside it) and `tap_nearest` (each city of a tight cluster picks itself). Both failed on the old page code and pass now.
