# 02 · Design System — TravelOG

**Feel:** modern, fun, professional. Clean structure and calm neutrals do the "professional"; colour, emoji covers, rounded shapes and micro-animations do the "fun". Fun lives in accents, never in body text or data.

See it live in [`/mockups/index.html`](../mockups/index.html).

## 1. Mode theming

Each mode re-themes the app through a single token: `--accent`.

| Mode | Surface | Accent | Accent soft | Personality |
|---|---|---|---|---|
| Home | Sand `#FAF7F2` | Coral `#FF6B5B` | `#FFE6E2` | warm, social |
| Plan | Sand `#FAF7F2` | Indigo `#5B5BD6` | `#E7E7FB` | focused, organised |
| Trip | Night `#0F1020` | Teal `#14B8A6` | `#0F3B38` | on-the-road, glanceable |

Mode switch animation: nav bar slides down & back up with new items; accent cross-fades (250 ms).

## 2. Colour tokens

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FAF7F2` | `#0F1020` |
| `--surface` | `#FFFFFF` | `#1A1B2E` |
| `--surface-2` | `#F2EEE7` | `#24253B` |
| `--ink` (text) | `#1B1A3A` | `#F4F3FA` |
| `--ink-2` (secondary) | `#5E5C78` | `#A9A8C2` |
| `--line` | `#E8E3DA` | `#2E2F48` |
| `--mango` (votes, highlights) | `#FFB020` | `#FFC24D` |
| `--success` | `#16A34A` | `#34D399` |
| `--danger` | `#E5484D` | `#FF6B6E` |

Trip mode is always dark (outdoor glanceability + battery on OLED) regardless of system theme; Home/Plan follow system theme.

Category colours (budget, map pins): Stay `#5B5BD6`, Travel `#14B8A6`, Food `#FF6B5B`, Activities `#FFB020`, Shopping `#E056A0`, Misc `#8A8AA3`.

## 3. Typography

| Style | Font | Size / line | Weight |
|---|---|---|---|
| Display | Plus Jakarta Sans | 28 / 34 | 800 |
| Title | Plus Jakarta Sans | 20 / 26 | 700 |
| Headline | Plus Jakarta Sans | 16 / 22 | 700 |
| Body | Figtree | 15 / 22 | 400 |
| Label | Figtree | 13 / 18 | 600 |
| Caption | Figtree | 12 / 16 | 500 |
| Numbers (money, time) | Figtree, tabular figures | — | 600–700 |

## 4. Shape, spacing, elevation
- Spacing scale (8-pt): 4, 8, 12, 16, 24, 32, 48.
- Radius: chips 999, buttons 14, cards 20, sheets 28 (top corners).
- Elevation: cards use a 1 px `--line` border + very soft shadow `0 6px 20px rgba(27,26,58,.06)`; Trip mode uses borders only.
- Screen gutter 16–20 px; min touch target 44×44.

## 5. Components

| Component | Notes |
|---|---|
| **ModeNavBar** | 4 items (Home has centre FAB). Active item = accent pill behind icon + label |
| **TripCard** | Cover gradient/photo, emoji, title, dates, avatar stack, status chip |
| **DayChips** | Horizontal scroll, selected = accent fill |
| **TimelineItem** | Time column · category dot + line · card (title, meta, cost). States: upcoming / now (accent glow) / done (muted) |
| **VariantTabs** | "Plan A · Riya", "Plan B · Arjun" pill tabs + Compare |
| **PollCard** | Question, options with animated vote bars (mango), avatars of voters, deadline chip, Lock in |
| **BudgetRing** | Donut, spent vs budget, centre amount |
| **ExpenseRow** | Category icon, title, paid by, my share (+/−) |
| **BalanceChip** | "Arjun owes you ₹1,240" + Settle (UPI) |
| **BookingTicket** | Ticket-shaped card with notch, PNR, times, offline badge |
| **CategoryTabs** | Find & book: 3 large tabs (Stays · Transport · Activities) with emoji, selected = accent outline + soft fill |
| **SearchBox** | Pre-filled fields per category (Where/dates/guests stepper; From ⇅ To/date/travellers; Area/dates) |
| **OfferCard** | Find & book result: thumbnail, name, details (times + duration for transport), Cheapest/Fastest tag, rating, price (tabular), partner chip, **Add to poll** (ghost, Stays) + **Book ↗** (accent) |
| **PartnerLabel** | Small caption "Partner · we may earn a commission" under every offer list; never hidden or shrunk below 12 px |
| **NudgeCard** | Dashed-border card in the itinerary for a gap ("No stay for Night 2") with one action into Find & book |
| **NowCard** (Trip) | Large: current item, countdown, Navigate / Check in |
| **BottomSheet** | Create trip, add expense, item detail |
| **CollageCanvas** | Template frames, drag-swap, stickers |

## 6. Motion & delight
- Vote cast: bar grows with spring + small confetti on lock-in.
- Trip goes Live: full-screen "Day 1 — let's go ✈️" transition into dark Trip mode.
- Settle up complete: check mark morph.
- Respect "Reduce motion".

## 7. Iconography & imagery
- Icons: Lucide/Phosphor-style 1.75 px rounded line icons.
- Trip covers: user photo, or emoji on a 2-stop gradient derived from the destination (beach → teal/sky, mountains → indigo/lilac, city → coral/mango).
- Illustrations only for empty states — flat, 3 colours max.

## 8. Voice
Short, friendly, never cute in errors. "3 friends haven't voted — nudge them?" / "Couldn't sync. We'll retry when you're back online."
