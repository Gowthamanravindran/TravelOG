# 15 · Go-to-Market and Growth

The profit plan ([05](05-profit-plan.md)) works only if most new users arrive for free: **at most ~30 % of new users from paid ads**. This doc is how we get there.

## 1. Who it's for
| Segment | Why they need TravelOG | Where to find them |
|---|---|---|
| **Primary: friend groups, 20–32, Indian metros and colleges** | 3–8 people planning long weekends and a first international trip; plans live in messy WhatsApp groups; splitting money is painful | Colleges, first jobs, trekking/travel clubs, Instagram travel pages, Reddit (r/india travel threads, city subs) |
| Secondary: families and couples | Fewer people, more bookings per trip (higher affiliate value) | Later, via Verified trips and SEO |

**One-line pitch:** *Plan trips with your friends — vote, split, go.*
**Against WhatsApp + Google Docs + Splitwise:** one place for the plan, the vote, the money and the memories; works offline on the trip.

## 2. Growth loops (free users)
| Loop | How it works | Target |
|---|---|---|
| **Trip invite loop** | Every trip needs the group → the creator invites ~3 friends via WhatsApp link → some of them start their own trips | ≥ 3 invites per trip; ≥ 50 % of invitees join |
| **Referral reward** | Inviter gets a free Trip Pass when 3 invited friends complete a trip | Raises invites on paid-feature-curious users |
| **Verified trips + public itinerary pages** | Completed trips published as itineraries; pages indexed by search engines ("Spiti 7-day itinerary with real costs") → "Use this plan" installs the app | 10 % of completed trips published |
| **Instagram memories** | Collages carry "Plan this trip on TravelOG" + link | 15 % of completed trips share a collage |
| **Creators** | Travel micro-creators publish Verified trips; they earn from bookings made from their plans ([01](01-product-spec.md) §10) | 20 active creators by launch + 3 months |

**k-factor goal:** each new user brings ≥ 0.7 more users within 60 days.

## 3. Timeline
| When | What | Owner |
|---|---|---|
| Phase 0–2 | **Waitlist page** on the domain: email + "how many friends do you usually travel with?" + share link to move up the list. Build-in-public posts on Instagram/LinkedIn/X with prototype clips | Claude builds page; you post |
| Phase 2–7 | Grow waitlist to 1,000+; recruit **20 friend groups** for early testing; sign up 10 creators | You |
| Phase 8 | **Google Play closed test** with ≥ 12 testers for 14 days (from the waitlist); TestFlight beta | You |
| Launch + 0–2 months | **Pilot: 50 friend groups (~200–300 users)**; weekly 20-minute interviews with 5 groups | You; Claude prepares interview script and dashboard |
| Launch + 2–6 months | Channel tests (below); scale what works | You + Claude |

## 4. Channels
| Channel | Plan | Cost |
|---|---|---|
| Campus ambassadors | 10 colleges; ambassador gets Plus free + a Trip Pass per 5 groups that complete a trip | Low (free product) |
| Travel communities | Trekking clubs, college travel societies, Reddit/Facebook/WhatsApp groups: share real Verified trips, not ads | Time |
| Instagram micro-creators (5k–50k followers) | Publish Verified trips; revenue share on bookings; no upfront fee at first | Revenue share |
| Seasonal campaigns | Long weekends, monsoon, Diwali, New Year, summer Himalaya, Sakura (Japan) — ready-made blueprints + Explore templates | Low |
| App store optimisation | Keywords: trip planner, group travel, split expenses, itinerary; screenshots showing voting and splitting | Free |
| SEO | Public itinerary pages and blueprint pages on the web | Free |
| Paid ads (tests only) | See §5 | ≤ ₹25k/month |

## 5. Paid acquisition rules
1. Run only small tests (≤ ₹25k/month) until a paid cohort shows **lifetime value > cost to acquire** over 60 days.
2. Android first (cheaper installs, 85 %+ of Indian installs).
3. Ads deep-link into a specific forkable itinerary ("Goa long weekend for 4 — use this plan"), not the home screen.
4. Stop any channel whose cost per *active* user exceeds the lifetime margin in the [calculator](../mockups/profit-calculator.html).

## 6. Budget (first 6 months after launch)
| Stage | Spend | Continue if… |
|---|---|---|
| Pilot (months 0–2) | ₹0–50k (ambassador perks, small creator gifts) | ≥ 3 invites per trip and D30 retention ≥ 25 % |
| Early growth (months 2–4) | ₹50k–1L | k-factor ≥ 0.5; free share of new users ≥ 70 % |
| Scale tests (months 4–6) | ₹1–2L | Paid cohort LTV > CAC; Plus + Pass conversion ≥ 3 % |

If a "continue if" fails, fix the product before spending more.

## 7. Metrics (PostHog dashboard)
Funnel: install → sign-up → trip created → invites sent → invitee joined → trip completed → published / shared → paid or booked.

| Metric | Pilot target | Feeds profit model input |
|---|---|---|
| Invites per trip | ≥ 3 | Paid share of new users |
| Invitee join rate | ≥ 50 % | Paid share of new users |
| D30 retention | ≥ 25 % | New users each year |
| Trips completed / created | ≥ 40 % | All revenue lines |
| Plus + Trip Pass conversion | ≥ 3 % | Plus conversion, Trip Pass rate |
| Trips booking via Find & book | ≥ 8 % | Booking rate |
| Cost per active paid user | ≤ ₹100 | Cost per install ÷ activation |

Update the calculator with real numbers monthly; the [profit plan](05-profit-plan.md) conditions decide when to hire the lean team.

## 8. Before launch checklist (marketing)
- Domain, waitlist page, privacy page live.
- Instagram handle, X/LinkedIn page reserved.
- 30 Verified-style itineraries ready for Explore (from blueprints and your own trips).
- Store listing text, screenshots, short demo video.
- Interview script and feedback form for pilot groups.
