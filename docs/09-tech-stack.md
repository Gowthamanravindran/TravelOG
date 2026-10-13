# 09 · Tech Stack (complete list)

The single source of truth for what the app is built with. [03 · Architecture](03-architecture.md) explains how the pieces fit; where they disagree, this file wins. Exact versions are pinned in Phase 0 (latest stable at that time) and upgraded deliberately.

## Changes from earlier docs
| # | Earlier | Now | Why |
|---|---|---|---|
| 1 | TanStack Query + MMKV for offline | **expo-sqlite + Drizzle ORM** is the app's data store, with our own sync ([11](11-local-db-and-sync.md)). MMKV only for small settings | Trip mode must work fully offline with relational data (trips → days → items, expenses → splits) |
| 2 | `@rnmapbox/maps` + Mapbox Directions | **MapLibre React Native**; hosted vector tiles on a free tier first, self-hosted PMTiles later with no code change. Routing via OpenRouteService free tier in development, **self-hosted OSRM/Valhalla before beta** | Plan 6 moves to self-hosted tiles and routing; Mapbox's terms tie its APIs to its SDK, so starting on MapLibre avoids a rewrite |
| 3 | Next.js on Vercel | **Cloudflare Pages + Workers** for invite pages, public itineraries, the `/go` affiliate redirect and universal-link files | Free tier allows commercial use; same vendor as R2 |
| 4 | Phone OTP at launch | **Google, Apple and email OTP at launch; phone OTP after DLT registration** | Indian OTP SMS needs a DLT-registered sender, which needs a business entity |
| 5 | — | Added forms, validation, time zones, money handling, FX, i18n, feature flags, testing and tooling (below) | Gaps |
| 6 | Open-Meteo free tier | **Open-Meteo commercial plan** for forecasts, or precomputed climate normals only | The free tier is for non-commercial use |

## Mobile app (`apps/mobile`)
| Purpose | Choice |
|---|---|
| Framework | Expo (latest stable SDK at Phase 0 — currently SDK 55 with React Native 0.83, New Architecture only), TypeScript strict |
| Navigation | Expo Router (file-based; route groups per mode: `(home)`, `trip/[id]/plan`, `trip/[id]/live`) |
| Local database | expo-sqlite (SQLCipher encryption on) + Drizzle ORM + drizzle-kit migrations |
| Small key-value settings | react-native-mmkv |
| Server calls | supabase-js (auth, RPC, Realtime, storage presign) |
| UI state | Zustand |
| Forms and validation | react-hook-form + zod (zod schemas shared with server in `packages/core`) |
| Animation and gestures | Reanimated, Gesture Handler, bottom sheets (@gorhom/bottom-sheet) |
| Lists | FlashList |
| Images | expo-image, expo-image-picker, expo-image-manipulator |
| Collage editor | @shopify/react-native-skia |
| Maps | @maplibre/maplibre-react-native (+ offline packs) |
| Location | expo-location + expo-task-manager (background, opt-in, live trips only) |
| Notifications | expo-notifications (Expo push service → APNs/FCM; local reminders) |
| Sharing | react-native-share (Instagram Stories, share sheet, WhatsApp); expo-linking for UPI and maps deep links |
| Secure storage | expo-secure-store (encryption key for session + DB key) |
| Sign-in | @react-native-google-signin/google-signin, expo-apple-authentication |
| Payments | react-native-purchases (RevenueCat) |
| Dates and time zones | date-fns + date-fns-tz; all times stored UTC + trip time zone |
| Money | Integer minor units (paise, cents); currency code per amount; FX rate stored on each expense |
| Languages | i18next + expo-localization (English first, strings externalised) |
| Crash and performance | @sentry/react-native |
| Analytics and feature flags | PostHog React Native SDK |

## Backend (`supabase/`)
| Purpose | Choice |
|---|---|
| Database | Supabase Postgres (Mumbai region), Row-Level Security on every table, PostGIS (places), pg_trgm (search) |
| Auth | Supabase Auth: Google, Apple, email OTP; phone OTP later ([10](10-auth.md)) |
| Realtime | Supabase Realtime (broadcast "changed" nudges per trip) |
| Server functions | Supabase Edge Functions (Deno, TypeScript): `sync_push`/`sync_pull` RPCs are SQL; functions for presign, ai-plan, partner-search, invites, account deletion, RevenueCat webhook |
| Scheduled jobs | Supabase Cron (pg_cron): trip state changes, reminders, cleanup, places refresh trigger |
| Migrations | Supabase CLI ([12](12-migrations.md)) |
| Email | Resend (SMTP for auth emails + transactional) |
| SMS (later) | Textlocal or Twilio Verify via Supabase phone provider, after DLT registration |
| Abuse protection | Cloudflare Turnstile on OTP requests; Supabase auth rate limits |

## Media, maps and data services
| Purpose | Choice |
|---|---|
| Photo and file storage | Cloudflare R2 (zero egress) via presigned uploads; served through a Worker that checks access |
| Map tiles | Hosted vector tiles on a free tier (e.g. MapTiler/Stadia) → self-hosted PMTiles on R2 at scale |
| Routing and travel times | OpenRouteService (dev) → self-hosted OSRM or Valhalla (VPS) |
| Places | Own `places` table from Foursquare OS Places + Overture + OpenStreetMap; Google Places (New) as a fallback for fresh details ([06](06-cost-optimization.md)) |
| Weather | Open-Meteo commercial plan; climate normals precomputed |
| Exchange rates | Frankfurter (ECB reference rates, no key) cached daily |

## AI
| Purpose | Choice |
|---|---|
| Model API | Claude API via the official TypeScript SDK in Edge Functions; Claude Haiku 5.5 for parsing, checks and notes; a larger model (Claude Opus 5.5 or Sonnet 5.5, chosen by evaluation) for paid custom drafts |
| Cost controls | Prompt caching, Batch API for blueprints, per-user quotas in `ai_usage`, spend limit in the Anthropic Console |

## Money-making
| Purpose | Choice |
|---|---|
| In-app purchases | RevenueCat over App Store and Google Play billing |
| Affiliate links | Affiliate networks + `/go` redirect Worker with click logging |
| Settle-up | UPI deep links (no money handled by us) |

## Web (`apps/web`)
| Purpose | Choice |
|---|---|
| Hosting | Cloudflare Pages + Workers |
| Pages | Invite preview, public itinerary pages, privacy/terms, `/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json` |
| Framework | Astro or plain Workers (static-first; no server needed beyond Workers) |

## Engineering tooling
| Purpose | Choice |
|---|---|
| Repo | pnpm workspaces monorepo: `apps/mobile`, `apps/web`, `packages/core` (types, zod schemas, split and sync logic), `packages/ui` (tokens, components), `supabase/` |
| Lint and format | ESLint + Prettier, TypeScript strict, import ordering |
| Unit and component tests | Jest + React Native Testing Library |
| Database tests | pgTAP via `supabase test db` (permission/RLS tests) |
| End-to-end tests | Maestro flows on Android emulator in CI |
| CI | GitHub Actions: lint, typecheck, tests, migration check, bundle-size check |
| Builds and releases | EAS Build, EAS Submit, EAS Update (channels: development, preview, production) |
| Secrets | GitHub Actions secrets, EAS environment variables, Supabase function secrets — never in the repo |
| Project instructions | `CLAUDE.md` with conventions and commands for Claude sessions |

## Environments
| Environment | Supabase project | App build | Purpose |
|---|---|---|---|
| Local | Local Docker stack (`supabase start`) | Development build | Day-to-day building |
| Staging | `travelog-staging` | Preview build (internal testers) | Testing every change before production |
| Production | `travelog-prod` | Store build | Real users |
