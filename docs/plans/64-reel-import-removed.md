# Plan 64 — "Save from a link" and "Share to TravelOG" removed, to the backlog

**Status:** ✅ Done

## Context
Plans 59 and 60 let you paste or share a reel, video or page link, then read the post's caption for place names. From the phone, Instagram shares no caption, and its reels can't be shown in the app without Meta's approval. That left the feature with little to offer for Instagram, the main source. The owner asked to take the whole feature out and put it on the backlog.

A reference app's import screen (reference only) shows the real approach: a server pipeline (open source → look through content → find places → check place details), about 10 seconds. It needs a spike, a cost model and a decision on Instagram's terms first, all recorded in `docs/07`.

## Decisions
- **Removed, not hidden.** A share target in the build that leads nowhere would confuse people, and the code is kept in git history (`4a13473`, `d4599aa`). What went:
  - the Save from a link screen, the link preview and the place finder (`@travelog/core` `place-finder.ts`);
  - its buttons on the Saved tab and the Ideas day;
  - the share handler and `+native-intent`;
  - the `expo-share-intent` package and its plugin;
  - the Profile build-status wording and the setup steps in `docs/14`.
- **Kept, because each is useful without links:**
  - Saved places, added by search or from stops, with the Ideas banner and Plan these ideas (Plan 58);
  - places on stops, travel times and Best order (Plan 57);
  - Get ready and Must-do (Plans 61–62).
  - The `saved_places` link columns stay too, to avoid a migration; they're empty for now.
- **The development build from Plan 60** still lists TravelOG in the share sheet; sharing just opens the app. The next build drops it. Nothing else changed natively.
