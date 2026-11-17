# Plan 76 — The tab bar was covered by the globe's drawer

**Status:** ✅ Fixed in code, not yet seen on a phone · Found by the owner on the first run of Plans 72–75

## What happened
The whole bottom bar was missing on Trips, Explore and Profile. Each tab's drawer is as tall as its highest stop and slides down to rest, so its lower part sits below the visible area. When the drawer lived inside the Trips screen (Plans 66–71), the screen cut that part off. Plan 72 moved the drawers onto one shared globe stage drawn over the tabs, and the stage did not cut anything off, so the hidden part of the drawer hung over the tab bar and hid it.

## Change
The stage clips what it draws (`overflow: 'hidden'`), so nothing on it reaches the tab bar.

## After the first fix (owner's phone)
- **The New trip button's top was hidden.** It rises above the bar, into the globe's space, and the globe stage was drawn after the bar, so on top of it. The layout now draws the bar itself, after the stage; the navigator only hands it the tab state.
- **The trip list did not scroll at rest.** The Trips drawer only let its list scroll once raised to the top. It now scrolls at any height, like Explore and Profile; the drawer still moves by its handle and header.

## The emulator flow, fixed too
The flow failed on this branch for a reason of its own: after picking dates it tapped `Next.*`, which also matches the calendar's "Next month" button, so it kept turning the month and never reached "Pick your stops". The buttons are now named exactly. The flow also now checks the tab bar right after the globe loads: Profile, Explore, then back to Trips.

## Why the checks missed it
- **Unit tests** (Jest) have no layout or drawing: they cannot see one view covering another. The new test only pins the clipping style; it cannot prove the bar shows.
- **The map check** (`scripts/globe/page-check.py`) only runs the web page inside the globe, not the app.
- **The emulator flow** (`.github/workflows/e2e.yml`) did run on this branch for Plans 66–67 and 71 and failed both times; those failures were not looked at, and the owner was told the flow had never run. From now on its result is checked after each push that triggers it, and reported.
- Nothing was seen on a phone before the work was called done.
