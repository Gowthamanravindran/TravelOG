# Plan 35 — Where you'll be: route strip, city per day, "Check your plan"

**Status:** ✅ Built

## Context
Bookings already hold dates and times, the ticket reader (Plan 31) finds places, and the places database (Plans 29–30) turns names into cities with time zones. The owner asked whether the app can work out **where they'll be on each day of a trip** from its bookings, and how to make that reliable and intuitive. The app suggests where you'll be, shows it plainly and lets you correct it, rather than guessing silently.

Owner decisions:
- **Where it shows:** a route strip, plus the city on each itinerary day.
- **"Check your plan":** yes.
- **Places without a booking:** yes. A city is required; a name and address are optional, with Open in Maps. Pins on a map come with the maps phase.
- **Whole days in transit** must be handled.

## The rule: one answer per night
For each night of the trip, the app decides where you are, in this order:
1. **A place you set yourself.**
2. **A stay booking that covers that night** (checked in on or before it, checking out after it).
3. **In transit:** a journey that leaves on or before that night and arrives on a later day. This covers overnight trains and buses, long flights, and road trips you add yourself. It is not a gap.
4. **Probably:** where you last arrived or stayed, else the trip's destination. Shown with a "?" and counted as a gap.

**Days** list their journeys. A day spent entirely on the way is marked **"In transit"**.

## What was built
- **`packages/core/src/whereabouts.ts`:**
  - `whereabouts()`: nights, days and journeys. Journey times are read in each place's own time zone.
  - `routeStops()`: the route strip's items.
  - `planChecks()` finds three kinds of question:
    - nights with no stay, grouped into runs;
    - you arrive in one city but that night's stay is in another (only when both are cities and different);
    - two booked stays on one night.

    Questions about places you set yourself are never raised.
- **Database** (migration `0006`):
  - bookings gain `from_place_id`, `to_place_id`, `place_id` and `address`;
  - a new synced `trip_stops` table (staying or travelling, places, dates, name, address, notes);
  - `saveTypedPlace` for "use as typed";
  - `whereInputs` gathers a trip for `whereabouts`.
- **Booking form: a Where section.**
  - Journeys get **From** and **To**. Stays, events and rentals get a **City** (or Where) and an **Address** with **Open in Maps** (a maps search link, no map package needed).
  - **Times follow places:** a start time is in the from-place's time zone and an end time in the to-place's. This fixes the "arrival shown in trip time" limit from Plan 31.
  - "Check your plan" → **Add stay** opens the form as a stay with those dates.
- **Ticket reader → places:**
  - The parser returns the journey's ends (names and airport codes) and a stay's or venue's address.
  - On upload, these are matched to places from our list: the name printed on the ticket first, else the airport's town; a hotel's town from its address, most specific part first.
  - **Only exact names count.** Anything else is left as typed for checking, never guessed.
- **Airports list:** `scripts/places/airports.mjs` builds IATA code → city from OurAirports (public domain), run by the Places data workflow. It has 3,941 airports with scheduled flights, about 210 KB, shipped as an asset like the countries list. `data/places/airport-cities.json` names the city travellers mean when the airport sits in a small town (for example GOI → Goa, NRT → Tokyo).
- **Screens:**
  - `components/route-strip.tsx`: tap a stop to open its booking or place.
  - `components/plan-checks.tsx`, with the actions **Add stay**, **I'm sorted** (adds a place you set), **Yes, that's right**, **Open the booking** and **Dismiss**. Dismissals are stored per trip.
  - The city appears under each itinerary day chip.
  - **Add a place without a booking** links to `app/trip/[id]/stop.tsx`: Staying or Travelling; city, or from and to; arrive–leave dates; optional name, address with Open in Maps, and notes.

## Limits
- Places typed "as is" are saved on this phone only. When sync arrives they need to travel with the trip (noted for the sync phase).
- Train and bus stations have no code list. Their names are matched instead ("KSR Bengaluru (SBC)" → Bengaluru).
- Map pins and "places near your stay" wait for the maps phase (Phase 4).

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.
- New tests:
  - core `whereabouts` (stays, overnight train, a whole day in transit, a road trip added by hand, places you set winning, arrival time zones, routeStops, every planChecks rule);
  - db `trip_stops` and the outbox;
  - parser places;
  - the place lookup (exact names, country, airport fallback, addresses);
  - the booking form Where section and time zones;
  - the route strip, day labels, Check your plan, I'm sorted and Dismiss;
  - the airports builder.
- Owner: `git pull && pnpm dev:go`.
  - Add a flight and a hotel, or upload their PDFs, and open the Itinerary tab.
  - Then try a night with no stay, "I'm sorted", and a place without a booking.
  - No new build is needed.
