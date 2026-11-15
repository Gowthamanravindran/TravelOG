# Plan 61 — Get ready: trip readiness in Plan mode

**Status:** ✅ Built

## Context
The owner asked for a trip-readiness checklist in Plan mode (visa done, tickets booked, hotel booked…) that shows how ready a trip is. Mocks were approved, with these choices:
- items tick themselves from the trip;
- a starting list suggested by the trip's type;
- a one-line card above the itinerary, because the list will grow long.

## Decisions
- **Ticked from the trip** (`@travelog/core` `readiness.ts`, worked out rather than stored):
  - **Getting there and back:** a flight, train or bus at each end of the trip.
  - **A stay every night:** stays are booked and "Check your plan" finds no gaps. A gap you dismissed there counts as fine.
  - **Budget set.**
  - **First stops planned.**

  These replace the Plan 16 "Set up your trip" card, which is removed. Adding people moves to the trip header's people chip as before; invites come with accounts.
- **Your own items:** a new synced table `checklist_items` (migration `0009_checklists`, shared with Must-do):
  - sections (Documents, Money and phone, Packing, Other), plus a title, a due date, Remind me, a note and when it was done;
  - **Remind me** schedules a local reminder at 09:00 trip time, 3 days before the due date (or on the day itself if that's sooner), through the existing reminder planner (`check:<id>`).
- **Starting list** (`checklist-templates.ts`):
  - **Abroad:** visa, passport validity, insurance, forex, eSIM.
  - **In India:** ID cards.
  - **By trip kind:** beach, mountains, trek or camping, pilgrimage, road trip.
  - **Permit regions** (Ladakh, Spiti, Sikkim, Arunachal, Nagaland, Mizoram, Manipur) add an Inner Line Permit item.
  - "Abroad" compares the destination's country with home, which is inferred from the home currency (no home-country setting yet). It's offered as **Use these N**, or you add your own.
- **Where it shows:**
  - a one-line **Get ready** card above the itinerary (ring, "N left · next: …", Open), hidden when all is ready;
  - the **Get ready** screen, where tapping an item gives due date, Remind me, note, Mark done and Remove;
  - a small ring on the home trip card, plus the first due item in red.
  - A "Ready" chip in the trip header was tried and dropped. The header stays mounted on every tab, so it recalculated the trip on each save (the Plan 49 hidden-screens test caught it).
