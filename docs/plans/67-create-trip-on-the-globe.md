# Plan 67 — Create a trip on the globe

**Status:** ✅ Built, not yet seen on a phone · Design: [`docs/superpowers/specs/2026-11-17-globe-home-design.md`](../superpowers/specs/2026-11-17-globe-home-design.md) (the create flow, saving, motion)

## Context
Making a trip was a form: name, icon, where, dates, currency, time zone. The owner wanted it to be something you do on the globe (Plan 66), with nothing asked that the app can work out.

## Change
Pressing **Create a trip** (in the drawer, or **New trip** in the tab bar) keeps the globe and changes the drawer's content through four steps. A back arrow, or Android's back button, steps back; leaving at the first step discards everything.

1. **Where to?** Tap countries on the globe, or search. Typing a city adds the city and its country at once. Picked countries are chips; tap one to remove it. **Let's go →** appears once there is a country.
2. **When?** A calendar in the panel: tap the first day, then the last. The length counts both ends (12–18 March is 7 days). Dates are required here.
3. **Pick your stops.** The globe frames the picked countries and shows each one's eight largest cities, spaced apart, as dots. Tap to add, tap the numbered pin to remove; tap order is visit order, and a dashed line joins the stops as it grows. Search finds other cities: the bundled list at once, then the app's own place search. With several countries, country chips move the globe.
4. **Split your days.** Each stop has − and + (at least one day) and shows its own dates. "5 of 7 days" with "2 days left to place", "All days placed", or in red "2 days too many". **Create trip** stays disabled until the days match. The trip's name is here, filled in by the owner's rule and editable.

**The name:** one city → "{City} trip"; one country → "{Country} Trip"; several countries on one continent → "Exploring {Continent}"; otherwise "{Month} Trip".

**A country with no city picked is left out** when moving to step 4, with a line saying so.

**What is saved,** together or not at all: the trip (name, dates, destination text, the place it links to), you as its owner, and one stay per city. Currency and time zone are not asked: they come from the first stop's country, and can be changed in Edit trip. A city the phone had not seen is saved as a place, so stops, covers and travel times work.

**Feedback:** the panel's content fades and rises between steps; picks pop in with a light tap; day counts roll; matching the days gives a success tap, going over a warning tap and one shake. Every pick is also announced for screen readers ("Tokyo added, stop 1"), since the globe itself cannot be read out. With Reduce motion on, things fade or simply appear, and the camera jumps.

**Without the globe** (the web view missing, or the map failing to start) every step still works through search and buttons; where the web view is not in the app at all, the old form is used.

## Where the rules live
- `packages/core/src/trip-draft.ts`: trip length, the day split, each stop's dates, the saved stop rows, the name and the destination.
- `packages/db` `createTripWithStops`: the one transaction.
- `apps/mobile/src/lib/trip-draft-state.ts`: the flow's state as a reducer; `trip-draft-save.ts`: draft → what is saved.
- `apps/mobile/src/components/create-trip/`: the four steps and the panel; the screen is `app/(home)/index.tsx`.

## Not built (recorded in `docs/07`)
- Trips without dates in this flow (the old form and dates polls still allow them).
- Dragging stops to reorder them; remove and tap again for now.
- Existing trips' pins on the home globe.
- Removing the old New trip form; it stays as the fallback until the new build is installed.

## For the owner to check on a phone
- The whole flow by tapping the globe only, then by search only, then in airplane mode.
- The panel's heights on a small phone: the calendar and the day rows should fit without the main button covering them.
- The keyboard on both search steps: results should show above it.
- Reduce motion on, and a screen reader on.
