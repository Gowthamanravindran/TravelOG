# 13 · Development Plan

Built phase by phase. **Claude writes the code** in sessions like this one; **you (the owner)** do account and console steps, add secrets, test on your phone and approve each phase. A phase is done only when its exit criteria pass on a real device.

Owner steps refer to numbered sections in [14 · Owner setup](14-owner-setup.md). Durations assume a few Claude sessions per week and quick reviews; they're estimates.

| Phase | Goal | Est. |
|---|---|---|
| 0 | Project setup | 1 week |
| 1 | Foundations: sign-in, offline database, navigation | 2 weeks |
| 2 | Planning together | 3 weeks |
| 3 | Money and bookings | 2 weeks |
| 4 | Trip mode | 3 weeks |
| 5 | Memories and social | 3 weeks |
| 6 | Money-making | 2 weeks |
| 7 | AI planner | 2–3 weeks |
| 8 | Beta and launch | 3–4 weeks (incl. Play's 14-day test) |

## How each phase runs
1. Claude opens a branch `phase-N-<name>`, works in small commits, keeps tests green.
2. Each working session ends with a preview build (EAS) you can install, plus a short "what to try" list.
3. You test on your phone and reply with issues; Claude fixes them.
4. When exit criteria pass, Claude opens a pull request; you merge it. Migrations go to staging automatically.
5. The plan log in `docs/plans/` gets a new entry for anything that changes the plan.

---

## Phase 0 — Project setup
**Claude builds**
- pnpm monorepo: `apps/mobile` (Expo), `apps/web` (Cloudflare), `packages/core`, `packages/ui`, `supabase/`.
- TypeScript strict, ESLint, Prettier, Jest; `CLAUDE.md` with conventions and commands.
- Supabase local stack with the first migration (`profiles`, `app_config`) and seed data.
- GitHub Actions: lint, typecheck, tests, migration check, bundle-size check.
- EAS config with three profiles (development, preview, production); first development build.
- Design tokens from [02](02-design-system.md) in `packages/ui`.

**You do** — Owner setup §1–§5 (GitHub, domain, Cloudflare, Supabase staging + prod, Expo/EAS) and add the secrets listed there. Install the development build on your phone.

**Exit criteria**
- CI is green on `main`.
- The development build opens on your phone and shows a placeholder home screen.
- `supabase db reset` works locally; staging has the first migration.

## Phase 1 — Foundations
**Claude builds**
- Auth per [10](10-auth.md): Google, Apple, email code; encrypted session storage; onboarding; sign-out; account deletion endpoint.
- Local database per [11](11-local-db-and-sync.md): Drizzle schema, migrations, encryption, sync engine (`sync_pull`, `sync_push`, outbox), sync status UI.
- Server: `trips`, `trip_members` tables with RLS + pgTAP tests; `app_config` + forced-update screen.
- Navigation shells for the three modes (Home, Plan, Trip) with the right bottom bars and themes.
- Sentry and PostHog wired up; first analytics events.
- Draft privacy policy and terms (for review).

**You do** — Owner setup §6 (Apple), §7 (Google Play), §8 (Google Cloud OAuth), §9 (Resend), §13 (Sentry, PostHog).

**Exit criteria**
- Sign in with Google and email on Android; Google, Apple and email on iPhone.
- Create a trip in airplane mode, turn network on, see it on a second phone signed in as a co-member (added via a seed script for now).
- Cold start under 1.5 s on your Android phone.

## Phase 2 — Planning together
**Claude builds**
- Create-trip wizard; trip list with Upcoming / Planning / Past.
- Invites: codes, links, universal/app links, logged-out preview page on the web, join flow, roles.
- Itinerary: days, items, drag reorder, plan variants (A/B/C), compare.
- Polls: all types, voting styles, deadlines, lock-in that updates the itinerary; Realtime nudges.
- Notifications: poll opened/closing, item changed.

**You do** — Owner setup §2 DNS records for the web domain (universal-link files), invite 2–3 friends as testers.

**Exit criteria**
- Three people on different phones plan one trip, add a Plan B, vote and lock in; everyone sees the result within seconds online and after reconnecting offline.

## Phase 3 — Money and bookings
**Claude builds**
- Budgets by category, per-person limit.
- Expenses with equal / shares / exact / percent splits, multi-currency with stored FX rate, balances with fewest-payments settle-up.
- UPI settle-up links, "mark as paid", cash settlement.
- My bookings: add booking, attach PDF/photo (R2 upload), offline download, reminders.

**You do** — Owner setup §3 R2 bucket keys; test settle-up with your own UPI ID.

**Exit criteria**
- Split totals always add up (unit tests across rounding cases); balances match a hand-calculated example.
- Tickets open in airplane mode.

## Phase 4 — Trip mode
**Claude builds**
- Trip states (Upcoming → Live → Completed) by schedule; Trip mode with Today, Plan list ⇄ map, Budget.
- MapLibre map with routes; travel times from routing; offline map packs.
- Opt-in location timeline (time spent), check-ins.
- Places database pipeline for India (Foursquare OS Places + OSM) and Nearby screen; Google Places fallback for details.
- Local reminders and push for trip events.

**You do** — Owner setup §10 (map tile key, routing server), §8 Places API key restricted to functions.

**Exit criteria**
- Run a real half-day outing: Today screen, navigation hand-off, check-ins, expenses — with mobile data off for part of it.
- Battery drop from location tracking not noticeable over 4 hours.

## Phase 5 — Memories and social
**Claude builds**
- Shared photo pool with background uploads; collage editor (Skia) with templates; exports in post/story sizes; Instagram Stories and share sheet.
- Feed, likes, comments, follow; Verified trips (auto-draft at trip end, publish, fork); Explore (templates, public itineraries).
- Report / block, moderation queue (simple admin view on the web).

**You do** — Owner setup §12 Meta developer app (Instagram Stories sharing ID); decide moderation rules ([07](07-open-items.md)).

**Exit criteria**
- Post a collage to an Instagram Story from both platforms.
- Publish a Verified trip and fork it from another account with shifted dates.

## Phase 6 — Money-making
**Claude builds**
- RevenueCat: Plus (yearly) and Trip Pass (per trip); paywall; restore purchases; entitlement checks on server.
- Find & book (Stays · Transport · Activities) with deep-link click-outs, `/go` redirect Worker, click logging, "Did you book it?" flow.
- Free-tier limits from [04](04-pricing-and-costs.md).

**You do** — Owner setup §12 RevenueCat + store products, tax/banking forms in App Store Connect and Play Console; sign up with affiliate networks (needs PAN; a company is better for payouts — see [07](07-open-items.md)).

**Exit criteria**
- Sandbox purchase unlocks Plus on iOS and Android and survives reinstall (restore).
- A click-out is logged with trip and user; affiliate link opens the partner app/site.

## Phase 7 — AI planner
**Claude builds**
- `ai-plan` Edge Function: request parsing (Claude Haiku 5.5), blueprint matching and composer, full-draft fallback, quotas, streaming.
- First 20 blueprints generated with the Batch API, validated by code, reviewed by you.
- Rule-based Trip check + AI phrasing; Re-plan today.
- AI quality set (trip requests with expected properties) run in CI before AI changes.

**You do** — Owner setup §11 Anthropic API key + monthly spend limit; review the top blueprints (Japan, Bali, Thailand, Goa, Kerala…).

**Exit criteria**
- "10 days in Japan in April for 4" returns a blueprint-based plan in about a second.
- Trip check flags the seeded Spiti issues (pass closure, altitude, closing time).
- AI cost per active user tracked in `ai_usage` and within the [06](06-cost-optimization.md) target.

## Phase 8 — Beta and launch
**Claude builds**
- Store listings text, screenshots (from the app), privacy labels / Data safety answers, final privacy policy and terms pages.
- Accessibility and performance pass ([08](08-app-optimizations.md) targets).
- Backup restore drill on staging; incident checklist; monitoring alerts.

**You do**
- **Google Play closed test:** new personal developer accounts must run a closed test with **at least 12 testers opted in for 14 consecutive days** before production access; recruit testers early (friends, travel communities). Organisation accounts are exempt.
- TestFlight external testing on iOS (Apple reviews the first beta build).
- Submit for review on both stores; respond to reviewer questions.

**Exit criteria**
- Crash-free sessions > 99.5 % during the beta.
- App approved on both stores; production release live.

---

## After launch
Phone OTP (after company + DLT), Hindi, deferred deep links, more blueprints from Verified trips, self-hosted tiles past the free tier, web planner.
