# TravelOG

Plan trips with your crew, vote on where to go, run the trip live, and turn it into memories you can post to Instagram. iOS + Android, India-first.

**Status:** design complete; ready for Phase 0 of the development plan. No app code yet.

## Design docs
| Doc | What's inside |
|---|---|
| [01 · Product spec](docs/01-product-spec.md) | The three modes (Home, Plan, Trip), every screen, trip lifecycle, polls and plan variants, memories, gap decisions, MVP scope |
| [02 · Design system](docs/02-design-system.md) | Per-mode theming, colour tokens, type, components, motion |
| [03 · Architecture](docs/03-architecture.md) | Expo + Supabase + R2 + Mapbox stack, system diagram, data model, offline, security |
| [04 · Pricing & costs](docs/04-pricing-and-costs.md) | Subscription vs Trip Pass vs Hybrid, cost model for 1,000 users × 100 photos × 5 trips, 10k-user sensitivity, AI cost |
| [05 · Profit plan](docs/05-profit-plan.md) | Usage, conversion, marketing, AI and team costs across 1k–1M users; when the app becomes profitable |
| [06 · Cost optimisation](docs/06-cost-optimization.md) | Own places database, trip blueprints, rule-based checks, self-hosted maps; before/after costs |
| [07 · Open items](docs/07-open-items.md) | Legal, business, product and ops items still to decide |
| [08 · App optimisations](docs/08-app-optimizations.md) | Startup, rendering, sync, battery, storage, size targets |
| [09 · Tech stack](docs/09-tech-stack.md) | Complete, authoritative stack list and environments |
| [10 · Auth](docs/10-auth.md) | Sign-in methods, sessions, invites, roles, deletion |
| [11 · Local DB & sync](docs/11-local-db-and-sync.md) | On-device SQLite, pull/push sync, conflicts, recovery |
| [12 · Migrations](docs/12-migrations.md) | Server and device migrations with commands and runbooks |
| [13 · Development plan](docs/13-development-plan.md) | Phases 0–8 with your tasks and exit criteria |
| [14 · Owner setup](docs/14-owner-setup.md) | Every account and secret you set up, step by step |
| [Plan log](docs/plans/) | Every planning step in order, with what was built |

## Start here
1. [14 · Owner setup](docs/14-owner-setup.md) §1–§5 (Phase 0 accounts).
2. [13 · Development plan](docs/13-development-plan.md) Phase 0.

## Clickable prototype
Open [`mockups/index.html`](mockups/index.html) in a browser. The left panel jumps between modes; everything inside the phone is clickable (tabs, Find & book → Add to poll → Book on partner → save to My bookings, plan variants + compare, voting and lock-in, add expense, settle up, map view, collage templates).

## Profit calculator
Open [`mockups/profit-calculator.html`](mockups/profit-calculator.html): every assumption in the profit plan is a slider.

## Modes at a glance
| Mode | Bottom nav |
|---|---|
| Home | Trips · Feed · ＋ · Explore · Profile |
| Plan / Edit | Itinerary · Budget · Bookings (Find & book: Stays · Transport · Activities, + My bookings) · Polls |
| Trip (live) | Today · Plan (list ⇄ map) · Nearby · Budget |
