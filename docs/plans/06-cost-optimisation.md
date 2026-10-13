# Plan 6 — Cost optimisation (AI + infrastructure) ✅

**Status:** Built in the same commit as this file. **Result:** savings came out at ~₹6–7 per user per year (estimate in 6.4 was ₹8–12); see `docs/06-cost-optimization.md`.

### Context
Plan 5 shows per-user running costs of ~₹13 infra + ~₹4.4 AI at Base, with Google Places and LLM drafts as the lines that grow with use. The user proposes (1) storing locations in our own DB to cut Google API calls and (2) pre-built "cached trips" for frequent patterns (e.g. Sakura-season Japan, 5–15 days) so most AI requests become deterministic, and asks for other savings. This plan **adds** to Plans 1–5; existing sections stay, and improved cost figures are shown as before/after.

### 6.1 Own place database — yes, but not by copying Google
- Google Maps Platform terms only allow caching **place_id**s (per Places policies) and lat/lng for **30 days**; names, hours and ratings can't be stored long-term, so we can't build the DB from Google results.
- Build our own **places table** from open data: **Foursquare Open Source Places** (100M+ POIs, Apache 2.0, monthly updates), **Overture Maps places** (Apache 2.0 for Foursquare-sourced records, CDLA 2.0 for others; keep attribution), and **OpenStreetMap** for opening_hours and roads. Load served regions only; refresh monthly; dedupe by name + distance.
- Google Places becomes a **paid fallback** for fresh fields (today's hours, rating) when a user opens a place: cheapest field masks, autocomplete session tokens, store only `place_id`.
- Nearby, Explore, AI tools and Find & book read our table first.

### 6.2 Cached trips ("trip blueprints") — yes, built modularly
- **Blueprint = route skeleton + city blocks.** Skeletons per destination/season/length range (Japan Sakura: 5–6 d Tokyo+Kyoto; 7–9 d +Hakone/Nara; 10–12 d +Osaka/Hiroshima; 13–15 d +Kanazawa/Takayama). City blocks = 1–4 night day plans per city by theme (food, hiking, culture, kids) from our places table with precomputed travel times.
- **Composer (plain code):** skeleton by length → fill nights with blocks by interests → shift dates → scale budget by group size + season price index → attach Find & book links.
- **Which blueprints:** seed ~50 destination×season combos (Sakura Japan, Bali, Thailand, Dubai, Vietnam, Goa monsoon, Kerala, Ladakh/Spiti summer, Rajasthan winter…), then promote patterns from logged requests and from **Verified trips** (real, validated plans at no AI cost).
- **Generation:** offline with the **Claude Batch API (50 % off)** on the larger model, validated by code (opening days, travel times, budget), top 20 human-reviewed, refreshed each season.
- **Request flow:** Claude Haiku 5.5 parses the request into fields → blueprint match → composer builds the plan with **no LLM drafting** → LLM only for a short personalised note, no-match requests, or edits the composer can't do. Target ≥ 70 % of open-ended requests served from blueprints.
- **UI:** preview shows "Built from our Sakura-season plan · used by N groups", instant; "Customise with AI" for paid users.

### 6.3 Other optimisations (each with an expected saving in the doc)
- **AI:** rule-based Trip check in code (closed days, transfer gaps, stops per day, hotel-to-stops distance, advisory/permit tables), LLM only to phrase or handle unusual cases; re-check only changed days; model routing; prompt caching of system prompt + tools; Batch API for non-interactive work (blueprints, nightly pre-trip checks, Verified-trip summaries); capped structured outputs; low effort for simple routes; quotas; cache identical requests.
- **Maps & routing:** MapLibre + self-hosted vector tiles (PMTiles on R2) once past Mapbox's free tier, reused for offline packs; self-hosted OSRM/Valhalla; cached travel-time matrices; climate normals precomputed per destination/month; forecasts cached per grid cell (check the weather API's commercial licence).
- **Infra:** WebP/AVIF thumbnails, originals backup only for Plus; CDN-cache public itineraries/templates/Explore; Realtime only on open screens; batched jobs; indexes before replicas; sampled logging.
- **Vendor:** annual plans, startup credit programmes, India-region pricing where offered.

### 6.4 Updated numbers
- Extend the Python model with a **cost-optimised** profile (blueprint hit rate 70 %, Places calls −80 %, self-hosted tiles/routing, rule-based checks); show before/after cost per user and revised break-even users in docs/05.
- Calculator: "Optimised costs" toggle + "Blueprint hit rate" slider; Python and JS formulas kept identical.
- Framing: savings ≈ ₹8–12 per user/yr — meaningful for gross margin, but marketing and conversion still decide profitability.

### 6.5 Files
| File | Change |
|---|---|
| `docs/plans/01…06-*.md` (new) | One file per plan in this log, so build history is kept in the repo |
| `docs/06-cost-optimization.md` (new) | 6.1–6.3, savings table, ToS notes with sources, rollout order |
| `docs/03-architecture.md` | Add places pipeline, blueprint store + composer, Trip-check rules engine, self-hosted tiles/routing; tables `places`, `blueprints`, `city_blocks`, `travel_time_cache`, `climate_normals` |
| `docs/04-pricing-and-costs.md` | Add optimised-cost note, link to 06 |
| `docs/05-profit-plan.md` | Add before/after cost per user and optimised break-evens (existing tables kept) |
| `mockups/profit-calculator.html` | Add toggle + slider |
| `mockups/index.html` | AI preview: "Built from Sakura-season plan · instant" chip + "Customise with AI" |
| `README.md` | Add doc 06 and `docs/plans/` |

### 6.6 Verification
- Python vs calculator equality (Playwright reads `window.TravelOGModel.run`) for Base/High, with and without optimisation.
- Playwright click-through of prototype AI preview and calculator toggle, light/dark, 0 console errors, 0 px overflow at 390 px.
- Republish both artifacts (same URLs); commit and push to `claude/kind-allen-2woote`; mark Plan 6 ✅ with its commit in this log and in `docs/plans/`.
