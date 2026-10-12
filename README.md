# TravelOG

Plan trips with your crew, vote on where to go, run the trip live, and turn it into memories you can post to Instagram. iOS + Android, India-first.

**Status:** design phase. No app code yet.

## Design docs
| Doc | What's inside |
|---|---|
| [01 · Product spec](docs/01-product-spec.md) | The three modes (Home, Plan, Trip), every screen, trip lifecycle, polls and plan variants, memories, gap decisions, MVP scope |
| [02 · Design system](docs/02-design-system.md) | Per-mode theming, colour tokens, type, components, motion |
| [03 · Architecture](docs/03-architecture.md) | Expo + Supabase + R2 + Mapbox stack, system diagram, data model, offline, security |
| [04 · Pricing & costs](docs/04-pricing-and-costs.md) | Subscription vs Trip Pass vs Hybrid, cost model for 1,000 users × 100 photos × 5 trips, 10k-user sensitivity |

## Clickable prototype
Open [`mockups/index.html`](mockups/index.html) in a browser. The left panel jumps between modes; everything inside the phone is clickable (tabs, Find & book → Add to poll → Book on partner → save to My bookings, plan variants + compare, voting and lock-in, add expense, settle up, map view, collage templates).

## Modes at a glance
| Mode | Bottom nav |
|---|---|
| Home | Trips · Feed · ＋ · Explore · Profile |
| Plan / Edit | Itinerary · Budget · Bookings (Find & book + My bookings) · Polls |
| Trip (live) | Today · Plan (list ⇄ map) · Nearby · Budget |
