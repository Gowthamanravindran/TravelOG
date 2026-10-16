# Plan 8 — Final planning gaps ✅

**Status:** Built in the same commit as this file (docs 15–17, consistency fixes, App states in the prototype).

### Context
After Plan 7 the user asked what planning is left. Four gaps were identified and all four were chosen: older docs that contradict doc 09, no plan for the free growth the profit model depends on, prototype missing onboarding/settings/paywall/empty/offline states, and no spec for internal admin and ops tools. After this, planning is complete and Phase 0 can start. Plans 1–7 stay unchanged; this plan adds to them.

### 8.1 Consistency pass
- Grep docs 01–06 and README for superseded choices and fix them in place (old wording noted as "changed in Plan 7" where it matters):
  - Auth: docs/01 §7 gap #1 and MVP table say phone OTP at launch → Google, Apple, email code at launch; phone after DLT.
  - Maps: `@rnmapbox/maps` / Mapbox SDK mentions in 01, 03 body, 04 cost table, 06 → MapLibre + tile provider; cost lines renamed "map tiles (free tier)".
  - Offline: TanStack Query + MMKV in 03 body → SQLite + Drizzle (03 already has a banner; update the table rows too).
  - Web: Next.js/Vercel mentions → Cloudflare Pages/Workers.
- Check numbers referenced across docs (₹/user costs, break-evens) still match 05/06.

### 8.2 Go-to-market & growth plan (→ `docs/15-go-to-market.md`)
- **Positioning:** "Plan trips with your friends — vote, split, go." Primary segment: friend groups 20–32 in Indian metros and colleges planning domestic weekends and first international trips; secondary: families.
- **Growth loops** (target ≥ 70 % of new users free, per doc 05): trip invite loop (≈3 invitees per trip), Verified trip / public itinerary pages (SEO + "Use this plan"), Instagram memory collages with a link back, referral reward (inviter gets a free Trip Pass when 3 invited friends complete a trip).
- **Pre-launch:** waitlist landing page on the domain in Phase 0–2 (email + "how many friends usually travel with you"); build-in-public posts; recruit the 12+ Play closed-test testers from the waitlist.
- **Pilot (Phases 8 → +2 months):** 50 friend groups (~200–300 users) from campuses and travel communities; weekly interviews; measure invites per trip, D30 retention, Plus/Pass conversion, % trips booking.
- **Launch channels:** campus ambassadors, travel communities (Reddit, Facebook/WhatsApp groups, trekking clubs), Instagram micro-creators publishing Verified trips, seasonal campaigns (long weekends, monsoon, Diwali, Sakura), app-store optimisation, content/SEO from public itineraries.
- **Paid acquisition rules:** small tests only (≤ ₹25k/month) until LTV > CAC on a paid cohort; Android-first; deep-link ads into a forkable itinerary.
- **Budget:** first 6 months by stage (pilot ≈ ₹0–50k, launch ≈ ₹1–2 L), with stop/continue criteria.
- **Metrics dashboard** (PostHog): funnel install → sign-up → trip created → invites sent → invitee joined → trip completed → paid / booked; k-factor; weekly cohort retention.
- Link from doc 05 §8 and doc 13 (marketing tasks added to Phases 0, 2, 5, 8).

### 8.3 Missing screen states (prototype + `docs/01` additions)
- Prototype (`mockups/index.html`) gains a guide-panel entry **"App states"** with clickable screens:
  - Sign-in (Google, Apple, email code entry), onboarding (name, photo, home city, currency), location-permission explainer.
  - Settings (sign-in methods, notifications, privacy, offline storage, currency, delete account with confirmation step).
  - Paywall (Plus yearly vs Trip Pass, restore purchases).
  - Empty states (no trips, no expenses, no polls), offline banner with queued-changes count, sync-rejected toast, generic error with retry, forced-update screen.
- `docs/01` new §11 **Notification catalogue**: each notification's trigger, recipients, text, default on/off, and channel (push / in-app / email).
- Verify with Playwright: every new screen reachable, light/dark, 0 console errors, 0 px overflow at 390 px; republish the prototype artifact (same URL).

### 8.4 Admin & ops tools (→ `docs/16-admin-and-ops.md`)
- **Admin web app** (`apps/admin`, Cloudflare Pages behind Cloudflare Access; staff accounts in a `staff` table with roles: admin, moderator, support; every action written to `admin_audit_log`):
  - Moderation queue: reported posts/itineraries/comments, preview, actions (hide, remove, warn, ban), reporter notified.
  - Blueprint review: generated blueprints with validation results, edit, approve/publish, versioning.
  - Support lookup: find a user by email, see account status, trips count, purchases, sync health; no access to trip contents unless the user grants a support code; all lookups logged.
  - AI and cost dashboard: `ai_usage` by route/model/day, cost per active user, quota overrides, spend alerts.
  - Config: `app_config` editor (min version, feature switches).
  - Affiliate report: clicks, conversions, commission by partner.
- **Data retention rules** (table): location visits 12 months after trip end; soft-deleted rows purged after 90 days; server logs 30 days; AI request content not stored beyond 30 days (usage counts kept); photos until the user deletes them or the account; account deletion completed within 30 days; backups roll off per Supabase plan.
- **Ops:** alert list (crash spike, auth errors, sync errors, AI spend, Supabase usage), on-call owner (you), incident steps.
- Add admin build tasks to doc 13: config editor Phase 1, moderation Phase 5, affiliate report Phase 6, blueprint review + AI dashboard Phase 7.

### 8.4b Owner checklist (added on request)
- `docs/17-owner-checklist.md`: every step the owner does, end to end (decisions → each phase → launch → pilot → months 2–6), with ticks and a cost summary; README "Start here" points to it.

### 8.5 Files
| File | Change |
|---|---|
| `docs/01`, `03`, `04`, `06`, `README.md` | Consistency fixes (8.1); 01 adds §11 notification catalogue |
| `docs/15-go-to-market.md` (new) | 8.2 |
| `docs/16-admin-and-ops.md` (new) | 8.4 |
| `docs/05-profit-plan.md`, `docs/13-development-plan.md`, `docs/07-open-items.md`, `docs/09-tech-stack.md` | Links; marketing + admin tasks per phase; close resolved open items; add `apps/admin` to the stack |
| `mockups/index.html` | App-states screens (8.3) |
| `docs/plans/08-final-planning-gaps.md`, `docs/plans/README.md` | Plan log |

### 8.6 Verification
- `grep` for "Mapbox SDK", "rnmapbox", "TanStack", "Vercel", "phone OTP at launch" in docs returns only intentional "changed in Plan 7" notes.
- Relative-link check across all docs passes.
- Prototype Playwright run (all old flows + new states), light/dark, 0 errors, 0 overflow; republish.
- Commit, push, mark Plan 8 ✅ in the log.
