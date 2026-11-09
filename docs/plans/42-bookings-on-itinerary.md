# Plan 42 — Bookings on the itinerary, each day

**Status:** ✅ Built (variant A, chosen by the owner from rendered mocks)

## Context
The owner wanted the Itinerary to show what's already booked for each day, the stay and any flight, train or bus, as cards in the day's list of stops. Mocks of two variants were drawn with the app's real components first. The owner chose **A**: check-in and check-out as timed cards, plus a strip on the nights in between.

## Change
- **`dayBookings(inputs, date)`** (`packages/core/src/day-bookings.ts`) returns the day's booking moments in time order:
  - journeys leaving that day, with their departure and arrival local to each end; an arrival in another time zone is labelled "Paris time"; an overnight arrival is "04:40 (Mon)";
  - an **arrival card on the next day** for overnight trips;
  - **check-in**, placed at whichever is later, check-in opening or your arrival that day (with "Check-in from 15:00 · after you arrive");
  - **check-out**;
  - events;
  - a **"Staying at … · night 3 of 4 · check-out …" strip** for the nights in the middle of a stay.
- **`components/booking-moment.tsx`:** `BookedCard` (outlined in the type's colour, a Booked tag, the reference (PNR or Conf.), and a Ticket link that opens the attached file offline) and `StayStrip`. Tapping either opens the booking.
- **`ItineraryView`:** bookings join each day's stops. Stops keep their own order (you arrange them), and each booking goes just before the first stop timed after it; the rest go at the end. A day with only bookings shows them and **Add stop** instead of "Nothing planned". Every plan variant shows them; Ideas doesn't.
- `durationText` keeps the minutes on long journeys ("10 h 30 min").

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.
- New tests:
  - core moments for each case: a travel day, the middle of a stay, a moving day, an overnight flight, arriving before check-in;
  - the itinerary showing cards in order among the stops, the ticket link, opening a booking, the stay strip, and a bookings-only day.
- The real cards were rendered with react-native-web and compared with the approved mock.
- Owner: `git pull && pnpm dev:go`, then open the Europe trip's Itinerary and go through its days. No new build is needed.
