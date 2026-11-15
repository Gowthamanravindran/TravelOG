# Plan 59 — Save from a link, and find the places in it

**Status:** ✅ Built (step 3 of 4, after Plans 57–58)

## Context
Step 3 of the features chosen from the mocks: save the places in a travel reel, video or web page. Step 4 (Plan 60) adds TravelOG to other apps' share sheet. Until then the same screen opens from **From a link** on the Saved tab and **Save from a link** on a trip's Ideas day.

## Decisions
- **No clipboard package.** The link field takes a normal paste (long-press → Paste). `expo-clipboard` isn't in the owner's installed build, and Plan 48 forbids unlisted native packages.
- **Reading the link** (`lib/link-preview.ts`, on the phone, no key):
  - YouTube and TikTok public oEmbed give the title, creator and thumbnail;
  - other sites give their `og:` title, description and image;
  - Instagram shares nothing with other apps without Meta's API, so the screen asks for the caption to be pasted.
- **Finding places** (`@travelog/core` `place-finder.ts`): rules for how travel posts list places.
  - **Sure:** 📍 lines, numbered lists and "Location:" lines, with the area after a comma, e.g. "📍 Gunpowder, Assagao".
  - **Guesses:** "at / to / visit X", Title Case runs and two-word hashtags.
  - **Ignored:** generic tags and words (#goa, #travel, "hidden gems"), handles and prices.
- **Matching:** each candidate (up to 8) is looked up with the Plan 57 stop search near the chosen trip. A result counts only if it shares the distinctive words: "Fort" alone doesn't make Chapora Fort and Fort Aguada the same.
  - Matched and sure places start ticked; guesses start unticked.
  - Unmatched names are kept as typed, with no map spot. That's how it works until the server change reaches staging.
- **Saving:** every ticked place goes to Saved with its source (Instagram, YouTube, TikTok, web), link, post title and thumbnail. If a trip is chosen, the places also go into its Ideas. Opening the screen from a trip preselects that trip. **Add a place yourself** covers names the rules miss.
- **Later:** an AI reader of the caption and the video's speech (Phase 7, with the owner's AI key as a Supabase secret) can replace the rules behind the same screen.
