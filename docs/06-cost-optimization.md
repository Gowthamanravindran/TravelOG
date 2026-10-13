# 06 · Cost Optimisation — TravelOG

How to cut AI and infrastructure cost per user without making the app worse. Numbers come from the same model as [05 · Profit plan](05-profit-plan.md); the [calculator](../mockups/profit-calculator.html) has an **Optimised costs** switch.

## 1. Result

| Per active user / year (100k users) | Low before → after | Base before → after | High before → after |
|---|---|---|---|
| AI | ₹3.0 → **₹1.3** | ₹4.4 → **₹2.1** | ₹6.5 → **₹3.3** |
| Infrastructure | ₹13.1 → **₹9.1** | ₹13.1 → **₹9.1** | ₹13.1 → **₹9.1** |
| Running costs (AI + infra + support + payments) | ₹19.2 → **₹13.6** | ₹20.9 → **₹14.6** | ₹23.2 → **₹16.1** |
| Contribution | −₹98.7 → **−₹93.0** | −₹13.9 → **−₹7.6** | ₹48.9 → **₹56.0** |

- Running costs drop by about **₹6–7 per user per year** (~30 %). AI roughly halves; infrastructure falls ~30 % at 100k users and more at larger scale because the extra fixed cost (self-hosted routing and tiles, blueprint generation) is spread over more users.
- **Users needed to break even:**

| Scenario | Lean team: before → after | Seed team: before → after |
|---|---|---|
| Base | never (≤5M) → **never (≤5M)** | never (≤5M) → **never (≤5M)** |
| Base, 10 % paid | 320,000 → **205,000** | 1,035,000 → **655,000** |
| Base, 5 % Plus + 30 % paid | 195,000 → **145,000** | 630,000 → **460,000** |
| High | 78,000 → **69,000** | 255,000 → **220,000** |

- Base with 50 % paid users still never breaks even: cost savings help, but marketing and conversion decide profitability (see 05).
- Blueprints also let us give free users a better model. With blueprints, running free-tier AI on Claude Sonnet 5.5 instead of Haiku 5.5 costs about **₹8.9 L a year at 100k users instead of ₹27.0 L** without them.

## 2. Our own places database

### Why not store Google results
Google Maps Platform terms allow caching **place IDs** (per the Places API policies) and **latitude/longitude for at most 30 consecutive days**. Names, opening hours, ratings and photos can't be kept in our database long-term. So "cache Google in our DB" is not an option.

### What we build instead
| Source | What we take | Licence |
|---|---|---|
| [Foursquare Open Source Places](https://foursquare.com/resources/blog/products/foursquare-open-source-places-a-new-foundational-dataset-for-the-geospatial-community/) | 100M+ places: name, category, location, address, website; monthly updates | Apache 2.0 |
| [Overture Maps places](https://docs.overturemaps.org/blog/2025/09/24/release-notes/) | Extra coverage and confidence scores | Apache 2.0 for Foursquare-sourced records, CDLA 2.0 for others; keep attribution |
| OpenStreetMap | `opening_hours` tags, roads for routing, map tiles | ODbL (attribution, share-alike on the database) |
| Our users | Corrections, check-ins, "time spent" from Trip mode, Verified trips | Ours |

- Load only regions we serve (India + top international destinations); refresh monthly; merge duplicates by name similarity + distance; keep a `source` and licence per row.
- **Nearby, Explore, the AI planner, blueprints and Find & book read our `places` table first.**
- **Google Places is a fallback**, called only when a user opens a place and needs something fresh (today's hours, live rating): cheapest field mask, autocomplete session tokens, store only the `place_id`.
- Expected effect: billable Places calls down ~80 %.

## 3. Trip blueprints (cached trips)

### Shape
A blueprint is built from parts, so one blueprint covers many trip lengths.

| Part | Example (Japan, Sakura season) |
|---|---|
| **Route skeleton** per length range | 5–6 days: Tokyo → Kyoto · 7–9: + Hakone, Nara · 10–12: + Osaka, Hiroshima · 13–15: + Kanazawa, Takayama |
| **City blocks** (1–4 nights, by theme) | Kyoto 3N "food + temples", Kyoto 2N "hiking"; each block is a day plan from our places table with travel times precomputed |
| **Season notes** | Peak bloom window, crowd warnings, price index for that month |
| **Booking anchors** | Stay areas per city and transport legs, linked to Find & book |

### How a request is answered
```
"10 days in Japan in April, 4 people, ₹2L each, food + hiking"
   │  Claude Haiku 5.5 → {destination: Japan, month: Apr, days: 10, group: 4, budget: 200000, interests: [food, hiking]}
   ▼
Blueprint match (Japan · Sakura · 10–12 day skeleton)          ── no match → full AI draft (as today)
   ▼
Composer (plain code): fill nights with city blocks by interest → set dates
→ scale budget by group + season price index → attach Find & book links
   ▼
Claude Haiku 5.5 writes a 3–4 line personal note  →  preview in ~1 s
   ▼
Paid users: "Customise with AI" → larger model edits from this draft (fewer tokens than starting fresh)
```

### Which blueprints and how they're made
- **Seed ~50 destination × season combinations** from known demand: Japan (Sakura, autumn), Bali, Thailand, Vietnam, Dubai, Singapore, Sri Lanka, Goa (monsoon/winter), Kerala, Ladakh & Spiti (summer), Rajasthan (winter), Himachal, Andaman, Meghalaya…
- **Generate offline with the Claude Batch API (50 % off)** on a larger model, then **validate in code** (opening days, travel times between blocks, budget totals) and human-review the top 20.
- **Grow from data:** log parsed requests; when a destination/month pattern repeats without a match, queue a new blueprint. Popular **Verified trips** become blueprints at no AI cost.
- **Refresh each season**, and on advisory changes (road closures, visa rules).
- Target: **≥ 70 % of open-ended requests answered from a blueprint.**

## 4. Other savings

| Area | Change | Saving |
|---|---|---|
| AI | **Trip check by rules in code**: closed days, transfer gaps, stops per day, hotel-to-stops distance, sunset times, permits/road-closure table. AI only phrases findings or handles unusual cases; re-check only changed days | ~80 % of Trip check cost |
| AI | **Model routing**: Haiku 5.5 for parsing, checks and notes; a larger model only for paid custom drafts | Large; already in the plan |
| AI | **Prompt caching** of the system prompt and tool definitions (identical prefix on every request) | Input cost on repeated prefix drops to the cache-read rate |
| AI | **Batch API (50 % off)** for anything not interactive: blueprints, nightly pre-trip checks, Verified-trip summaries | 50 % on those jobs |
| AI | Short structured outputs with output caps; low effort on simple routes; per-user quotas; reuse answers for identical requests (same destination/length/month) | 10–30 % |
| Maps | **MapLibre + self-hosted vector tiles** (PMTiles on R2) once past Mapbox's free 25k MAU; the same files serve offline packs | Per-MAU tile fees → near zero |
| Routing | **Self-hosted OSRM/Valhalla** on one VPS; cache travel-time matrices between our place IDs | Per-request routing fees → fixed ~$40–60/mo |
| Weather | Precompute monthly **climate normals** per destination once; forecasts per trip day, cached per grid cell (check the provider's commercial licence) | Weather calls → a few per trip |
| Storage | Device-side resize (already), WebP/AVIF thumbnails, original-photo backup only for Plus | Storage and bandwidth −30–50 % |
| Backend | CDN-cache public itineraries, templates and Explore; Realtime only on open screens; batched background jobs; indexes before read replicas; sampled logs | Delays the next Supabase compute tier |
| Vendor | Annual plans, startup credit programmes, India-region pricing where offered | 10–20 % on vendor bills |

## 5. Rollout order

| Step | When | Why first |
|---|---|---|
| Model routing, prompt caching, quotas | From launch | Free, no new systems |
| Rule-based Trip check | Launch | Cheaper and more predictable than AI for known issues |
| Places DB (Foursquare + OSM) for India | Before Nearby ships | Removes the biggest variable API bill |
| 20 blueprints (top destinations) via Batch API | v1.5, with Plan with AI | Makes the most common AI request near-free |
| Self-hosted routing | When Directions free tier is exceeded | Fixed cost only pays off at volume |
| Self-hosted tiles | Past 25k monthly map users | Same |
| Blueprints from Verified trips, automatic gap detection | After 10k trips | Needs data |

## 6. Assumptions behind the numbers
| Lever | Before | After |
|---|---|---|
| Share of drafts answered by a blueprint | 0 % | 70 % (cost per blueprint answer ≈ $0.001 on Haiku 5.5) |
| Trip check handled by rules | 0 % | 80 % |
| Infrastructure per user | ₹12 / yr | ₹7 / yr (Places −80 %, tiles/routing self-hosted, CDN) |
| Fixed infrastructure | $100 / mo | $200 / mo (routing VPS, tile hosting, blueprint batches) |

Sources: [Google Maps Platform service terms](https://cloud.google.com/maps-platform/terms/maps-service-terms/index-20240522) · [Foursquare OS Places](https://foursquare.com/resources/blog/products/foursquare-open-source-places-a-new-foundational-dataset-for-the-geospatial-community/) · [Overture release notes](https://docs.overturemaps.org/blog/2025/09/24/release-notes/).
