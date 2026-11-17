# Plan 68 — The Saved tab is hidden

**Status:** ✅ Done

## Context
Saved places across trips (Plan 58) had its own tab on the home screen. Its main source, saving places from links, was removed in Plan 64, and the owner has taken the feature out of the plan.

## Change
- The **Saved** tab is gone from the home tab bar, which is now Trips, Feed, New trip, Explore, Profile.
- **Hidden, not removed:** the Saved screen, the saved-places table and its code stay, so nothing a person saved is lost and the tab can come back by adding one line to `TABS` in `app/(home)/_layout.tsx`.

## Still in the app
Places saved earlier still feed the Ideas banner and "Plan these ideas" inside a trip, and Must-do. Those were not asked about and are unchanged; removing them is a separate decision.
