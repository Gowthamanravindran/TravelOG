# 04 · Pricing Models & Cost Approximation — TravelOG

India-first. Prices are **GST-inclusive INR** (as shown in the stores). FX assumption: **₹88 = $1**. Vendor prices checked October 2026 (sources at the end); re-verify before launch.

---

## 1. What's free vs paid (all models)

| Feature | Free | Paid (Plus / Trip Pass) |
|---|---|---|
| Trips | 2 active trips (unlimited past) | Unlimited |
| Members per trip | 6 | 30 |
| Itinerary, plan variants, single/multi polls | ✅ | ✅ |
| Ranked polls, availability grid | — | ✅ |
| Budget, expenses, UPI settle-up | ✅ | ✅ + CSV/PDF export, receipts OCR (v2) |
| Bookings & tickets | 10 attachments / trip | Unlimited |
| Offline maps | — | ✅ |
| Location timeline ("time spent") | — | ✅ |
| Photos in trip pool | 50 / trip, resized | Unlimited, optional originals |
| Memories | 3 templates, watermark | All templates, HD, no watermark, carousel |

Core collaboration stays free — a group app dies if one friend hits a paywall before voting.

---

## 2. Three pricing models

### Model A — Per-user subscription ("TravelOG Plus")
- **₹149 / month** or **₹999 / year** (~44 % off).
- Pros: predictable recurring revenue; simple.
- Cons: most Indians travel in groups 1–3×/year → hard to justify a yearly sub; one paying friend doesn't unlock the group.

### Model B — Per-trip "Trip Pass"
- **₹199 per trip**, one-time; unlocks paid features **for every member of that trip** (≈ ₹30–50 each when split — can itself be added as an expense!).
- Pros: matches how people actually use the app (bursty, group); viral (the whole group sees premium).
- Cons: revenue is lumpy; no recurring base.

### Model C — Hybrid (✅ recommended)
- **Trip Pass ₹199** per trip **or** **Plus ₹1,199 / year** (all trips you create get the pass automatically + personal perks: originals backup, profile stats, early templates).
- Pros: casual groups buy a pass; frequent travellers/creators subscribe; Plus is an easy upsell after the 2nd pass ("You've spent ₹398 — Plus is ₹1,199 for unlimited").
- Cons: two SKUs to explain (keep the paywall to one screen).

### Extra revenue (any model, v2)
- **Affiliate bookings** — hotel/flight/bus links in itinerary & bookings (typically a few % commission per booking).
- **Sponsored Explore templates** — tourism boards, homestays (clearly labelled).
- **Creator itineraries** — paid templates with revenue share (later).

---

## 3. Cost approximation — scenario: 1,000 users × 100 photos × 5 trips

### Assumptions
| Input | Value |
|---|---|
| Users | 1,000 (all active in the period) |
| Photos | 100 per user → **100,000 photos** |
| Trips | 5 per user → **5,000 trips** (worst case — shared trips would mean fewer) |
| Photo storage (resized on device) | ~500 KB display (1600 px) + ~40 KB thumb → **≈ 54 GB** |
| "Keep originals" (optional) | ~3 MB each → **+300 GB** |
| Trip length | 5 days avg → 25,000 live trip-days / yr |
| Routing calls | ~120 per trip (recomputed on edits) → ~50k / month |
| Nearby (Places) calls | ~3 billable per live trip-day after geohash caching → ~6.3k / month |

### Monthly infrastructure cost

| Service | Plan / unit price | Lean | Comfortable |
|---|---|---|---|
| **Supabase** (DB, Auth, Realtime, Edge Fns) | Pro $25 incl. $10 compute credit; Small compute +$5 | $30 | $30 |
| **Cloudflare R2** storage | $0.015/GB-mo, first 10 GB free | 54 GB → **$0.66** | 354 GB (with originals) → **$5.16** |
| R2 operations & egress | 1M writes + 10M reads free; **egress free** | $0 | $0 |
| **Mapbox** maps SDK | 25k MAU free | $0 | $0 |
| **Mapbox** Directions | ~100k req/mo free | $0 (≈50k) | $0 |
| **Google Places** Nearby Search Pro | 5k/mo free, then $32 / 1,000 | $0 (cap to free tier / OSM fallback) | 6.25k → **$40** |
| Expo EAS (builds, OTA) | Free tier / Starter | $0 | $19 |
| Expo Push, Resend (3k emails), Sentry dev, PostHog (1M events), RevenueCat (< $2.5k MTR) | free tiers | $0 | $0 |
| **Total / month** | | **≈ $31 (₹2.7k)** | **≈ $94 (₹8.3k)** |

### Annual view

| | Lean | Comfortable |
|---|---|---|
| Infra (×12) | $368 | $1,130 |
| Apple Developer ($99/yr) + Google Play ($25 once) + domain (~$15) | $139 | $139 |
| **Total / year** | **≈ $507 (₹45k)** | **≈ $1,269 (₹1.12 L)** |
| **Per user / year** | **₹45** | **₹112** |

Storage is *not* the cost driver: 100k photos cost < $6/month on R2 thanks to on-device resizing and zero egress. The real drivers are the **fixed Supabase plan** and **Places API calls** — so cache Places hard (shared geohash cache, 7-day TTL) and limit Nearby refreshes on Free.

### Does the pricing model change cost?
Barely. Free-tier limits (50 photos/trip) already fit this scenario (100 photos ÷ 5 trips = 20/trip). Paid tiers add originals storage (+$0.045/user-month at 3 GB) and Places/offline usage, which only payers trigger — so cost scales with revenue in every model.

---

## 4. Revenue comparison (same 1,000 users, 1 year)

Net to us = gross × 0.85 (15 % store fee — Apple Small Business Program / Google Play reduced rate) ÷ 1.18 (18 % GST) = **gross × 0.72**.

| Model | Conservative | Expected |
|---|---|---|
| **A** Subscription ₹999/yr | 3 % users → 30 × ₹999 = ₹29,970 → **net ₹21.6k** | 6 % → 60 subs → ₹59,940 → **net ₹43.2k** |
| **B** Trip Pass ₹199 | 6 % of trips → 300 passes → ₹59,700 → **net ₹43.0k** | 12 % → 600 passes → ₹1,19,400 → **net ₹86.0k** |
| **C** Hybrid | 2 % Plus (20 × ₹1,199) + 5 % of remaining 4,900 trips (245 passes) = ₹72,735 → **net ₹52.4k** | 4 % Plus (40) + 10 % of remaining 4,800 trips (480 passes) = ₹1,43,480 → **net ₹1.03 L** |

### Profit at 1,000 users (net revenue − annual cost)

| Model | vs Lean cost ₹45k | vs Comfortable cost ₹1.12 L |
|---|---|---|
| A conservative / expected | −₹23k / −₹2k | −₹90k / −₹69k |
| B conservative / expected | −₹2k / **+₹41k** | −₹69k / −₹26k |
| C conservative / expected | +₹7k / **+₹58k** | −₹60k / −₹9k |

**Takeaways**
1. At 1,000 users this is a **pilot**: every model is roughly break-even — run lean (cap Places to the free tier, skip originals until people pay).
2. **Model A loses** — a solo subscription doesn't fit bursty group travel.
3. **B and C both work**; **C is recommended** — it keeps B's group-friendly pass and adds a recurring base from frequent travellers, and leads in both scenarios.
4. Affiliate bookings are upside not counted here; even ₹50 net commission on 5 % of trips adds ~₹12.5k.

---

## 5. Sensitivity — 10,000 users (same behaviour)

| Line | Monthly | Notes |
|---|---|---|
| Supabase Pro + Medium compute | ~$75 | DB ~5 GB, 10k MAU (well under 100k included) |
| R2 (540 GB → 3.5 TB with originals) | $8 – $52 | still zero egress |
| Mapbox maps | $0 | under 25k MAU |
| Routing | ~$40 | **self-host OSRM/Valhalla (India extract) on a VPS** — Mapbox Directions would be ~$800/mo at ~500k req |
| Google Places | $150 – $450 | cache hit-rate rises with scale; consider Google's India pricing SKUs or Foursquare/OSM for POIs |
| EAS, Sentry Team, PostHog, Resend | ~$65 – $120 | leave free tiers |
| **Total** | **≈ $340 – $740 / mo (₹3–6.5 L / yr)** | ₹30–65 per user / yr |

Hybrid revenue at 10k users ≈ **₹5.2 L (conservative) – ₹10.3 L (expected) net/yr** → positive margin once routing is self-hosted and Places is cached.

---

## 6. Payment & tax notes (India)
- In-app digital goods must go through App Store / Play Billing (RevenueCat wraps both). Settle-up money between friends is **not** our transaction — UPI deep link only.
- Prices shown GST-inclusive; register for GST once turnover crosses the threshold (OIDAR rules apply to foreign sellers).
- Regional pricing: keep USD tiers for international users (e.g. Trip Pass $3.99, Plus $24.99/yr).
- Trip Pass in stores: non-consumable tied to a trip ID via RevenueCat attributes, validated server-side by webhook.

## Sources
- [Supabase pricing](https://supabase.com/pricing)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Mapbox pricing](https://docs.mapbox.com/accounts/guides/pricing/) · [third-party breakdown](https://www.woosmap.com/blog/mapbox-pricing)
- [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
