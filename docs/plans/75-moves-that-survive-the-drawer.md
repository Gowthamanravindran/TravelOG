# Plan 75 — The globe's moves survive the drawer; a country is held, not sent once

**Status:** ✅ Built, not yet seen on a phone · Found by the review of Plans 72–74, before anything was installed

## Context
A review of Plans 72–74 ran the real map page with motion on, in the order the app sends things, and found the globe often did not go where it was told. A drawer changes height just after a move is asked for; the new height reached the page mid-flight and started a camera change of its own, which cut the move short. Switching the spin off did the same. So a tapped country did not turn into view, "All of Explore" did not pull back, and in the create flow a picked country or the frame around the picked countries was lost. The app's tests could not see it (they stand in for the web view) and the Chrome check had motion off.

## Change
- **In the map page**, a move the app asks for now carries the padding with it and is remembered while in flight. A new drawer height during the flight aims the same move at the new visible part instead of cancelling it. Switching the spin off stops only the spin. A finger on the globe still takes over at once.
- **A fit with no room left** (a very short visible band) falls back to a pulled-back view instead of an error.
- **The explored country is held by the globe** rather than sent once: it keeps its outline and name tag while its city dots show and while a city is flown to, and it is sent again if the map page reloads. The name tag no longer takes taps.
- **Switching tabs no longer tells the globe for a moment that nothing covers it.**
- **A screen pushed over the tabs** (a trip, Licences) hides the globe stage but keeps the tab's page: back from Licences is still Settings → About, back from a trip the Trips drawer is as it was.
- **A link that repeats `country=`** opens Explore with no country instead of failing.
- **`scripts/globe/page-check.py`** now replays these sequences with motion on and compares each interrupted move with the same move left alone. Each new check was seen to fail with the old behaviour put back.

## Still not verified
Nothing here has been seen on a phone. The Chrome check uses a desktop browser with software drawing; timing on a phone may differ.
