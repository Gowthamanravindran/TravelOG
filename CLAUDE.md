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
pnpm dev:go                  # everyday testing: install anything new, start for Expo Go (scan the QR code)
pnpm dev                     # same for the TravelOG development build (encryption, Instagram posting, native changes)
pnpm --filter @travelog/mobile start          # dev server without the install step
pnpm --filter @travelog/mobile export:android # production bundle → apps/mobile/dist
node scripts/check-bundle-size.mjs            # bundle size vs budget (docs/08); reports only, enforcement paused (Plan 50)
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
- **Add native packages with `npx expo install`** (SDK-compatible versions), never plain `pnpm add`. Prefer packages
  included in Expo Go; anything else must fall back gracefully there (`lib/runtime.ts` `isExpoGo`), and the plan
  summary must tell the owner a new development build is needed.
  Every package with native code must be listed in `apps/mobile/native-packages.json` (checked in CI by
  `pnpm check:native`); an unlisted one is not in the owner's installed app and crashes there (Plan 48).
- **Secrets never go in the repo.** Public values only (Supabase URL/anon key, EAS project id).
  Secret stores: GitHub Actions, EAS environment variables, Supabase function secrets (`docs/14`).
- **Placeholders** to change once the owner decides: bundle id `app.travelog.mobile`, scheme `travelog`,
  domain `travelog.app` — all in `apps/mobile/app.config.ts`.
- **Reference apps:** never name other apps or products the owner shares as inspiration in docs, code, comments
  or commit messages; describe the feature itself, and if needed say "a reference app (reference only)".
- **Design:** colours only from `themeFor` / `useTheme()` (`packages/ui`). No violet (OKLCH hue 270–330°). Every text pair at least 4.5:1, enforced by the `packages/ui` theme test. No hex colours or `fontWeight` in app chrome (style guard). Fonts come from `font(role, weight)`.
- **React Native practices:** follow `.claude/skills/react-native-skills` (Vercel's React Native skill), except the Expo Go exceptions in its `NOTE.md`. Motion goes through `apps/mobile/src/ui/motion.tsx` and respects Reduce motion.
- **Plan log:** any change of plan gets a new numbered file in `docs/plans/`; earlier plans are never edited.
- Before finishing work: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.
