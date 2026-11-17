# Plan 72 — One globe, shared by Trips, Explore and Profile

**Status:** ✅ Built, not yet seen on a phone · Design: [`docs/superpowers/specs/2026-11-17-globe-behind-tabs-design.md`](../superpowers/specs/2026-11-17-globe-behind-tabs-design.md)

## Context
The globe lived inside the Trips screen. The owner wants it to stay as people move between Trips, Explore and Profile, and to turn to a tapped country rather than cut to a new screen. That needs one globe that all three share.

## Change
- **The tabs layout draws a stage** over the tab scenes and above the tab bar: the globe, and on it the drawer of whichever tab is in front. On Feed (or any other screen) the stage is hidden but kept, so the globe is never loaded twice.
- **Why the layout draws the drawers too:** the other way, see-through tab screens with the globe behind them, depends on taps passing through the tab navigator to the globe on both iPhone and Android. That cannot be checked without a phone, so it is not relied on.
- **A scene per tab:** each tab hands the stage what the globe should show (marked countries, cities, stops), what a tap does, whether it spins, and how much its drawer covers. Only the tab in front has its scene shown, so marks cannot leak from one tab to another.
- **Trips** now draws on the stage and behaves as before, including creating a trip. Its drawer, when raised while looking at trips, now covers the globe completely.
- **The map page** (`packages/globe`):
  - centres every camera move in the part of the globe the drawer leaves showing, and sizes the resting globe to fit it;
  - can be told to only report a tapped country, leaving the outline and zoom to the app ("report" mode). Creating a trip still uses the old behaviour on its first step.
- **Without the globe** (`hasGlobe()` false) nothing changes: the Trips route draws the list page.
- **`scripts/globe/page-check.py`:** runs the real map page in desktop Chrome and checks the padding, the tap modes and the home view. A development aid; it is not part of CI.

## For the owner to check on a phone
- Switching between Trips, Feed, Explore and Profile: the globe should stay put, with no flash or reload.
- The drawer on Trips: raised, it should reach the top of the screen.
