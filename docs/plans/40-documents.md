# Plan 40 — Documents: every ticket in one place, one tap from the header, offline

**Status:** ✅ Built

## Context
The owner found attachments hard to reach: they were inside each booking's edit form. They asked whether the app works offline, especially attachments, and asked for a Documents section under Bookings (as a tab next to All bookings) with a header button to it.

## How the app works offline
- **Everything about a trip is in the phone's own database:** bookings, itinerary, budget, places and the city on each day. All of it opens with no signal.
- **Every attached file is copied into the app's own storage** when it's attached, and opens in the phone's viewer from there, with no network.
- **Only these need a connection:** searching for a city that isn't on the phone yet, new exchange rates (the last saved rate is reused), and posting to Instagram.

## Change
- **Bookings → All bookings · Documents.**
- **Documents lists every file in the trip:**
  - Trip documents (passport, insurance… not tied to a booking) come first, then each booking's files in date order, under the booking's title, type and time;
  - each row has an icon, the name and size, and **tap to open**; a ⋯ menu offers Open booking and Remove;
  - "Saved on this phone · opens without signal" at the top;
  - **Add documents** (up to 10) adds trip documents;
  - a file missing on this phone (later, with sync) shows "Not on this phone yet" instead of failing.
- **A Documents button in the trip header.** Plan mode opens Bookings → Documents. Trip mode, which has no Bookings tab, opens a Documents page in Trip mode's look.
- **Database:** `addAttachment` takes `bookingId: null`; `listTripAttachments` returns every file with its booking, in this order.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.
- New tests:
  - the order of the list and opening a file;
  - a missing file;
  - adding trip documents;
  - Bookings opening on Documents and switching back;
  - the header button in Plan and Trip mode;
  - db `listTripAttachments`, including a deleted booking taking its files with it.
- The header and the Documents tab were rendered with react-native-web, light and dark, and checked by eye.
- Owner: `git pull && pnpm dev:go`, then turn on airplane mode and open a ticket from Documents in Plan and Trip mode. No new build is needed.
