# 01 · Product Spec — TravelOG

> Plan trips with your crew, vote on where to go, run the trip live, and turn it into memories.

Platforms: iOS + Android (one codebase). Primary market: India (INR, UPI, WhatsApp-first sharing), usable globally.

---

## 1. Core idea: three modes

The app has three **modes**. Each mode swaps the **bottom nav and the accent colour**, so the user always knows where they are.

| Mode | When | Accent | Bottom nav |
|---|---|---|---|
| **Home** | Default; browsing, social | Coral `#FF6B5B` | Trips · Feed · ＋ · Explore · Profile |
| **Plan / Edit** | Creating or editing a trip before it starts | Indigo `#5B5BD6` | Itinerary · Budget · Bookings · Polls |
| **Trip** | While the trip is live | Teal `#14B8A6` on dark | Today · Plan · Nearby · Budget |

```
Home ──tap trip (not started)──▶ Plan mode ──"Start trip" / start date──▶ Trip mode
  ▲                                  │                                       │
  └──────── back / ✕ ─────────────────┴──────────── "Exit trip" ─────────────┘
Trip ends ──▶ "Create memories" prompt ──▶ Memory editor ──▶ Instagram / Feed
```

Tapping a trip opens the mode that fits its state: **Planning/Upcoming → Plan mode**, **Live → Trip mode**, **Completed → Trip recap + Memories**.

---

## 2. Trip lifecycle

| State | Trigger | Default mode | Notes |
|---|---|---|---|
| Draft | Trip created, only owner | Plan | Not visible to anyone else |
| Planning | ≥1 invitee joined or poll opened | Plan | Polls, plan variants active |
| Upcoming | Dates locked | Plan | Reminders: T‑7, T‑1 days |
| **Live** | Start date (local tz) or "Start trip" | **Trip** | Location timeline (opt‑in), offline cache prefetched |
| Completed | End date + 1 day or "End trip" | Recap | Settle-up reminder, memories prompt |
| Archived | Manual | — | Read-only |

---

## 3. Home mode

### 3.1 Trips (tab 1)
- Segmented control: **Upcoming · Planning · Past**.
- Trip card: cover (photo or emoji + gradient), name, destination, dates, member avatars, status chip (`Live today`, `3 polls open`, `Dates TBD`, `₹4.2k to settle`).
- Pinned "Live now" card at the top when a trip is live → one tap into Trip mode.
- Empty state: "Plan your first trip" + Explore templates.

### 3.2 ＋ New trip (centre FAB)
Bottom sheet wizard, 3 steps, all skippable except name:
1. **Name & vibe** — name, cover emoji/photo.
2. **Where & when** — destination (or "Undecided → create destination poll"), dates (or "Flexible → create date poll").
3. **Who** — invite link / WhatsApp / contacts; roles default to Editor.

Ends in Plan mode on the Itinerary tab.

### 3.3 Feed (tab 2)
- Posts from people you follow + your trip-mates: **Shared itineraries** and **Memories** (collages).
- Itinerary post → preview days → **"Use this plan"** forks it into a new Draft trip.
- Actions: like, comment, save, share, report.
- Filters: All · Itineraries · Memories.

### 3.4 Explore (tab 3 — formerly "TBD")
- Search destinations; trending in India; seasonal ("Monsoon getaways").
- **Templates** ("3 days in Goa", "Spiti road trip") curated + top public itineraries.
- Each template is forkable. Later: sponsored templates (see pricing doc).

### 3.5 Profile (tab 4)
- Stats: trips, days travelled, cities, km.
- Memories grid, saved itineraries, friends/crews.
- Settings: account, notifications, privacy (default trip visibility), location timeline, currency, subscription, **delete account**.

---

## 4. Plan / Edit mode

Top bar: back to Home · trip name & dates · member avatars · **Invite** · ⋯ (settings, duplicate, delete). A "Start trip" button appears when the trip is Upcoming.

### 4.1 Itinerary (tab 1)
- Horizontal day chips: `Day 1 · Fri 14` …, plus "Unscheduled ideas" bucket.
- Day timeline of **items**: Place · Activity · Food · Stay · Transport · Note. Each has time, duration, cost estimate, link, notes, who added it.
- Drag to reorder; travel time between items auto-calculated (Mapbox Directions).
- **Plan variants** (the "share different plans" requirement):
  - Any day (or the whole trip) can have **Plan A / Plan B / …**, each authored by a member.
  - Variants are shown as tabs on the day; "Compare" puts them side-by-side (time, cost, travel time).
  - **"Let the group vote"** creates a Plan-variant poll in one tap. Winner becomes the day's main plan; losers are kept as archived alternatives.
- Comment threads on items; @mentions.
- Map preview strip for the selected day.

### 4.2 Budget (tab 2)
- Trip budget: total + per person, split into categories (Stay, Travel, Food, Activities, Shopping, Misc).
- **Estimated vs Budget** bar: sum of itinerary item estimates vs planned budget, per category.
- **Per-person spending limit** (personal, private) — used for warnings in Trip mode.
- Currency: trip base currency + per-item currency (auto-converted, daily rates).

### 4.3 Bookings & Tickets (tab 3)
- Types: Flight, Train, Bus, Hotel/Stay, Event, Rental, Other.
- Fields: provider, PNR/confirmation #, times, who it covers, cost (auto-adds to budget/expenses), attachments (PDF, image).
- Attachments cached offline automatically when the trip becomes Upcoming.
- Reminders (check-in opens, departure in 3 h).
- v2: forward confirmation emails to `trip-xyz@in.travelog.app` → parsed into bookings.

### 4.4 Polls (tab 4)
| Poll type | Options are… | Result action on "Lock in" |
|---|---|---|
| Destination | places | sets trip destination |
| Dates | availability grid (each member marks days) | sets trip dates |
| Stay | links / bookings | adds Stay item |
| Activity / Food | places | adds item to chosen day |
| Plan variant | Plan A / B of a day | promotes winning variant |
| Free text | anything | none |

- Voting styles: **single**, **multi**, **ranked** (Plus/Pass feature).
- Options: deadline, anonymous votes, "members can add options", minimum quorum.
- Live results (Realtime); nudge non-voters (push).
- Only Owner/Editors can Lock in; tie → owner decides.

### 4.5 Members & roles
| Role | Can |
|---|---|
| Owner | everything, delete trip, transfer ownership |
| Editor | edit itinerary, budget, bookings, create polls, add expenses |
| Viewer | view, vote, comment, add expenses |

Invite via link/QR (expires, revocable). Link preview works on web without an account; joining requires sign-up.

---

## 5. Trip mode (live)

Dark, high-contrast UI built for one-handed use outdoors. Header: trip name · "Day 3 of 5" · weather · offline indicator · exit.

### 5.1 Today (tab 1)
- **Now / Next card**: current or next item, countdown, travel time from here, **Navigate** (deep link to Google/Apple Maps), **Check in**.
- Day timeline (done items greyed, current highlighted, "running 25 min late" if behind).
- Quick actions: **＋ Expense**, 📷 Photo (auto-tagged to item), 🗳 Quick poll ("Dinner: A or B?"), Swap item.
- Today's spend vs today's limit.

### 5.2 Plan (tab 2) — Itinerary ⇄ Map
- Toggle **List | Map**.
- Map: day-coloured route polylines, numbered stops, your location.
- For each stop: **planned vs actual time spent** (from location timeline or check-ins), travel time between stops.
- Day selector; tap stop → detail sheet.

### 5.3 Nearby (tab 3)
- Categories: Food · Sights · Cafés · Shopping · Events · Essentials (ATM, pharmacy, fuel).
- Distance, open now, rating, price level; **Add to today** (inserts at best slot).
- v1 data: Google Places (cached). v2: live events (PredictHQ / Ticketmaster where available).

### 5.4 Budget (tab 4) — Splitting
- Ring: spent vs trip budget; per-category bars; my spend vs my limit (warning at 80 %).
- **Add expense**: amount, currency, category, paid by, split **equally / by shares / exact / percentage**, receipt photo.
- **Balances**: who owes whom, simplified (min-transfers algorithm).
- **Settle up**: UPI deep link (`upi://pay?pa=…&am=…`) pre-filled; mark as paid; non-UPI → "mark settled".
- Export CSV/PDF (Plus/Pass).

---

## 6. Memories (post-trip)

1. Prompt on trip completion: "Your Goa trip is done — make a memory?"
2. **Photo pool**: photos from all members (opt-in upload per trip), auto-grouped by day/place.
3. **Auto-pick**: best ~9–20 photos (on-device: faces, sharpness, diversity by place/day).
4. **Collage editor**: templates (grid, polaroid, film strip, map + photos, "trip stats" card), drag to swap, text, stickers (route line, dates, km, ₹ spent).
5. **Export**: 1080×1350 (IG post, 4:5), 1080×1920 (Story/Reel cover), 1080×1080; carousel export for multi-slide posts.
6. **Share**: Instagram Story (IG Stories share intent), Instagram feed (share sheet), WhatsApp, save to gallery, **post to TravelOG Feed**.

Free tier: watermark + standard resolution; Plus/Pass: HD, no watermark, premium templates.

---

## 7. Gaps filled (decisions)

| # | Gap | Decision |
|---|---|---|
| 1 | Sign-in | Phone OTP (India default) + Google + **Sign in with Apple** (mandatory on iOS when social login exists) |
| 2 | Account deletion | In-app deletion (App Store requirement); trips transfer to next Editor |
| 3 | Invites | Link/QR, WhatsApp share first; web preview without account |
| 4 | "Time spent everywhere" | **Opt-in** background location only during Live trips; on-device dwell detection (≥10 min within 100 m); only aggregated visits uploaded; manual check-in fallback; per-trip delete |
| 5 | Offline | Trip mode works offline: itinerary, tickets, map region (Mapbox offline pack) prefetched at T‑1 day; expenses/check-ins queued |
| 6 | Events data | No open BookMyShow API → v1 uses Places POIs; live events in v2 |
| 7 | Feed safety | Report/block, private-by-default trips, explicit publish; moderation queue (store UGC requirement) |
| 8 | Conflicting edits | Item-level last-write-wins + edit history; realtime presence avatars on items |
| 9 | Notifications | Poll opened / closing in 2 h / locked; item changed; expense added you; settle-up reminder; trip tomorrow; booking reminders. Per-trip mute |
| 10 | Multi-currency | Base currency per trip; FX snapshot stored on each expense |
| 11 | Money handling | We **never hold money** — UPI deep links only (avoids RBI/PA licensing) |
| 12 | Photo privacy | Trip photos visible to members only; only collages explicitly published go public |
| 13 | Accessibility | Dynamic type, 4.5:1 contrast, screen-reader labels, colour never the only signal |

---

## 8. MVP scope vs later

| MVP (v1) | v1.5 | v2 |
|---|---|---|
| Auth, trips, invites, roles | Ranked polls, availability grid | Email-forward booking parsing |
| Itinerary + plan variants | Offline map packs | Live events feed |
| Polls (single/multi), lock-in | Location timeline (time spent) | AI auto-plan / suggestions |
| Budget + expenses + UPI settle | Feed + Explore templates | Affiliate booking |
| Bookings with attachments | Memories templates pack 2 | Web planner |
| Trip mode Today/Plan/Map/Budget | Nearby (Places) | Public creator profiles |
| Memories collage + IG share | Subscriptions (RevenueCat) | |
