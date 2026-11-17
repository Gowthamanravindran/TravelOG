# Plan 69 — Saved places are hidden inside trips too

**Status:** ✅ Done

## Context
Plan 68 hid the Saved tab. Saved places still showed up inside a trip in three spots; the owner asked for those to go as well, for now.

## Change
- **Ideas day:** the "saved places near …" banner and its sheet are gone. **Plan these ideas** stays: it spreads the trip's own ideas over its days and never needed Saved.
- **Stop editor:** no **Save to Saved** button.
- **Must-do:** the list is the trip's ideas, starred stops and things typed there; saved places near the trip no longer join it. After a trip, what is left is still listed, without the **Keep in Saved** button.

## Kept, so it can come back
The saved-places table, its repository, the Saved screen and the banner component (`SavedForTrip`) are still in the code, unused. Nothing a person saved earlier is deleted; it is simply not shown anywhere.
