# Plan 19 — Test in Expo Go without building ✅

**Status:** Built in the same commit as this file. `pnpm dev:go` was started here and served a complete Android bundle (HTTP 200, ~7 MB) without errors; running it inside Expo Go is the owner's check.

### Context
The owner asks whether they can run the app from their computer and check it in Expo directly instead of building each time. Two facts:
- With the **development build already installed**, `pnpm dev` already loads every code change live. A new build is only needed when a plan adds a phone-side (native) package. Plans 15, 16 and 18 each did.
- **Expo Go** can run this app: every native package it uses ships with Expo Go SDK 58 (sqlite, secure-store, crypto, notifications, image-picker, sharing, view-shot, location, linear-gradient, symbols, file-system, date-time picker, gesture-handler / reanimated). The exception is our own `social-share` module, for which the app already falls back to the share sheet (`lib/social-share.ts`). Expo Go's SQLite has no encryption, so `PRAGMA key` is ignored and data in Expo Go is unencrypted (fine for testing).

### Changes
| File | Change |
|---|---|
| `package.json` (root) | `pnpm dev:go`: install, then `expo start --go`; scan the QR code with Expo Go |
| `apps/mobile/src/data/open.ts` | In Expo Go (`Constants.executionEnvironment === 'storeClient'`), open a separate `travelog-expo-go.db` without the key, so test data never mixes with the real encrypted database |
| `(home)/profile.tsx` | "This app build" says "Running in Expo Go: test data isn't encrypted; Instagram posting uses the share sheet" |
| `CLAUDE.md`, `docs/14-owner-setup.md` §5 | Everyday testing: `git pull && pnpm dev:go` and scan with Expo Go. Use the development build only for encryption, Instagram/Facebook posting and native changes. Each plan's summary says when a new build is needed. Rule: native packages must be in Expo Go, or must fall back gracefully |
| `docs/plans/19-expo-go.md`, `docs/plans/README.md` | Plan log |

### Verification
`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`; a unit test for the Expo Go database choice; start `expo start --go` here offline to confirm the bundle builds. The owner scans with Expo Go (SDK 58) and checks a trip, Budget, a carousel and the share sheet.
