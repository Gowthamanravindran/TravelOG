# Plan 9 — Phase 0 build (start now, accounts in parallel) ✅

**Status:** Built in the same commit as this file. Outcome notes:
- Expo **SDK 58** (React Native 0.88) was the latest stable at build time, not SDK 55 as written in Plan 7; docs/09 updated.
- The owner created an Expo project; its id is linked in `apps/mobile/app.config.ts`.
- This cloud environment blocks `api.expo.dev`, `reactnative.directory` and GitHub's container registry. Expo commands run with `EXPO_OFFLINE=1`; the full local Supabase stack could not start, so the migration and all 14 pgTAP tests were run against the `supabase/postgres` image directly, plus PostgREST for the waitlist API. CI runs the full `supabase db start` + `supabase test db`.
- Packages use Vitest; the mobile app uses jest-expo.

### Context
Planning is complete (Plans 1–8). The owner asked whether the checklist must be finished first; answer: no — only checklist sections A–B relate to Phase 0, and the owner chose to **start Phase 0 now with placeholder names**, doing sections A–B in parallel. This plan builds everything in Phase 0 of `docs/13-development-plan.md` that needs no accounts, and wires the account-dependent parts so they switch on when secrets are added.

### Accounts: not needed to start (owner asked)
- **Supabase account — not needed for development.** The whole database runs locally in Docker (`supabase start`) and in GitHub Actions CI without any account. The account is needed only to create the shared **staging** database (when friends test on their phones) and production. → Needed by **mid-Phase 1**.
- **Expo account — not needed to write or test code.** Code, tests and bundling run without it; Phase 0's placeholder app can even open in the free **Expo Go** app by scanning a QR code. The account is needed for **EAS cloud builds** (a "development build"), which the app requires once it uses native modules not in Expo Go (encrypted SQLite, Google/Apple sign-in) — i.e. from **early Phase 1**. (Alternative without an Expo account: build locally with Android Studio/Xcode on your own computer.)
- So Plan 9 proceeds with no accounts; the db-deploy workflow and EAS build steps stay dormant until secrets exist.

### Placeholders (changeable later in one place each)
App name **TravelOG**; bundle/package id **`app.travelog.mobile`**; URL scheme **`travelog`**; domain read from `EXPO_PUBLIC_WEB_DOMAIN` (default `travelog.app`).

### What gets built
| Area | Files | Notes |
|---|---|---|
| Monorepo | `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `.editorconfig`, `.nvmrc`, `.gitignore` | pnpm workspaces; Node 22; TypeScript strict |
| Mobile app | `apps/mobile/` from `create-expo-app` (latest stable SDK, Expo Router, TypeScript) | `app.config.ts` reads env vars (Supabase URL/anon key, domain); placeholder home screen using the design tokens; three route groups stubbed for Home / Plan / Trip; `eas.json` with development, preview, production profiles; Jest (jest-expo) with one screen test |
| Shared UI tokens | `packages/ui/src/tokens.ts` | Colours per mode (Home coral, Plan indigo, Trip teal-on-dark) for light/dark, type scale, spacing, radii from `docs/02-design-system.md` |
| Shared logic | `packages/core/src/money.ts` (+ tests) | Minor-unit money helpers and an equal-split function that distributes leftover paise deterministically — first real logic, used in Phase 3 |
| Database | `supabase/config.toml`, `supabase/migrations/<ts>_init.sql`, `supabase/seed.sql`, `supabase/tests/*.sql` | Tables `profiles` (trigger from `auth.users`), `app_config` (public read), `waitlist` (insert-only for anon, no reads); RLS on all; pgTAP tests for each policy |
| Waitlist page | `apps/web/public/index.html` (+ privacy placeholder) | Static page in the brand style; posts email + "friends you travel with" to the `waitlist` table via Supabase REST; works once Supabase keys are set; deployable to Cloudflare Pages |
| CI | `.github/workflows/ci.yml` | Lint, typecheck, unit tests; DB job runs `supabase start` → `db reset` → `test db` on the GitHub runner; `expo export` bundle-size check against `bundle-budget.json` |
| Deploy DB | `.github/workflows/db-deploy.yml` | On push to `main`: `supabase db push` to staging — skipped with a notice until `SUPABASE_ACCESS_TOKEN` / `STAGING_PROJECT_REF` / `STAGING_DB_PASSWORD` exist |
| Project guide | `CLAUDE.md` | Structure, commands, conventions (money in minor units, UTC times, RLS on every table, never edit merged migrations, secrets never committed, plan log in `docs/plans/`) |
| Docs | `README.md` (Development section), `docs/plans/09-phase-0.md`, `docs/17-owner-checklist.md` (note what's now unblocked) | |

Not in this plan (need accounts or belong to Phase 1): EAS cloud builds, installing on the phone, staging deploy, Sentry/PostHog keys, admin app skeleton (Phase 1).

### Verification
- `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test` pass locally.
- `pnpm --filter mobile exec expo export --platform android` succeeds; bundle size recorded in `bundle-budget.json`.
- Database: try to start the Docker daemon in this container and run `supabase start` / `db reset` / `test db`; if Docker can't run here, rely on the CI DB job and report that it was verified in CI only.
- Push; read the GitHub Actions run results; fix until green.
- Waitlist page: open locally in Playwright at 390 px and desktop, light/dark, 0 console errors (form shows a "not configured yet" message without keys).
- Mark Plan 9 ✅ in the log; tell the owner exactly which checklist items unblock the rest of Phase 0 (Supabase + Expo accounts, secrets, `eas init`, development build on phone).
