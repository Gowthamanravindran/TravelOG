# Plan 88 — "A stay every night" means every night; an uploaded booking is not added twice

**Status:** ✅ Built, not yet seen on a phone · Found by the owner

## 1. "A stay every night" ticked with one hotel
**What was wrong.** The item was done when the trip had any stay booking and no night was flagged as a gap. But a trip made on the globe (Plan 67) saves a stop for each city on every night, and those counted as "a place you set yourself", so no night was ever a gap. A 4-night hotel on a 20-night trip ticked the item.

**Change.** A night counts only if something says where you sleep: a booked stay, an overnight journey, or a stay you set yourself and named or gave an address ("Aunt's house"). A stop that only says which city you will be in is a plan, not somewhere to sleep. The item now says how many nights are left: "16 nights without a stay". (`nightsWithoutStay` in `packages/core/src/whereabouts.ts`.)

## 2. The same booking uploaded twice became two bookings
**What was wrong.** Duplicates were only caught among the files picked together, never against the bookings already saved in the trip.

**Change.** An upload now leaves out a booking that is already in the trip:
- the very same file (same name and size) already attached in the trip; or
- a booking with the same type, booking reference (ignoring case and spaces) and start date and time, as its own place's time zone prints it. A return on one reference is two different starts, so both legs still count.

If nothing new is left, Bookings says "That booking is already in this trip." instead of opening an empty form. If some are new, the form says "1 already in this trip, left out."

## Checks
`whereabouts.test.ts` (16 of 20 nights for the owner's case; named and addressed stays count; overnight journeys count), `readiness.test.ts`, `readiness-stays.test.ts` (the owner's case end to end; failed on the old code), `booking-import.test.tsx` (the same file again, a renamed copy, a new file alongside a known one, another leg on the same reference).
