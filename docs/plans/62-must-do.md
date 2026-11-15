# Plan 62 — Must-do in Trip mode

**Status:** ✅ Built

## Context
The owner asked for a bucket list in Trip mode. They chose one **Must-do** list built from what the trip already has, rather than a separate list, and gave it Trip mode's third tab until maps bring Nearby.

## Decisions
- **What's on it** (`lib/must-do.ts`):
  - the trip's Ideas;
  - stops starred ★ in the itinerary (`itinerary_items.must_do`, migration `0009`);
  - Saved places near the trip that aren't on it yet;
  - things typed on the tab (`checklist_items`, list `mustdo`).
- **Ticking is a check-in** (`checkInNow`, with the location setting as before):
  - a Saved place joins the trip's Ideas first, so the check-in links to a stop;
  - a sheet then asks for a line about it (`setCheckInNote`);
  - unticking removes that check-in.
  - Done items show their time, and the check-in appears in Today's timeline. Check-ins don't show in Memories yet; that's in `docs/07`.
- **On Today:** a Must-do card with a ring, "Next: …" or "Closest not done: …, 4 km". The distance is measured from your latest check-in that had a place; it never tracks you.
- **After the trip:** "N left for next time" with **Keep in Saved**.
- The Nearby placeholder tab is gone; Nearby comes back with maps (Phase 4).
