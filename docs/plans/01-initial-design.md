# Plan 1 — Initial design ✅

**Status:** Built · commit 888f30a

**Context:** empty repo; design a group trip-planning app (iOS + Android, India-first) before implementation.
**Decisions:** deliverable = docs + clickable HTML prototype; stack recommended by us; INR pricing; Home "TBD" tab = Explore.
**Built:**
- `docs/01-product-spec.md` — Home (Trips · Feed · ＋ · Explore · Profile), Plan mode (Itinerary · Budget · Bookings · Polls, plan variants A/B + compare + vote), Trip mode (Today · Plan list⇄map · Nearby · Budget with UPI settle-up), trip lifecycle, memories → Instagram, 13 gap decisions, MVP scope.
- `docs/02-design-system.md` — per-mode accent (coral / indigo / teal-on-dark), tokens, type, components, motion.
- `docs/03-architecture.md` — Expo + TypeScript, Supabase (Postgres + RLS + Realtime), Cloudflare R2, Mapbox, RevenueCat; diagram + data model; offline outbox.
- `docs/04-pricing-and-costs.md` — Subscription vs Trip Pass vs Hybrid (recommended); 1,000 users × 100 photos × 5 trips ≈ $31–94/month.
- `mockups/index.html` — clickable prototype (artifact https://claude.ai/artifact/UwdsTNbxnM5RkBe2wbtXbu).
