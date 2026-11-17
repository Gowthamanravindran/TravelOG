# One Globe Behind the Tabs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Share one globe between Trips, Explore and Profile; make a tapped country open its Explore page with the globe zoomed on it; let people mark the countries they have visited on Profile; move Profile's settings behind a gear.

**Architecture:** The tabs layout draws a stage over the tab scenes: the globe, and on it the focused tab's drawer panel. Each panel hands the stage a scene (what the globe shows, what a tap does, how much is covered). The map page learns camera padding, a run-time tap mode and a "home" view fitted to the visible band. Content components are shared between the panels and the plain full-page fallbacks used where the globe cannot run.

**Tech Stack:** as Plans 65–71 (Expo SDK 58, Expo Router tabs, Reanimated 4, Gesture Handler 3, `@travelog/globe`, Vitest, Jest). No new packages.

**Spec:** `docs/superpowers/specs/2026-11-17-globe-behind-tabs-design.md` — read it first. It builds on `2026-11-17-globe-home-design.md`.

## Global Constraints

- No new native package, no server change, no schema migration. Visited countries are the device setting `profile.visitedCountries` (JSON array of ISO alpha-2 codes, order added).
- The globe never reloads when tabs change: nothing that feeds `buildGlobeHtml`'s config may vary by tab. Tap behaviour and padding are switched with injected calls.
- Never import `react-native-webview` or `@travelog/globe/src/GlobeMap` at the top of an app file; `components/globe.tsx` stays the only loader, behind `hasGlobe()`.
- Where `hasGlobe()` is false, the Trips, Explore and Profile routes draw ordinary full pages with the same content; where it is true they draw nothing and the stage draws for them.
- Colours only from `useTheme()`; no hex or `fontWeight` in app chrome; motion through `ui/motion.tsx`, timing only (no springs, Plan 32); Reduce motion respected.
- Icon-only buttons: 48 pt touch target and an `accessibilityLabel`.
- The create flow (Plan 67) keeps its behaviour and every existing assertion; tests may be re-hosted onto the stage.
- Exact copy: "Exploring {Country}", "All of Explore", "Search cities in {Country}", "Explore by city", "Curated trips", "Sample", "Share your itinerary", "Coming soon", "No cities listed here yet.", "Search a country", "Countries you’ve visited", "+{n} more", "Add a country you’ve visited", "Tap a country on the globe to mark it, or tap it again to unmark it.", "Tap a country on the globe to mark it.", "{n} countries visited" / "1 country visited", "Settings", "Trip reminders", "Appearance", "About", "Licences, this app build, account and version", "{Country} marked as visited", "{Country} removed".
- Reference apps are never named. New plan files `72-`, `73-`, `74-` in `docs/plans/` with README rows; earlier plans are not edited.
- Before each commit: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. Commits end with the session's attribution lines.

## Review Focus

1. **Marks leaking between tabs:** visited countries from Profile, or Explore's outlined country, must not be in what the globe is sent once another tab is focused, including after quick back-and-forth switching. → Task 2 and Task 4 tests.
2. **New trip pressed while on Explore or Profile:** the app goes to Trips, the create flow opens, and a country tap picks it (it does not open Explore or mark it visited). → Task 2 test.
3. **Bad saved data:** `profile.visitedCountries` holding broken JSON, a non-array, unknown codes or duplicates gives a clean list and no crash. → Task 4 tests.
4. **A country page for something odd:** an unknown code in `/explore?country=`, a place with no alpha-2 code, or a country with no cities in the list. → Task 3 tests.
5. **No globe in the app:** Explore's country page, Profile's visited countries and Settings are all reachable and usable as plain pages. → Task 5 tests.

## File Structure

```
packages/globe/src/globeHtml.ts            modify  padding for every camera move, tap mode, goHome
packages/globe/src/GlobeMap.tsx            modify  tapMode prop, goHome on the handle
packages/globe/src/cities.ts               modify  citiesIn, searchCitiesIn
scripts/globe/page-check.py                create  headless-Chrome check of the real map page (dev aid)
apps/mobile/src/components/globe-stage.tsx create  the stage: globe + focused tab's panel; scene context
apps/mobile/src/components/trips-panel.tsx create  today's GlobeHome minus the globe (drawer, create flow)
apps/mobile/src/components/explore/        create  general.tsx, country.tsx (content), panel.tsx (drawer + scene)
apps/mobile/src/components/profile/        create  main.tsx, visited.tsx, settings.tsx (content), panel.tsx
apps/mobile/src/lib/visited.ts             create  parse/read/add/remove visited countries
apps/mobile/src/ui/kit.tsx                 modify  Expander (a row that opens in place)
apps/mobile/src/app/(home)/_layout.tsx     modify  hosts the stage
apps/mobile/src/app/(home)/index.tsx       modify  null with the globe; list page without
apps/mobile/src/app/(home)/explore.tsx     modify  null with the globe; plain page without
apps/mobile/src/app/(home)/profile.tsx     modify  null with the globe; plain page without
```

---

## Part D — The shared globe (Plan 72)

### Task 1: The map page centres in what shows, and taps can be report-only

**Files:**
- Modify: `packages/globe/src/globeHtml.ts`, `packages/globe/src/GlobeMap.tsx`
- Create: `scripts/globe/page-check.py`
- Test: `packages/globe/src/page.test.ts`

**Interfaces:**
- Produces (`GlobeMapProps`): `tapMode?: 'focus' | 'report'` (default `'focus'`). (`GlobeMapHandle`): `goHome(): void`.
- Page API added: `setTapMode(mode)`, `goHome()`. `setInset(px)` now also moves the camera's padding.
- Behaviour:
  - `setInset(px)` stores the inset and eases the map's padding to `{ top: 0, left: 0, right: 0, bottom: px }` (300 ms, 0 with reduce motion). Every later `flyTo`, `easeTo`, `fitBounds` and the spin then centres in the visible band. `fitBox`'s own bottom padding goes back to 60 and the single-point `offset` is removed (no double counting).
  - `homeZoom()` = the zoom at which the globe's diameter is 90 % of `min(width, height − inset)`: `log2(Math.PI * 0.9 * min / 512)`, floored at 0.4. `goHome()` eases to it keeping the current longitude, latitude 18; `select(null)`'s zoom-out and the first view use it too.
  - Tap mode `'report'`: a country tap only posts `{ type: 'country', … }`; no `select`, no `focusCountry`. `'focus'` is today's behaviour.

- [ ] **Step 1: Failing tests** in `page.test.ts`: the queue test's list gains `'setTapMode'` and `'goHome'`.
- [ ] **Step 2: Run** `pnpm --filter @travelog/globe test > /tmp/g.log 2>&1; grep -E "Tests |×" /tmp/g.log` — Expected: 1 failed.
- [ ] **Step 3: Write `scripts/globe/page-check.py`** (Playwright for Python + system Chrome with SwiftShader; builds the page with a throwaway Vitest file, as done in Plans 66–67). It prints JSON for these checks and exits non-zero if any fails:
  - `inset_focus`: viewport 390×470; `setTapMode('report')`, `setInset(200)`, `focusCountry('JPN')`; after 1.5 s a click at (195, 135) (the middle of the visible band) posts `country` `JPN`.
  - `report_only`: after `clearSelection()`, a click on Japan in report mode posts `country` and `document.querySelectorAll('.country-pop').length === 0`.
  - `focus_mode`: `setTapMode('focus')`, same click → `.country-pop` count 1.
  - `home_fits`: `setInset(200)`, `goHome()`; clicks at (195, 20) and (195, 250) post nothing or a country, and a click at (195, 135) posts a country or nothing but never throws; the page reports no `error` message. (The visual is checked by screenshot, saved to `/tmp/globe-home.png`.)
  - `no_errors`: no `pageerror`.
- [ ] **Step 4: Run it before the change** — Expected: `inset_focus` and `report_only` fail.
- [ ] **Step 5: Implement the page changes and the `GlobeMap` prop and handle method** (effects: `setTapMode` sent when ready and on change, before data).
- [ ] **Step 6: Run** the package tests, `pnpm --filter @travelog/globe typecheck`, and `python3 scripts/globe/page-check.py` — Expected: all pass; look at `/tmp/globe-home.png`: the whole Earth sits in the top band.
- [ ] **Step 7: Commit** — `Plan 72: the globe centres in the part that shows; taps can be report-only`.

### Task 2: The stage in the tabs layout; Trips moves onto it

**Files:**
- Create: `apps/mobile/src/components/globe-stage.tsx`, `apps/mobile/src/components/trips-panel.tsx`
- Modify: `apps/mobile/src/app/(home)/_layout.tsx`, `apps/mobile/src/app/(home)/index.tsx`, `apps/mobile/src/ui/drawer.tsx` (a `full` option: the top height reaches the stage's top, below the status bar)
- Test: `apps/mobile/src/__tests__/globe-stage.test.tsx` (new); `globe-home.test.tsx`, `create-trip.test.tsx`, `create-trip-motion.test.tsx` re-hosted through a shared helper `renderHome(db, path)` in `src/testing/test-utils.tsx` that renders `<HomeLayout />` with `expo-router` mocked (`usePathname` returning `path`, `Tabs` drawing only the tab bar)

**Interfaces:**
- Produces:
```ts
// components/globe-stage.tsx
export type StageTab = 'trips' | 'explore' | 'profile';
export interface GlobeScene {
  visitedCountries?: string[];            // ISO alpha-3, filled coral
  candidates?: Place[]; stops?: Place[];
  tapMode: 'focus' | 'report';
  onCountryPress?: (c: CountryTap) => void;
  onCandidatePress?: (p: Place) => void;
  onPlacePress?: (p: Place) => void;
  countryTapEnabled?: boolean;            // default true
  spin: boolean;
  covered: number;                        // points of the stage under the drawer
}
export function useStage(): { globe: RefObject<GlobeHandle | null>; height: number; setScene(tab: StageTab, scene: GlobeScene | null): void };
export function GlobeStage(props: { tab: StageTab | null; bottom: number }): ReactElement | null;
export function stageTabFor(pathname: string): StageTab | null;  // '/' → 'trips', '/explore' → 'explore', '/profile' → 'profile', else null
```
- The stage keeps one scene per tab and gives the globe **only the focused tab's** scene (`tab === null` → no marks, `active` false). It renders `<TripsPanel />`, `<ExplorePanel />` or `<ProfilePanel />` for the focused tab only (Tasks 3–4 add the last two; until then they render nothing).
- `_layout.tsx`: wraps `<Tabs>` and `<GlobeStage tab={hasGlobe() ? stageTabFor(usePathname()) : null} bottom={barHeight} />` in one view; `barHeight` from the tab bar wrapper's `onLayout` (0 while the create flow hides the bar). The stage is `position: 'absolute'`, top 0, bottom `bottom`, and is not rendered when `tab` is null.
- `index.tsx`: `hasGlobe() ? null : <TripsListScreen … />`.
- `TripsPanel`: the body of today's `GlobeHome` without the globe view: drawer, greeting, create flow, announcements. Its scene: create flow closed → `{ tapMode: 'report', spin: drawer lowered, covered, onCountryPress: c => router.navigate({ pathname: '/explore', params: { country: c.iso } }) }`; open → `globePropsFor(draft)` with `tapMode: draft.step === 'countries' ? 'focus' : 'report'`, `spin: false`. Outside the flow its drawer heights are `[45 %, full]`; in the flow `[45 %, 62 %, 88 %]` as today.
- New trip (tab bar centre): `router.navigate('/')` then `flow.start()` (as today).

- [ ] **Step 1: Failing tests** (`globe-stage.test.tsx`):
  - `stageTabFor('/')` → `'trips'`, `'/explore'` → `'explore'`, `'/profile'` → `'profile'`, `'/feed'` → `null`.
  - `renderHome(db, '/')`: one element labelled "Globe"; "Your trips" and "Create a trip" present; a `country` message from the page calls `navigate({ pathname: '/explore', params: { country: 'JPN' } })`; the last injected tap mode is `setTapMode("report")`.
  - `renderHome(db, '/feed')`: no element labelled "Globe".
  - Re-render from `'/'` to `'/explore'` (same tree, `rerender`): `global.mockWebViews` still has the **same** entry (the web view was not remounted).
  - New trip from another tab: at `'/profile'`, press "New trip" → `navigate('/')` called and `createFlowOpen()` true; re-render at `'/'`; a `country` message picks the country ("Remove Japan" shows) and `navigate` was not called with `/explore`.
- [ ] **Step 2: Re-host the three existing suites** on `renderHome` (assertions unchanged; `<TripsScreen />` → `renderHome(db, '/')`). Run them — Expected: FAIL (no stage yet).
- [ ] **Step 3: Implement** `globe-stage.tsx`, `trips-panel.tsx`, the layout and `index.tsx`; add `full` to `Drawer` (top height = stage height − safe-area top).
- [ ] **Step 4: Run** `cd apps/mobile && pnpm test > /tmp/m.log 2>&1; grep -E "^Tests:|●.*›" /tmp/m.log | cut -c1-160` — Expected: all pass. Then `pnpm lint && pnpm typecheck`.
- [ ] **Step 5: Write `docs/plans/72-one-globe-behind-the-tabs.md`** (what moved and why the layout hosts the drawers), README row; commit — `Plan 72: one globe, hosted by the tabs layout; Trips draws on it`.

---

## Part E — Explore on the globe (Plan 73)

### Task 3: Explore: the plain globe, and a country's page

**Files:**
- Modify: `packages/globe/src/cities.ts` (+ `cities.test.ts`), `apps/mobile/src/app/(home)/explore.tsx`
- Create: `apps/mobile/src/components/explore/general.tsx`, `country.tsx`, `panel.tsx`
- Test: `apps/mobile/src/__tests__/explore.test.tsx` (rewritten), `packages/globe/src/cities.test.ts`

**Interfaces:**
- Consumes: `useStage`, `GlobeScene` (Task 2); `countryByIso`, `searchCountries`, `topCities`, `cityById`.
- Produces:
  - `citiesIn(countryCode: string): City[]` (all, largest first, territories under their parent) and `searchCitiesIn(countryCode: string, query: string, limit = 12): City[]` (name starts with the query first, then a later word; under 2 letters → `[]`).
  - `<ExploreGeneral onPickCountry={(c: CountryInfo) => void} />`: title "Explore", field "Search a country" with results, then today's general content.
  - `<ExploreCountry country={CountryInfo} onBack onCity={(city: City) => void} />`: back button "All of Explore", title "Exploring {Country}", field "Search cities in {Country}" (results from `searchCitiesIn`, each a row that calls `onCity`), "Explore by city" tiles (`topCities`, two per row, each a button labelled with the city's name), "Curated trips" cards marked "Sample" (generated as in Plan 70), and "Share your itinerary" which shows "Coming soon" inline when pressed.
  - `<ExplorePanel />`: reads `country` from `useGlobalSearchParams()`; drawer heights `[45 %, full]` with no country and `[72 %, full]` with one (so 28 % of the globe shows); scene: no country → `{ tapMode: 'report', spin: drawer lowered, covered, onCountryPress: open }`; a country → `{ tapMode: 'report', spin: false, covered, candidates: topCities as pins, onCountryPress: open, onCandidatePress: fly }`.
  - `open(iso)` = `router.setParams({ country: iso })`; back = `router.setParams({ country: undefined })`.
  - On a change of country (including arriving from Trips): `globe.focusCountry(iso)` and announce "Exploring {Country}". On leaving a country: `globe.clearFocus()` and `globe.goHome()`. `onCity`: lower the drawer, `globe.flyTo(lng, lat, 5)`.
- `explore.tsx`: with the globe → `null`; without → a `Screen` holding `ExploreCountry` or `ExploreGeneral` by the same param.

- [ ] **Step 1: Failing tests**
  - globe: `citiesIn('JP')[0].name === 'Tokyo'`; `searchCitiesIn('JP', 'kyo').map(c => c.name)` contains `'Kyoto'` and no city outside Japan; `searchCitiesIn('JP', 'k')` is `[]`; `searchCitiesIn('FR', 'saint-denis')` includes the Réunion city (`countryCode: 'RE'`).
  - mobile (`renderHome(db, '/explore')`, params mocked):
    - no country: "Explore", field "Search a country"; typing "jap" and pressing "Japan" calls `setParams({ country: 'JPN' })`; a `country` message from the page does the same; the globe is sent no `visited`.
    - `{ country: 'JPN' }`: "Exploring Japan"; the last injected calls include `focusCountry("JPN")`; candidates sent include Tokyo; "Explore by city" has buttons Tokyo and Osaka; pressing "Osaka" injects a `flyTo(` with Osaka's longitude; typing "sapp" in "Search cities in Japan" lists "Sapporo" and pressing it injects `flyTo(`; at least two texts match `/Sample/`; pressing "Share your itinerary" shows "Coming soon"; "All of Explore" calls `setParams({ country: undefined })`.
    - changing the param from `JPN` to nothing injects `clearSelection()` and `goHome()`.
    - `{ country: 'ZZZ' }` → the general page. `{ country: 'ATA' }` → "Exploring Antarctica" and "No cities listed here yet.".
    - leaving to `'/'` (re-render): the next `setData` has no candidates.
- [ ] **Step 2: Run** both suites — Expected: FAIL.
- [ ] **Step 3: Implement** the helpers, the three components and the route.
- [ ] **Step 4: Run** all tests, lint, typecheck — Expected: PASS.
- [ ] **Step 5: Write `docs/plans/73-explore-on-the-globe.md`** (it replaces Plan 70's page; placeholders listed), README row; commit — `Plan 73: explore a country on the globe`.

---

## Part F — Profile on the globe (Plan 74)

### Task 4: Countries visited, and Settings behind a gear

**Files:**
- Create: `apps/mobile/src/lib/visited.ts`, `apps/mobile/src/components/profile/main.tsx`, `visited.tsx`, `settings.tsx`, `panel.tsx`
- Modify: `apps/mobile/src/ui/kit.tsx` (`Expander`), `apps/mobile/src/ui/icon.tsx` (a `settings` gear if missing), `apps/mobile/src/app/(home)/profile.tsx`
- Test: `apps/mobile/src/__tests__/visited.test.ts`, `profile.test.tsx` (new); `appearance.test.tsx` and `profile-build.test.tsx` updated to open Settings first

**Interfaces:**
- Produces:
```ts
// lib/visited.ts
export const VISITED_KEY = 'profile.visitedCountries';
export function parseVisited(value: string | null): string[];   // alpha-2, order kept; bad JSON / non-array → []; unknown codes and repeats dropped; territories → parent
export function readVisited(db: Db): string[];
export function addVisited(db: Db, code: string): void;         // no-op if present or unknown
export function removeVisited(db: Db, code: string): void;
// ui/kit.tsx
export function Expander(props: { title: string; summary?: string; badge?: string; open: boolean; onToggle: () => void; children: ReactNode }): ReactElement;
// a button row (accessibilityState.expanded), chevron, children shown when open
```
- `<ProfileMain onOpenSettings />`: name with "{n} countries visited" and the gear (48 pt, label "Settings"); the profile card (home currency, UPI, **Edit**; Trips / Completed) as today; `<Visited />`.
- `<Visited />`: `Expander` titled "Countries you’ve visited" with the total as its badge. Closed: the first three as plain chips and a "+{n} more" button when there are more than three; none → "Tap a country on the globe to mark it." Open: field "Add a country you’ve visited" (`searchCountries`; rows "Add {Country}" / "{Country}, visited"), every country as a removable chip ("Remove {Country}"), and the hint.
- `<ProfileSettings onBack />`: back button "Back to Profile", title "Settings", three `Expander`s: "Trip reminders" (today's switch and text), "Appearance" (summary "{Theme label} · {Mode label}", today's `AppearanceCard` inside), "About" (summary "Licences, this app build, account and version"; inside: the licences row that opens `/licenses`, This app build with today's wording, Account and sync with today's wording, the version).
- `<ProfilePanel />`: drawer heights `[55 %, full]` (45 % of the globe shows); main view or Settings (Settings raises the drawer; leaving the tab closes it); scene `{ tapMode: 'report', spin: false, covered, visitedCountries: visited as alpha-3, onCountryPress: toggle }`; on becoming focused `globe.goHome()`. A toggle gives `haptic('light')` and announces "{Country} marked as visited" / "{Country} removed". A tapped place with no alpha-2 code does nothing.
- `profile.tsx`: with the globe → `null`; without → a `Screen` with the same main view and Settings.

- [ ] **Step 1: Failing tests**
  - `visited.test.ts`: `parseVisited(null)`, `parseVisited('nope')`, `parseVisited('{"a":1}')` → `[]`; `parseVisited('["IN","ZZ","JP","IN","RE"]')` → `['IN', 'JP', 'FR']`; add then read keeps order; adding twice keeps one; `addVisited(db, 'ZZ')` changes nothing; remove removes; a `setSetting(db, VISITED_KEY, 'broken')` then `addVisited(db, 'IN')` → `['IN']`.
  - `profile.test.tsx` (`renderHome(db, '/profile')`):
    - nothing visited: "0 countries visited", the empty hint; a `country` message for `JPN` → "1 country visited", chip "Japan", the next `setData` has `"visited":["JPN"]`, announcement "Japan marked as visited"; the same message again → "0 countries visited", announcement "Japan removed".
    - five visited: three chips and "+2 more"; pressing it shows "Remove Thailand"; typing "egy" and pressing "Add Egypt" → badge "6".
    - the last injected tap mode is `setTapMode("report")` and no `focusCountry(` is injected on a tap.
    - re-render at `'/'`: the next `setData` has `"visited":[]`.
    - gear ("Settings") → "Trip reminders", "Appearance", "About" rows; opening About shows "Licences and credits", "This app build", "Account and sync"; "Back to Profile" returns.
  - `appearance.test.tsx` / `profile-build.test.tsx`: reach their controls through Settings; assertions otherwise unchanged.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** `visited.ts`, `Expander`, the four components and the route.
- [ ] **Step 4: Run** all tests, lint, typecheck — Expected: PASS.
- [ ] **Step 5: Commit** — `Plan 74: countries visited on Profile's globe; settings behind a gear`.

### Task 5: Pages without the globe, the end-to-end flow, docs

**Files:**
- Test: `apps/mobile/src/__tests__/no-globe-pages.test.tsx` (new)
- Modify: `apps/mobile/e2e/01-plan-a-trip.yaml`, `docs/07-open-items.md`, `docs/13-development-plan.md`
- Create: `docs/plans/74-profile-on-the-globe.md` (+ README row)

- [ ] **Step 1: Failing tests** (`hasGlobe` mocked false, each route rendered on its own):
  - Explore with `{ country: 'JPN' }`: "Exploring Japan", the city tiles and sample trips; pressing a tile does not throw; no element labelled "Globe".
  - Profile: "0 countries visited"; open the section, type "jap", "Add Japan" → chip "Japan" and `readVisited(db)` is `['JP']`; the gear opens Settings with the three rows.
  - Trips: the list as before; "Plan a trip" pushes `/new-trip`.
- [ ] **Step 2: Run** — Expected: any failure is a real gap from Tasks 3–4; fix it there.
- [ ] **Step 3: e2e:** after the trip steps, add: open Profile, assert "Countries you’ve visited", tap "Settings", assert "About"; open Explore, assert "Search a country". Note in Plan 74 that the flow has not been run.
- [ ] **Step 4: Docs:** Plan 74; `docs/07` rows for the open items (what a city tile and a curated trip open; where curated trips come from; offering past trips' countries as visited); a line in `docs/13`.
- [ ] **Step 5: Run** `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`, and `python3 scripts/globe/page-check.py` — Expected: all pass.
- [ ] **Step 6: Commit** — `Plan 74: plain pages where the globe cannot run; notes`.

---

## Self-review notes

- Spec coverage: shared globe, scenes, stage hosting, failure behaviour (Task 2); page padding, tap mode, home view (Task 1); globe sizes and raised-to-top drawers (Tasks 2–4); tapping a country per tab (Tasks 2–4); Explore general and country (Task 3); Profile, visited storage, Settings (Task 4); fallbacks, e2e, docs (Task 5); motion and announcements ride with each panel.
- Not built, per spec: real curated trips, sharing an itinerary, city pages, photos, syncing visited countries, deriving them from past trips, Feed on the globe.
- Cannot be verified here: the feel on a phone. The map page is checked in desktop Chrome by `scripts/globe/page-check.py`.
