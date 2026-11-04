# Plan 12 — Local-first build (accounts later) ✅

**Status:** Built in two commits on `claude/kind-allen-2woote`: M1 database layer (`21cf1b7`) and M2–M8 screens (the commit that adds this file).

### Context
The owner confirmed Supabase and sign-in are not immediate needs and asked to "build everything else" first and come back to accounts later. The development plan (doc 13) is reordered: everything that works on one phone is built now on an on-device database designed for sync (doc 11), so adding sign-in + Supabase later needs no rework. Multi-person features (invites, shared voting, backup) wait for accounts.

### In scope (built in milestones, each committed with tests)
| M | What | Notes |
|---|---|---|
| 1 | **On-device database**: expo-sqlite (SQLCipher, key in expo-secure-store) + Drizzle schema + generated migrations; sync-ready columns (UUID v7 ids, `updated_at`, `deleted_at`, `server_seq` null until synced, `outbox` table filled on every write) | Repositories accept any Drizzle SQLite db, so tests run on better-sqlite3 in Node with the same migrations |
| 2 | **Navigation + modes**: Home tabs (Trips · Feed · ＋ · Explore · Profile), Plan mode tabs (Itinerary · Budget · Bookings · Polls), Trip mode tabs (Today · Plan · Nearby · Budget); per-mode themes; local "me" profile (name, currency) | Feed/Explore/Nearby show designed "coming soon / needs account" states |
| 3 | **Trips**: create (name, emoji, destination, dates, time zone, currency), list by Upcoming/Planning/Past, lifecycle state from dates, edit/delete | |
| 4 | **Itinerary**: days from dates, items (type, time, duration, cost, notes), reorder, plan variants A/B/C per day, compare | |
| 5 | **Polls (local)**: create, options, vote as "me", lock-in applying results (dates / variant) | Shared voting arrives with sync |
| 6 | **Money**: budgets per category, expenses with equal/shares/exact/percent splits across trip members (local placeholder members), balances, fewest-payments settle-up, UPI deep link, mark paid | Split/settle logic in `packages/core` with unit tests |
| 7 | **Bookings**: add/edit bookings (type, provider, ref, times, cost → optional expense), attach PDF/photo stored on device | |
| 8 | **Trip mode**: Today (now/next from itinerary in trip time zone), Plan list, Budget; enters automatically when a trip is live | Map/Nearby need tile + places setup (Phase 4) |

### Not in scope (waits for accounts / later phases)
Sign-in, Supabase staging, sync push/pull, invites and shared trips, waitlist going live, maps and Nearby data, photos/memories upload, payments, Find & book, AI.

### Owner impact
- A **new Android build** is needed once (M1 adds encrypted SQLite and secure storage — native modules): run the "EAS build" workflow when told.
- docs/13 gets a note that local-first parts of Phases 1–4 move ahead of accounts.

### Verification per milestone
`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (repository + core logic tests on real SQLite in Node; screen tests with jest-expo), Android bundle export within budget (raise budget deliberately if features need it), CI green on GitHub.

### What was built
- `packages/db`: Drizzle schema (`src/schema.ts`), generated migrations (`drizzle/`), repositories (`src/repo/*`) that write the row and an `outbox` entry in one transaction; tests on better-sqlite3 with the same migrations.
- `packages/core`: splits, balances + settle-up, UPI links, trip dates/time zones, trip state.
- `apps/mobile`: encrypted database opened behind the splash (`src/data/open.ts`), `DataProvider`/`useQuery`/`useMutate`, UI kit, mode-themed tab bars; Home (Trips, Feed, Explore, Profile), Plan mode (Itinerary with day variants + compare + put to vote, Budget, Bookings with attachments, Polls), Trip mode (Today, Plan, Nearby placeholder, Budget), editors for trips, items, expenses, bookings, polls and settle-up.
- Android bundle budget raised deliberately to 3.58 MB for these features (`bundle-budget.json`).
- Docs: doc 13 "Order change (Plan 12)" note; doc 11 updated (days come from dates; `settings` table).

### Changing the device schema
Edit `packages/db/src/schema.ts`, then `pnpm --filter @travelog/db exec drizzle-kit generate`; commit the new files in `packages/db/drizzle/`. Never edit an applied migration.

### Owner action
The app now uses native modules not in the previous build (encrypted SQLite, secure storage, crypto). Run **Actions → EAS build (Android development)** once and install the new APK.
