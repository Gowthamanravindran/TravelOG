# 05 · Profit Plan — TravelOG

**Interactive version:** [`mockups/profit-calculator.html`](../mockups/profit-calculator.html) (open in a browser; every assumption is a slider). The tables below are produced by the same formulas.

All amounts are per year, in INR, at ₹88 = $1. Revenue is net of the 15 % app-store fee (subscriptions and Trip Pass) and 18 % GST. "Users" means **annual active users (AAU)**: people who joined or used at least one trip that year, including invited friends.

## 1. Bottom line

1. **At the Base assumptions the app loses money at every scale.** A user brings about ₹35 of margin over their life but costs about ₹62 to acquire when half of new users come from paid ads. Growing faster only grows the loss.
2. **It becomes profitable when two of these three hold:**
   - **Most growth is free.** At most ~30 % of new users come from paid ads; the rest join through trip invites, shared itineraries and Instagram memories.
   - **Plus conversion reaches ~5 %** of active users (Base is 2.5 %).
   - **~15 % of trips book a stay or transport through Find & book** (Base is 8 %).
3. **With all three (High case)**, contribution turns positive almost immediately, a lean team is covered at **~78k users** and a 6–7 person seed team at **~255k users**.
4. **Free-tier AI must run on a small model.** Giving free users Claude Sonnet 5.5 instead of Claude Haiku 5.5 costs ~₹23 L a year at 100k users; Opus 5.5 costs ~₹46 L — more than all Base revenue.
5. **Infrastructure is not the problem** (~₹13 per user per year). Marketing and conversion decide everything.

## 2. Assumptions

| Input | Low | Base | High | Why |
|---|---|---|---|---|
| Trips per user / year | 2 | 2 | 2 | Indians travel with friends 1–3× a year |
| People per trip | 4 | 4 | 4 | So 0.5 trips are *created* per user |
| International trips | 15 % | 15 % | 15 % | Japan/Thailand/Dubai/Bali style trips; earn ~2.5× commission |
| Plus conversion (₹1,199/yr) | 1 % | 2.5 % | 5 % | Typical consumer freemium 1–5 % |
| Trips buying a Trip Pass (₹199) | 3 % | 6 % | 10 % | Of trips not already covered by a Plus owner |
| Trips booking via Find & book | 3 % | 8 % | 15 % | A trip "books" if any stay or transport goes through our link |
| Commission per booking trip (domestic) | ₹200 | ₹300 | ₹400 | Network listings: hotels ~₹180 or ~6 %, flights ~₹120, buses ~₹35 |
| New users each year | 50 % | 50 % | 50 % | Half of active users churn yearly and are replaced |
| Share of new users from paid ads | 70 % | 50 % | 30 % | The rest come from invites, shares and organic |
| Cost per install | ₹80 | ₹50 | ₹30 | India median ~₹20 across categories; travel and iOS cost more |
| Installs that become active | 30 % | 40 % | 50 % | So cost per *active* paid user = ₹267 / ₹125 / ₹60 |
| AI | free: Haiku 5.5 · paid drafts: Opus 5.5 | same | same | 1.5 drafts + 4 Trip checks per trip, 1 exploratory draft ("plan Japan") per user |
| Infrastructure | $100/mo fixed + ₹12/user/yr | same | same | Supabase, R2, map tiles, cached Places, monitoring |
| Support | ₹3/user/yr | same | same | Help desk tooling + part-time support |

**Team options** (used for "profit after team"):

| Team | People | Cost / yr | Overhead (legal, accounting, tools, store accounts) |
|---|---|---|---|
| Bootstrapped | Founders unpaid | ₹0 | ₹0.5 L |
| Lean | 2 founders on modest pay + 1 engineer | ₹36 L | ₹1.5 L |
| Seed | 6–7 people (eng ×3, design, growth, ops) | ₹1.2 Cr | ₹5 L |

**AI cost basis** (Claude API list prices, $/million tokens in/out: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50). A full draft is estimated at ~40k input + 8k output tokens → Opus $0.32, Sonnet $0.16, Haiku $0.008; a Trip check at ~15k + 2k → Haiku $0.0025. Token counts are estimates to be measured on a prototype; prompt caching will lower them.

## 3. Unit economics (at 100k users)

| Per active user / year | Low | Base | High |
|---|---|---|---|
| Plus revenue | ₹8.6 | ₹21.6 | ₹43.2 |
| Trip Pass revenue | ₹2.1 | ₹4.2 | ₹6.8 |
| Affiliate revenue | ₹3.1 | ₹12.5 | ₹31.1 |
| **Net revenue** | ₹13.9 | ₹38.2 | ₹81.1 |
| AI | −₹3.0 | −₹4.4 | −₹6.5 |
| Infrastructure | −₹13.1 | −₹13.1 | −₹13.1 |
| Support | −₹3.0 | −₹3.0 | −₹3.0 |
| Marketing | −₹93.3 | −₹31.2 | −₹9.0 |
| **Contribution** | −₹98.7 | −₹13.9 | ₹48.9 |
| Lifetime margin (LTV) vs blended CAC | −₹11 vs ₹187 | ₹35 vs ₹62 | ₹116 vs ₹18 |

LTV = yearly margin per user × expected years as a user (2 years when half churn each year). **Paid acquisition only pays back when LTV > blended CAC.** Base fails that test; High passes by 6×.

## 4. Scenario grid

Running costs = AI + infrastructure + support + payments. Contribution = revenue − running costs − marketing. Profit = contribution − team − overhead.

**Low**

| Annual active users | Net revenue | Running costs | Marketing | Contribution | Profit · Bootstrapped | Profit · Lean | Profit · Seed |
|---|---|---|---|---|---|---|---|
| 1,000 | ₹14k | ₹1.2 L | ₹93k | **−₹2.0 L** | −₹2.5 L | −₹39.5 L | −₹1.27 Cr |
| 10,000 | ₹1.4 L | ₹2.9 L | ₹9.3 L | **−₹10.8 L** | −₹11.3 L | −₹48.3 L | −₹1.36 Cr |
| 50,000 | ₹6.9 L | ₹10.1 L | ₹46.7 L | **−₹49.9 L** | −₹50.4 L | −₹87.4 L | −₹1.75 Cr |
| 100,000 | ₹13.9 L | ₹19.2 L | ₹93.3 L | **−₹98.7 L** | −₹99.2 L | −₹1.36 Cr | −₹2.24 Cr |
| 500,000 | ₹69.4 L | ₹91.8 L | ₹4.67 Cr | **−₹4.89 Cr** | −₹4.90 Cr | −₹5.27 Cr | −₹6.14 Cr |
| 1,000,000 | ₹1.39 Cr | ₹1.82 Cr | ₹9.33 Cr | **−₹9.77 Cr** | −₹9.78 Cr | −₹10.15 Cr | −₹11.02 Cr |

**Base**

| Annual active users | Net revenue | Running costs | Marketing | Contribution | Profit · Bootstrapped | Profit · Lean | Profit · Seed |
|---|---|---|---|---|---|---|---|
| 1,000 | ₹38k | ₹1.3 L | ₹31k | **−₹1.2 L** | −₹1.7 L | −₹38.7 L | −₹1.26 Cr |
| 10,000 | ₹3.8 L | ₹3.0 L | ₹3.1 L | **−₹2.3 L** | −₹2.8 L | −₹39.8 L | −₹1.27 Cr |
| 50,000 | ₹19.1 L | ₹11.0 L | ₹15.6 L | **−₹7.5 L** | −₹8.0 L | −₹45.0 L | −₹1.32 Cr |
| 100,000 | ₹38.2 L | ₹20.9 L | ₹31.2 L | **−₹13.9 L** | −₹14.4 L | −₹51.4 L | −₹1.39 Cr |
| 500,000 | ₹1.91 Cr | ₹1.00 Cr | ₹1.56 Cr | **−₹65.1 L** | −₹65.6 L | −₹1.03 Cr | −₹1.90 Cr |
| 1,000,000 | ₹3.82 Cr | ₹1.99 Cr | ₹3.12 Cr | **−₹1.29 Cr** | −₹1.30 Cr | −₹1.67 Cr | −₹2.54 Cr |

**High**

| Annual active users | Net revenue | Running costs | Marketing | Contribution | Profit · Bootstrapped | Profit · Lean | Profit · Seed |
|---|---|---|---|---|---|---|---|
| 1,000 | ₹81k | ₹1.3 L | ₹9k | **−₹56k** | −₹1.1 L | −₹38.1 L | −₹1.26 Cr |
| 10,000 | ₹8.1 L | ₹3.3 L | ₹90k | **₹3.9 L** | ₹3.4 L | −₹33.6 L | −₹1.21 Cr |
| 50,000 | ₹40.6 L | ₹12.2 L | ₹4.5 L | **₹23.9 L** | ₹23.4 L | −₹13.6 L | −₹1.01 Cr |
| 100,000 | ₹81.1 L | ₹23.2 L | ₹9.0 L | **₹48.9 L** | ₹48.4 L | ₹11.4 L | −₹76.1 L |
| 500,000 | ₹4.06 Cr | ₹1.12 Cr | ₹45.0 L | **₹2.49 Cr** | ₹2.48 Cr | ₹2.11 Cr | ₹1.24 Cr |
| 1,000,000 | ₹8.11 Cr | ₹2.23 Cr | ₹90.0 L | **₹4.98 Cr** | ₹4.98 Cr | ₹4.61 Cr | ₹3.73 Cr |

## 5. Break-even: users needed to cover each team

| Scenario | Bootstrapped | Lean team (₹36 L) | Seed team (₹1.2 Cr) |
|---|---|---|---|
| Low | never (≤5M) | never (≤5M) | never (≤5M) |
| Base | never (≤5M) | never (≤5M) | never (≤5M) |
| Base, 30 % paid | never (≤5M) | never (≤5M) | never (≤5M) |
| Base, 10 % paid (mostly viral) | 13,000 | 320,000 | 1,035,000 |
| Base, 5 % Plus | 21,000 | 510,000 | 1,665,000 |
| Base, 5 % Plus + 30 % paid | 8,000 | 195,000 | 630,000 |
| High | 4,000 | 78,000 | 255,000 |

## 6. What moves profit most

| Change (from Base at 100k users) | Effect on yearly contribution |
|---|---|
| Plus conversion 2.5 % → 5 % | +₹20.4 L |
| Paid share of new users 50 % → 30 % | +₹12.5 L |
| Cost per install ₹50 → ₹30 | +₹12.5 L |
| Find & book 8 % → 15 % of trips | +₹10.9 L |
| Install → active 40 % → 50 % | +₹6.2 L |
| Commission ₹300 → ₹400 | +₹4.2 L |
| Trip Pass 6 % → 10 % of trips | +₹1.5 L |
| Free-tier AI on Sonnet 5.5 instead of Haiku 5.5 | −₹22.6 L |
| Free-tier AI on Opus 5.5 instead of Haiku 5.5 | −₹46.3 L |

**Contribution at 100k users — Plus conversion vs paid share of new users**

| Plus conversion ↓ · Paid share of new users → | 70 % | 50 % | 30 % | 10 % |
|---|---|---|---|---|
| 1.0 % | −₹38.6 L | −₹26.1 L | −₹13.6 L | −₹1.1 L |
| 2.5 % | −₹26.4 L | −₹13.9 L | −₹1.4 L | ₹11.1 L |
| 5.0 % | −₹6.0 L | ₹6.5 L | ₹19.0 L | ₹31.5 L |
| 8.0 % | ₹18.5 L | ₹31.0 L | ₹43.5 L | ₹56.0 L |

**Contribution at 100k users — Find & book usage vs paid share of new users**

| Trips booking via Find & book ↓ · Paid share → | 70 % | 50 % | 30 % | 10 % |
|---|---|---|---|---|
| 3 % | −₹34.2 L | −₹21.7 L | −₹9.2 L | ₹3.3 L |
| 8 % | −₹26.4 L | −₹13.9 L | −₹1.4 L | ₹11.1 L |
| 15 % | −₹15.5 L | −₹3.0 L | ₹9.5 L | ₹22.0 L |
| 25 % | ₹10k | ₹12.6 L | ₹25.1 L | ₹37.6 L |

## 7. Conditions for a profitable app

| # | Condition | Target | How the product earns it |
|---|---|---|---|
| 1 | Growth is mostly free | ≤ 30 % of new users from paid ads | Every trip invites ~3 friends; WhatsApp invite links; "Verified trip" itineraries and Instagram memories link back to the app; referral credit (free Trip Pass) |
| 2 | Paid installs are cheap and activate | CPI ≤ ₹40, ≥ 45 % activation | Android-first campaigns, target group-trip moments (long weekends, monsoon, Diwali), deep-link ads straight into a forked itinerary |
| 3 | Plus conversion | ≥ 5 % | AI drafts, offline maps, HD memories and unlimited trips behind Plus; upsell after the 2nd Trip Pass |
| 4 | Booking through the app | ≥ 15 % of trips | Pre-filled Find & book, stay polls ending in "Book now", AI plans that link every stay/transport to a bookable option |
| 5 | AI cost discipline | Free AI ≤ ₹5/user/yr | Haiku 5.5 for free Trip checks and drafts, larger model only for paid; quotas; prompt caching |
| 6 | Team size follows revenue | Stay Lean until ~80–100k engaged users | Hire the seed team only when the trailing contribution covers it |

## 8. Recommended path

| Stage | Users | Team | Marketing | Goal to move on |
|---|---|---|---|---|
| Pilot | 1k–10k | Bootstrapped | ~₹0 (friends, college/travel communities) | ≥ 3 invites per trip, ≥ 3 % Plus or Pass, measure real AI token use |
| Product–market fit | 10k–80k | Lean | Small paid tests, CPI ≤ ₹40 | Paid share ≤ 30 %, LTV > CAC on paid cohorts |
| Scale | 80k–300k+ | Seed | Paid grows only while LTV > CAC | Contribution covers team; affiliate ≥ 30 % of revenue |

How to reach these conditions: [15 · Go-to-market](15-go-to-market.md).

Watch these monthly: invites per trip, % of new users from invites, Plus and Pass conversion, % of trips that book, AI cost per active user, CPI and activation by channel.

## 9. With cost optimisation

Plan 6 ([06 · Cost optimisation](06-cost-optimization.md)) adds our own places database, trip blueprints and rule-based Trip check. The tables above are unchanged; this shows the effect.

| Per active user / year (100k users) | Low before → after | Base before → after | High before → after |
|---|---|---|---|
| AI | ₹3.0 → **₹1.3** | ₹4.4 → **₹2.1** | ₹6.5 → **₹3.3** |
| Infrastructure | ₹13.1 → **₹9.1** | ₹13.1 → **₹9.1** | ₹13.1 → **₹9.1** |
| Running costs (AI + infra + support + payments) | ₹19.2 → **₹13.6** | ₹20.9 → **₹14.6** | ₹23.2 → **₹16.1** |
| Contribution | −₹98.7 → **−₹93.0** | −₹13.9 → **−₹7.6** | ₹48.9 → **₹56.0** |

| Scenario | Lean team: before → after | Seed team: before → after |
|---|---|---|
| Base | never (≤5M) → **never (≤5M)** | never (≤5M) → **never (≤5M)** |
| Base, 10 % paid | 320,000 → **205,000** | 1,035,000 → **655,000** |
| Base, 5 % Plus + 30 % paid | 195,000 → **145,000** | 630,000 → **460,000** |
| High | 78,000 → **69,000** | 255,000 → **220,000** |

Optimisation saves ~₹6–7 per user per year and pulls break-even forward by 10–35 %, but it does not rescue the Base case: free growth and conversion still decide profitability.

## 10. Caveats

- Conversion, booking and viral rates are assumptions, not measurements. The pilot's job is to measure them.
- Commission figures come from affiliate-network listings (see [04 · Pricing](04-pricing-and-costs.md)); actual rates depend on the deal and cancellations.
- CPI benchmark: India median ~₹20 per install across categories in 2026 ([Linkrunner](https://linkrunner.io/state-of-mobile-app-growth-india-2026)); iOS typically 30–80 % higher ([Vmobify](https://vmobify.com/blog/app-install-cost-india)). Travel-specific numbers were not available, so Base uses ₹50.
- No ad revenue, sponsored templates or paid creator itineraries are counted; they are upside.
- Taxes on profit, funding and depreciation are out of scope.
