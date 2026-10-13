# Plan 7 — Build readiness ✅

**Status:** Built in the same commit as this file (docs 07–14).

### Context
Design work (Plans 1–6) is done. Before writing app code the user wants: what's still open, app-level optimisations, a re-check that the tech stack is complete and correct, detailed designs for auth, the on-device database + sync and migrations, a phase-by-phase development plan, and every setup step the owner must do (with how-to). Decisions taken: **Claude builds, owner reviews and does account/console steps**; owner is an **individual for now** (no company yet); local DB = **expo-sqlite + Drizzle + our own sync**. This plan writes docs only (no app code yet); Phase 0 of the development plan is the first build step after approval.

### 7.1 What's still open (→ `docs/07-open-items.md`)
| Area | Open item | Resolved in |
|---|---|---|
| Legal | Privacy policy + terms (India DPDP Act consent, data export/delete), store privacy labels / Play Data safety | Phase 8, drafted Phase 1 |
| Business | Company registration (Pvt Ltd/LLP) for DLT SMS sender, GST, affiliate payouts, org store accounts | Owner, before Phase 6 |
| Brand | Name/trademark check for "TravelOG", domain, app icon | Owner, Phase 0 |
| Product | Moderation process for Feed/Verified trips; support channel; analytics event list; Hindi later | Phases 5–8 |
| Quality | Test strategy (unit, RLS, E2E), AI evals for blueprints/Trip check, accessibility pass | Each phase |
| Ops | Backups/restore drill, monitoring alerts, incident checklist, min-app-version kill switch | Phases 1, 8 |

### 7.2 App-level optimisations (→ `docs/08-app-optimizations.md`)
- **Startup:** Hermes, lazy routes, splash only until local DB migrations finish, no network on the critical path (UI reads SQLite).
- **Rendering:** FlashList for long lists, memoised rows, Reanimated on UI thread, avoid re-render storms from global stores.
- **Images:** expo-image with disk cache + blurhash placeholders, thumbnails in lists, originals only on open.
- **Data/network:** single source of truth = local DB; delta sync (only changed rows since cursor), batched writes, debounced edits, Realtime only for the open trip (triggers a pull, no polling), pagination for Feed.
- **Battery:** location only while a trip is live and opted in; significant-change/geofence mode instead of continuous GPS; stop tasks when trip ends.
- **Storage:** cap image cache, purge offline map packs and attachments of trips ended > 30 days, compress SQLite periodically.
- **Bundle/updates:** avoid heavy libs (moment/lodash full), per-route code, EAS Update with bytecode diffing for small OTA updates; Android App Bundle splits.
- **Server side:** indexes for RLS (`trip_members(user_id, trip_id)`), `security definer stable` membership helper, RPCs that return a whole screen in one call, edge-cached public pages.
- **Perceived speed:** optimistic updates, skeletons only on first load, AI responses streamed.

### 7.3 Tech stack revalidation (→ `docs/09-tech-stack.md`, the single complete list; `docs/03` links to it)
Findings to fix vs earlier docs:
| # | Earlier | Change | Why |
|---|---|---|---|
| 1 | TanStack Query + MMKV for offline | **expo-sqlite + Drizzle ORM** as the app's data store; our own sync; MMKV only for small prefs | Trip mode must work fully offline with relational data |
| 2 | `@rnmapbox/maps` + Mapbox Directions | **MapLibre React Native** with a hosted vector-tile provider's free tier, switch to self-hosted PMTiles later without code changes; routing via self-hosted OSRM/Valhalla before beta (OpenRouteService free tier during dev) | Plan 6 moves to self-hosted tiles/routing; Mapbox terms tie its APIs to its SDK, so starting on MapLibre avoids a rewrite |
| 3 | Next.js on Vercel for web | **Cloudflare Pages/Workers** for invite pages, public itineraries, `/go` redirect, universal-link files | Commercial use on a free tier; same vendor as R2 |
| 4 | Phone OTP at launch | **Google + Apple + email OTP at launch; phone OTP after DLT registration** | Indian SMS needs a DLT-registered sender, which needs a business entity |
| 5 | Not listed | Add: react-hook-form + zod, date-fns(-tz) (trips cross time zones), money as integer minor units, FX via a free ECB-based API, i18next + expo-localization, PostHog feature flags + remote min-version, Maestro E2E, pgTAP RLS tests, ESLint/Prettier, pnpm workspaces | Gaps |
| 6 | Open-Meteo free tier | Use its **commercial plan** (free tier is non-commercial) or precomputed normals only | Licence |
Full list grouped: app, data/offline, maps/location, media, backend, AI, payments, web, observability, CI/CD, testing, tooling — each with purpose and "version pinned at Phase 0" (Expo SDK: latest stable at start, currently SDK 55 / RN 0.83, New Architecture only).

### 7.4 Auth design (→ `docs/10-auth.md`)
- **Provider:** Supabase Auth. Launch methods: **Sign in with Google** (native `@react-native-google-signin/google-signin` → `signInWithIdToken`), **Sign in with Apple** (`expo-apple-authentication` with nonce → `signInWithIdToken`; required on iOS when Google is offered), **email 6-digit OTP** (no deep-link fragility; SMTP via Resend). **Phone OTP** added after DLT: Supabase Textlocal or Twilio Verify provider.
- **Session:** supabase-js with a secure storage adapter (AES key in Keychain/Keystore via expo-secure-store, encrypted session in MMKV — avoids SecureStore size limits); auto-refresh paused/resumed with AppState; works offline on cached session; local DB file per user; sign-out wipes it after flushing the outbox.
- **Profile bootstrap:** Postgres trigger on `auth.users` insert → `profiles` row; onboarding asks name, avatar, home city, currency.
- **Account linking:** same verified email links automatically; "Add phone / Add Google" in settings uses Supabase identity linking.
- **Invites & roles:** invite link `https://<domain>/i/<code>` (universal/app links) → join screen; roles in `trip_members` enforced by RLS; invite codes expire and can be revoked; logged-out preview via an Edge Function that returns a redacted trip.
- **Abuse & security:** CAPTCHA (Cloudflare Turnstile) on OTP send, Supabase auth rate limits, short JWT expiry with refresh rotation, service-role key only in Edge Functions, RLS on every table with pgTAP tests.
- **Account deletion:** in-app; Edge Function transfers owned trips to the next editor, anonymises posts, deletes auth user and storage.
- Sequence diagrams (sign-in, invite join, token refresh offline→online) in the doc.

### 7.5 On-device database + sync (→ `docs/11-local-db-and-sync.md`)
- **Stack:** expo-sqlite (SQLCipher encryption enabled — tickets/PNRs are personal data) + Drizzle ORM; UI reads via Drizzle live queries.
- **Tables:** mirror of the user's slice of the server: trips, trip_members, days, plan_variants, itinerary_items, polls, poll_options, votes, budgets, expenses, expense_splits, settlements, bookings, attachments (with local file path), cached places, plus `outbox` and `sync_state`.
- **Row rules:** client-generated UUID v7 ids, `updated_at`, `deleted_at` (soft delete), server-assigned `server_seq` (bigint from a sequence via trigger).
- **Pull:** RPC `sync_pull(cursor)` returns changed rows per table for trips the user belongs to (`server_seq > cursor`), paged; triggered on launch, app foreground, Realtime nudge, and after push.
- **Push:** outbox entries (`op`, `table`, `row`, `client_ts`) sent in batches to RPC `sync_push`, applied under RLS; idempotent by id; per-row last-write-wins, except additive tables (votes, expenses, splits) which can't conflict by design; rejected writes surface to the user.
- **Files:** attachments and offline map packs downloaded when a trip becomes Upcoming; photo uploads queued with resumable retry.
- **Failure recovery:** if a local migration fails → export outbox, wipe local DB, full re-pull.

### 7.6 Migrations (→ `docs/12-migrations.md`, with exact commands)
- **Server (Supabase CLI):** `supabase init` / `start` (local Docker stack) / `migration new <name>` / `db reset` (reapply + seed) / `db diff` / `gen types typescript` / `test db` (pgTAP) / `db push` to staging and prod from GitHub Actions only. Three environments: local, staging project, production project (both in Mumbai region).
- **Device (Drizzle):** edit `schema.ts` → `drizzle-kit generate` → migrations bundled into the app → `useMigrations` at startup. Never edit an applied migration.
- **Compatibility rules:** forward-only; expand → migrate → contract for breaking changes (add new column/table, backfill, ship app, remove old only after `min_supported_version` passes it); `app_config.min_supported_version` forces updates; sync protocol versioned (`sync_pull` accepts `schema_version`).
- **Runbooks:** creating a migration, applying to staging/prod, rolling back (new forward migration), restoring a backup.

### 7.7 Development plan (→ `docs/13-development-plan.md`)
Each phase: goal, Claude's tasks, **owner's tasks**, exit criteria. Estimates assume Claude builds in sessions and owner reviews on a phone.
| Phase | Goal | Owner does | Exit criteria |
|---|---|---|---|
| 0 Setup | Monorepo (pnpm: `apps/mobile`, `apps/web`, `packages/core`, `packages/ui`, `supabase/`), lint/test/CI, CLAUDE.md, EAS dev build, staging Supabase | Create accounts (7.8), add secrets, install Expo Go/dev build | Dev build opens on your phone; CI green |
| 1 Foundations | Auth (Google, Apple, email OTP), profiles, local DB + sync skeleton, 3-mode navigation shells, design tokens | Configure OAuth clients, Apple capability, Resend domain | Sign in on both platforms; data survives airplane mode |
| 2 Planning core | Create trip, invites + deep links, roles, itinerary + variants, polls with realtime | Domain DNS for universal links | 3 friends plan a trip and vote together |
| 3 Money & bookings | Budgets, expenses, splits, UPI settle-up links, My bookings + offline attachments | UPI ID for testing | Splits correct; tickets open offline |
| 4 Trip mode | Today, map + routes (MapLibre), check-ins, Nearby from places DB (India), notifications, offline map packs | Map tile provider key, routing VPS | A real day trip run end-to-end offline |
| 5 Memories & social | Photo pool (R2), Skia collage editor, Instagram share, Feed, Verified trips, report/block | Meta app id for IG Stories, R2 bucket | Post a collage to IG Story; publish a Verified trip |
| 6 Money-making | RevenueCat (Plus, Trip Pass), Find & book click-outs + tracking | Store products, RevenueCat, affiliate network signups (needs PAN; company preferred) | Sandbox purchase unlocks features; click tracked |
| 7 AI | `ai-plan` function, 20 blueprints via Batch API, rule-based Trip check, quotas, evals | Anthropic API key + spend limit | Japan request answered from blueprint in ~1 s; evals pass |
| 8 Beta & launch | Closed testing, store listings, privacy/legal, monitoring, launch checklist | Testers (Play requires a closed test with ≥12 testers for 14 days for new personal accounts — confirm current rule), TestFlight group, store forms | Approved on both stores |

### 7.8 Owner setup guide (→ `docs/14-owner-setup.md`, step-by-step with links and what to paste where)
In order, with cost and time:
1. GitHub (repo exists) — enable branch protection on `main`.
2. Domain (e.g. travelog.app) — buy, point DNS to Cloudflare.
3. Cloudflare — account, R2 bucket (`travelog-media-staging`/`-prod`), Pages project, Turnstile site key.
4. Supabase — two projects (staging, prod) in Mumbai; copy URL + anon key + service key into GitHub/EAS secrets; enable Google/Apple/email providers.
5. Expo — account, `eas login`, project id; EAS secrets.
6. Apple Developer Program (individual, $99/yr) — enrol, create App ID with Sign in with Apple + Push, APNs key, App Store Connect app, TestFlight.
7. Google Play Console (personal, $25 once) — identity verification, create app, internal + closed testing tracks, upload keystore via EAS.
8. Google Cloud — OAuth consent screen, OAuth client IDs (web, iOS, Android with SHA-1 from EAS), Places API key restricted to Edge Functions.
9. Resend — verify domain for email OTP.
10. Map tiles provider + routing VPS (Phase 4).
11. Anthropic Console — API key, monthly spend limit (Phase 7).
12. RevenueCat + store products (Phase 6); Meta developer app for Instagram Stories (Phase 5).
13. Sentry, PostHog — projects + keys.
14. Later (company): DLT registration + SMS provider, GST, move apps to organisation accounts (Apple D-U-N-S).
Each step: why, exact clicks, values to send back to Claude (never paste secrets in chat — add them as GitHub/EAS/Supabase secrets; doc shows how).

### 7.9 Files
| File | Change |
|---|---|
| `docs/07-open-items.md` … `docs/14-owner-setup.md` (new) | Sections 7.1–7.8 |
| `docs/03-architecture.md` | Point to doc 09 for the stack; update map/offline/web lines per 7.3 (old lines kept as "superseded by 09") |
| `docs/plans/07-build-readiness.md`, `docs/plans/README.md` | Plan log entry |
| `README.md` | Links to docs 07–14 and "Start here" (owner setup → development plan) |

### 7.10 Verification
- Cross-check: every table in docs/11 exists in docs/03's model; every account in docs/14 is referenced by a phase in docs/13; every stack item in docs/09 appears in the phase where it's introduced.
- Re-read sources for time-sensitive claims (Expo SDK, Play testing rule, Supabase providers, DLT) and cite them in the docs.
- Commit and push; mark Plan 7 ✅ in the log.
