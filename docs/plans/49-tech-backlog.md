# Plan 49 — Tech backlog: native-package check, fewer re-reads, bundle headroom, end-to-end tests

**Status:** 🚧 In progress (T1, T2 built)

The owner asked what tech work was on the backlog and chose all four engineering items. Each item lands as its own commit.

## T1 — Native packages must be ones the installed app has ✅
**Problem:** Plan 48's crash came from a package with native code that the owner's installed app didn't contain. The Expo Go guard test is a deny-list, so it only catches packages already known to be bad.

**Change:**
- `apps/mobile/native-packages.json` is the allow-list: the 33 packages with native code the installed app has today. `expo-dev-client` is marked development build only.
- `scripts/native/check.mjs` (`pnpm check:native`) finds the app's direct dependencies with native code: an Expo module config, an Android Gradle build or an iOS podspec. It fails when one isn't listed, explaining that a new development build would be needed. It also fails on listed packages no longer used. It runs in CI after lint.
- `CLAUDE.md`'s native-package rule points to it. The deny-list test stays as a second line of defence.

**Verification:**
- `scripts/native/lib.test.mjs` builds a small app folder and checks that JS-only packages are ignored, all three kinds of native package are found, and unlisted and unused packages are reported.
- On the real app it lists 33 packages and passes; `drizzle-orm` is correctly not counted.
- Adding a fake native package to the app made it fail with the message.

## T2 — A save re-reads only the screen in view ✅
**Problem:** `mutate()` bumps one global data version, so every `useQuery` on every **mounted** screen re-ran after a save. Tabs stay mounted, and so do screens under the current one. Saving a budget made the hidden Itinerary work out the whole trip's whereabouts again.

**What was tried:** React Navigation's `freezeOnBlur`. In this expo-router version the tab navigator hard-codes it off (`ScreenFallback.js`: `freezeOnBlur: false`), so it did nothing for tabs, and it was removed.

**Change (`data/provider.tsx`):** `useQuery` knows whether its screen is in view, using the screen's navigation focus and blur events. Outside navigation, in tests and the root, it always counts as in view.
- **While hidden,** it keeps the result it last read.
- **When shown again,** it catches up once.

So a hidden tab or a screen under a form never re-reads on a save, and is up to date as soon as you go back. Reminders, which watch every write, use `useDataVersion` and are unaffected.

**Verification:** `hidden-screens.test.tsx` uses the real router.
- Open the Itinerary, switch to Budget, and save a budget: the trip isn't re-read.
- Return to the Itinerary: it re-reads.

The test failed before the change and passes after. All 197 mobile tests pass.
