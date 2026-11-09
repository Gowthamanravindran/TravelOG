# Plan 49 — Tech backlog: native-package check, fewer re-reads, bundle headroom, end-to-end tests

**Status:** 🚧 In progress (T1, T2, T3 built)

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

## T3 — Bundle headroom ✅
**Measured first:** I exported plain minified JS with a source map and attributed every module's bytes (3.59 MB of JS before Hermes compiles it). The top contributors were:
- react-native 672 KB;
- Reanimated 640 KB, which includes every built-in animation (Bounce, Flip, Rotate, Zoom…) though the app uses a few;
- expo-router 484 KB;
- gesture-handler 193 KB;
- drizzle 159 KB.

Our own code is under 300 KB in total; the largest parts are `packages/core` at 86 KB and the trip screens at 70 KB.

`@expo/ui` (85 KB) looked unused but is needed by expo-router's stack toolbar on Android, so it stays. Android release apps are one Hermes bundle with no lazy loading of separate files, so the saving has to come from shipping less code.

**Change:** Expo's tree shaking (`EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH=1`, `EXPO_UNSTABLE_TREE_SHAKING=1`) removes exports nothing uses.
- It's on in `export:android`, which CI's size check runs, and in the `preview` and `production` EAS build profiles.
- Development (`pnpm dev:go`, development builds) is unchanged; tree shaking only applies to release bundles.
- I also tried Metro `inlineRequires`. It made the bundle larger together with tree shaking, and Expo turns it off by default, so it isn't used.

**Result:**
| | Android bundle | vs baseline (limit +10%) |
|---|---|---|
| Before | 5,573,947 bytes | +9.0% |
| After | 5,167,992 bytes (−406 KB, −7.3%) | +1.1% |

**Risk and check:** tree shaking is labelled unstable by Expo and only runs in release builds, so a problem wouldn't show in Expo Go. T4's end-to-end run builds a release APK with the same settings and drives it on an emulator, which checks it. If anything breaks there, the two settings come out.
