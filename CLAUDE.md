# TravelOG — project guide

Group trip-planning app (iOS + Android, India-first). Design and plans live in `docs/`; read
`docs/13-development-plan.md` for the current phase and `docs/plans/` for the history of decisions.

## Layout
| Path | What |
|---|---|
| `apps/mobile` | Expo app (Expo Router, TypeScript). Expo-specific rules: `apps/mobile/AGENTS.md` |
| `apps/web` | Static pages for Cloudflare Pages (waitlist now; invite pages and universal-link files later) |
| `packages/core` | Shared logic and types (money, splits; later sync, zod schemas) — pure TypeScript, Vitest |
| `packages/ui` | Design tokens from `docs/02-design-system.md` — Vitest |
| `packages/db` | On-device database: Drizzle schema, migrations (`drizzle/`), repositories that also fill the sync outbox — Vitest on better-sqlite3 |
| `supabase/` | Migrations, seed (local only), pgTAP tests |
| `docs/` | Product, design, architecture, plans. `docs/09-tech-stack.md` is the authoritative stack |
| `mockups/` | Clickable HTML prototype and profit calculator |

## Commands (run from the repo root)
```bash
pnpm install                 # Node 22, pnpm 10
pnpm lint                    # expo lint
pnpm typecheck               # tsc in every package
pnpm test                    # Vitest (packages) + Jest/jest-expo (mobile)
pnpm format                  # Prettier
pnpm --filter @travelog/mobile start          # dev server (development build only; Expo Go no longer works)
pnpm --filter @travelog/mobile export:android # production bundle → apps/mobile/dist
node scripts/check-bundle-size.mjs            # bundle budget (docs/08)
pnpm db:start | db:reset | db:test | db:types # local Supabase (needs Docker)
pnpm --filter @travelog/db exec drizzle-kit generate   # after editing packages/db/src/schema.ts
```
In this cloud environment the Expo CLI cannot reach `api.expo.dev`; prefix Expo commands with
`EXPO_OFFLINE=1` (e.g. `EXPO_OFFLINE=1 npx expo install <pkg>` inside `apps/mobile`).

## Conventions
- **Money:** integer minor units + currency code (`@travelog/core` money helpers). Never store floats.
- **Time:** store UTC; keep the trip's time zone alongside.
- **Database:** every table gets RLS, policies, indexes for its policies and a pgTAP test in the same change.
  Never edit a merged migration — add a new one. Breaking changes use expand → migrate → contract (`docs/12`).
- **Add native packages with `npx expo install`** (SDK-compatible versions), never plain `pnpm add`.
- **Secrets never go in the repo.** Public values only (Supabase URL/anon key, EAS project id).
  Secret stores: GitHub Actions, EAS environment variables, Supabase function secrets (`docs/14`).
- **Placeholders** to change once the owner decides: bundle id `app.travelog.mobile`, scheme `travelog`,
  domain `travelog.app` — all in `apps/mobile/app.config.ts`.
- **Reference apps:** never name other apps or products the owner shares as inspiration in docs, code, comments
  or commit messages; describe the feature itself, and if needed say "a reference app (reference only)".
- **Plan log:** any change of plan gets a new numbered file in `docs/plans/`; earlier plans are never edited.
- Before finishing work: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.
