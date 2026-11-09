# Plan 45 — Opening the Itinerary / Plan tab faster

**Status:** ✅ Built

## Context
The first open of Plan mode's Itinerary and Trip mode's Plan took a moment longer than other screens. Coming back was instant, because the tab stays mounted, so the cost was in the first render of `components/itinerary-view.tsx`. Two causes:

1. **Time-zone formatters rebuilt on every call.** `localDateIn`, `localTimeIn` and `timeZoneOffsetMinutes` (`packages/core/src/dates.ts`), and `formatMoney`, `dateTimeIn` and the zone label, each built a new `Intl` formatter per call. On a phone this is slow: Hermes loads locale and time-zone data each time. Working out a 7-booking Europe trip (route strip, plan checks and every day's bookings) built **449** date formatters.
2. **The same trip data read twice.** The route strip (`useWhere`) and the day's booking cards each called `whereInputs()`: trip, bookings, stops and places. The booking cards read it all again on every day tap.

Expo Go also runs a development build, so first renders there are slower than in the installed app.

## Change
- `packages/core/src/intl.ts`: `dateFormatter(locale, options)` and `numberFormatter(locale, options)` build each formatter once and reuse it. They're used by the date helpers, `formatMoney`, reminders, the time-zone label and `dateTimeIn`. Results are identical.
- `lib/where.ts`: `whereFor` also returns the `inputs` it read. `ItineraryView` builds the day's booking cards from `where.inputs`, so opening reads the trip once and a day tap reads nothing trip-wide.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.
- `packages/core/src/formatters.test.ts`: a whole trip's itinerary builds at most 10 date formatters (before: 449); 20 money amounts build one number formatter (before: 20); answers are unchanged.
- `itinerary-bookings.test.tsx`: opening the itinerary reads the trip once (before: twice), and a day tap doesn't read it again.
- In Node, 449 formatter calls took 52 ms building each time and 2 ms reused; a phone is slower than Node, so the saving there is larger.
- Owner: `git pull && pnpm dev:go`, then open a trip with several bookings. No new build is needed.
