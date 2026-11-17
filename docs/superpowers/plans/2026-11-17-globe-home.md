# Globe Home, Create-a-Trip on the Globe, and Black & White Theme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Trips tab a globe with a trip-list drawer, create trips in four steps on that globe, and add a default black and white theme.

**Architecture:** A new `mono` theme in `packages/ui`. The owner's MapLibre-in-a-WebView globe is ported into a new `packages/globe` and extended with candidate dots, numbered stops and camera fits. The Trips tab hosts one persistent globe; a non-modal drawer holds the trip list, and the create flow swaps the drawer's content through four steps driven by a pure reducer. Naming, day-split and stop-date rules are pure functions in `packages/core`; saving is one transaction in `packages/db`.

**Tech Stack:** Expo SDK 58, Expo Router, React Native 0.88, Reanimated 4, Gesture Handler 3, `react-native-webview` (new), MapLibre GL JS 5.24.1 (bundled), Drizzle on expo-sqlite, Vitest (packages), Jest/jest-expo (mobile).

**Spec:** `docs/superpowers/specs/2026-11-17-globe-home-design.md` — read it first; this plan argues from it.

**Source to port:** `~/Documents/POCs/globechk/globe-test` on the owner's computer (outside the repo).

## Global Constraints

- Add the native package only with `EXPO_OFFLINE=1 npx expo install react-native-webview` inside `apps/mobile`; list it in `apps/mobile/native-packages.json`; `pnpm check:native` must pass.
- **Never import `react-native-webview` or `@travelog/globe`'s component at module top level in the app.** Its native module is looked up at import time and throws where it is missing. Load it with `require` behind `hasGlobe()` (Task 4).
- Where `hasGlobe()` is false, the Trips tab renders today's list and both create buttons open `/new-trip` as today.
- Colours only from `useTheme()` / `themeFor`; no hex colours or `fontWeight` in app chrome; fonts from `font(role, weight)`; every text pair ≥ 4.5:1; no violet (OKLCH hue 270–330°).
- Motion only through `apps/mobile/src/ui/motion.tsx` (`MOTION`, `useMotionOk`); transform and opacity only; with Reduce motion on, slides/pops/shakes/draws become fades or instant changes and camera moves jump.
- Money in integer minor units; times in UTC with the trip's zone; dates as `YYYY-MM-DD` local dates.
- No server change and no local schema migration. If one turns out to be needed, stop and raise it.
- Never name reference apps in docs, code, comments or commits.
- Earlier files in `docs/plans/` are never edited; this work adds `65-`, `66-`, `67-` (same shape as `docs/plans/52-hero-art.md`) and rows in `docs/plans/README.md`.
- Trip length is counted in days with both ends included: 2027-03-12 → 2027-03-18 is **7** days.
- Exact copy: "Where to?", "Tap the globe or search", "Let's go →", "When?", "Pick your stops", "Next →", "Create trip", "Create a trip", "Your trips", "All days placed", "{n} day(s) left to place", "{n} day(s) too many", "{placed} of {total} days", "No stops in {Country}, so it's left out".
- Before each commit: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.
- Commits end with the session's attribution lines.

## Review Focus

1. **Web view module missing (the owner's current development build):** the Trips tab shows the list, create opens the old form, nothing throws at import. → Task 4 test.
2. **Dates crossing a month or year end (28 Dec → 3 Jan):** stop dates, the 7-day count and the "{Month} Trip" fallback (month of the first day) stay right. → Task 6 tests.
3. **A picked city whose country row is not on the phone, or is a territory drawn under a parent (RE → FR):** the trip still saves; currency falls back to the profile's home currency; the country name falls back to the globe's country list. → Task 7 test.
4. **The same city reached twice (tapped dot, then found by search; or the server returns the same `gn:` id):** one stop, not two. → Task 8 reducer test.
5. **The globe fails to start or its process is killed mid-flow:** picks made so far survive the reload, and every step can be finished by search and buttons alone. → Task 9 test.

## File Structure

```
packages/ui/src/themes.ts, tokens.ts               modify  mono theme
packages/globe/                                     create  ported globe
  package.json, tsconfig.json
  src/index.ts                                      exports
  src/GlobeMap.tsx                                  component (ported + new props)
  src/globeHtml.ts                                  map page (ported + new layers)
  src/payload.ts                                    pure: props → page payload
  src/cities.ts                                     pure: search, top cities, ids
  src/countries.ts                                  pure: country list, code lookups
  src/maplibreAssets.ts, flags.ts                   generated, copied as is
  src/data/cities.json, countries.in.json           data, copied as is
packages/core/src/trip-draft.ts                     create  length, split, stop dates, name, destination
packages/db/src/repo/trips.ts                       modify  createTripWithStops
apps/mobile/src/lib/runtime.ts                      modify  hasGlobe()
apps/mobile/src/lib/globe-theme.ts                  create  Theme → GlobeTheme
apps/mobile/src/lib/create-flow.ts                  create  open/close store shared by tab bar and screen
apps/mobile/src/lib/trip-draft-state.ts             create  reducer for the four steps
apps/mobile/src/lib/trip-draft-save.ts              create  draft → createTripWithStops input
apps/mobile/src/ui/drawer.tsx                       create  non-modal two-height drawer
apps/mobile/src/ui/range-calendar.tsx               create  inline month grid (extracted from date-field.tsx)
apps/mobile/src/components/globe.tsx                create  guarded lazy wrapper around GlobeMap
apps/mobile/src/components/trips-list.tsx           create  list body extracted from (home)/index.tsx
apps/mobile/src/components/create-trip/             create  panel.tsx, step-countries.tsx, step-dates.tsx,
                                                            step-cities.tsx, step-days.tsx
apps/mobile/src/app/(home)/index.tsx, _layout.tsx   modify
```

---

## Part A — Black and white theme (Plan 65)

### Task 1: `mono` theme, default for new installs

**Files:**
- Modify: `packages/ui/src/themes.ts`, `packages/ui/src/tokens.ts` (`THEME_NAMES`)
- Modify: `apps/mobile/src/lib/appearance.tsx` (`DEFAULT_APPEARANCE`), `apps/mobile/src/components/appearance-card.tsx` (`THEME_CARDS`)
- Test: `packages/ui/src/themes.test.ts`, `apps/mobile/src/__tests__/appearance.test.tsx`
- Create: `docs/plans/65-black-and-white-theme.md`; modify `docs/plans/README.md`, `docs/02-design-system.md` (one paragraph naming the third theme)

**Interfaces:**
- Produces: `ThemeName = 'sunset' | 'block' | 'mono'`; `THEME_NAMES = ['sunset', 'block', 'mono']`; `DEFAULT_APPEARANCE = { theme: 'mono', mode: 'system' }`.

- [ ] **Step 1: Write the failing tests**

`themes.test.ts` (the existing contrast/violet loop already covers every name in `THEME_NAMES`; add):
```ts
it('mono is black and white with one ink accent in every area', () => {
  expect(THEME_NAMES).toContain('mono');
  for (const mode of MODES) {
    const l = themeFor('mono', mode, 'light');
    const d = themeFor('mono', mode, 'dark');
    expect([l.bg, l.ink, l.accent, l.onAccent]).toEqual(['#FFFFFF', '#000000', '#000000', '#FFFFFF']);
    expect([d.bg, d.ink, d.accent, d.onAccent]).toEqual(['#000000', '#FFFFFF', '#FFFFFF', '#000000']);
    expect(l.band).toBeNull();
  }
});
```
`appearance.test.tsx`: with no saved setting `readAppearance(db).theme` is `'mono'`; with `appearance.theme = 'sunset'` saved it stays `'sunset'`; the card renders a button labelled `Theme Black & white`.

- [ ] **Step 2: Run** `pnpm --filter @travelog/ui test && pnpm --filter @travelog/mobile test -- appearance` — Expected: FAIL (`mono` unknown).

- [ ] **Step 3: Add `THEMES.mono`** with exactly:

| | light | dark |
|---|---|---|
| grounds (home, plan, trip) | `#FFFFFF` | `#000000` |
| surface / surface2 | `#FFFFFF` / `#F2F2F2` | `#141414` / `#1F1F1F` |
| ink / ink2 / line | `#000000` / `#595959` / `#E0E0E0` | `#FFFFFF` / `#B3B3B3` / `#333333` |
| accents (all three modes) `[accent, soft, on]` | `['#000000', '#EBEBEB', '#FFFFFF']` | `['#FFFFFF', '#2A2A2A', '#000000']` |
| tiles (all five families) `{bg, fg}` | `#EBEBEB` / `#000000` | `#2A2A2A` / `#FFFFFF` |

`band: false`, `inkTabBar: false`, `displaySize: 28`. Status colours (`danger` etc.) stay the shared `STATUS` values. If the contrast test fails on a tab-bar pair, adjust only `surface2`/soft greys, never ink.

- [ ] **Step 4: Update `THEME_NAMES`, `DEFAULT_APPEARANCE.theme`, and add the card** `{ name: 'mono', label: 'Black & white', strip: ['#FFFFFF', '#000000', '#595959', '#E0E0E0'] }` as the first card.

- [ ] **Step 5: Run the two test commands** — Expected: PASS. Run the app's style guard via `pnpm lint`.

- [ ] **Step 6: Write `docs/plans/65-black-and-white-theme.md`, add its README row, commit** — `Plan 65: black and white theme, the default for new installs`.

---

## Part B — Globe package and globe home (Plan 66)

### Task 2: `packages/globe` — port, city and country helpers

**Files:**
- Create: `packages/globe/package.json` (`@travelog/globe`, `main`/`types`: `src/index.ts`, scripts `typecheck`, `test` as in `packages/ui/package.json`; `peerDependencies`: `react`, `react-native`, `react-native-webview`), `packages/globe/tsconfig.json` (copy `packages/ui`'s, add `"resolveJsonModule": true, "jsx": "react-jsx"`)
- Create by copying from the source folder, unchanged: `GlobeMap.tsx`, `globeHtml.ts`, `maplibreAssets.ts`, `flags.ts` → `src/`; `cities.json`, `countries.in.json` → `src/data/`. Do **not** copy `countries.json`, `App.tsx`, `index.ts`, assets.
- Create: `src/cities.ts` (from `cityData.ts`), `src/countries.ts`, `src/index.ts`
- Test: `packages/globe/src/cities.test.ts`, `packages/globe/src/countries.test.ts`
- Modify: `apps/mobile/package.json` (add `"@travelog/globe": "workspace:*"`, and `react-native-webview` via `expo install`), `apps/mobile/native-packages.json` (`"react-native-webview": "Expo Go SDK 58; the development build needs a rebuild (Plan 66)"`), `apps/mobile/assets/licenses.json` via `pnpm licenses:build` (MapLibre GL JS BSD-3-Clause, Natural Earth public domain, flags as found in the source folder's README/LICENSE)

**Interfaces:**
- Produces (`src/cities.ts`):
  - `type City = { id: string; name: string; countryCode: string; region?: string; lat: number; lng: number }`
  - `searchCities(query: string, limit?: number): City[]` (ported unchanged)
  - `topCities(countryCode: string, limit?: number, minGapKm?: number): City[]` — defaults 8 and 40
  - `cityById(id: string): City | undefined`
  - `cityPlaceId(city: City): string` → `` `gn:${city.id}` ``
  - `countryCodeOnGlobe(countryCode: string): string`, `foldText(text: string): string` (ported)
- Produces (`src/countries.ts`):
  - `type CountryInfo = { iso: string; name: string; countryCode?: string; flag?: string; alt?: string }`
  - `getCountryList(): CountryInfo[]`, `countryByCode(a2: string): CountryInfo | undefined`, `countryByIso(iso3: string): CountryInfo | undefined`, `searchCountries(query: string, limit?: number): CountryInfo[]` (name starts-with first, then contains; the logic now in the source `App.tsx`)
- Removes: the `worldview` prop and `'default'` data. `GlobeMap` always loads `countries.in.json`.

- [ ] **Step 1: Copy the files** (the source is mounted read-only for the session as the `globe-test` folder) and scaffold the package. If the flags' source and licence cannot be established from the source folder, export `FLAGS = {}` from `flags.ts`, delete the data, and note it in Plan 66.

- [ ] **Step 2: Write the failing tests**
```ts
// cities.test.ts
it('finds cities by prefix, largest first, accents folded', () => {
  expect(searchCities('sao')[0].name).toBe('São Paulo');
  expect(searchCities('york').some((c) => c.name === 'New York City')).toBe(true);
  expect(searchCities('t')).toEqual([]); // under 2 letters
});
it('top cities are the largest in the country, spaced apart', () => {
  const jp = topCities('JP');
  expect(jp[0].name).toBe('Tokyo');
  expect(jp).toHaveLength(8);
  expect(jp.every((c) => c.countryCode === 'JP')).toBe(true);
  for (const a of jp) for (const b of jp) if (a !== b) expect(distanceKm(a, b)).toBeGreaterThanOrEqual(40);
  expect(topCities('SG')).toHaveLength(1);
  expect(topCities('ZZ')).toEqual([]);
});
it('ids match the app place ids', () => {
  expect(cityPlaceId(searchCities('tokyo')[0])).toBe('gn:1850147');
  expect(cityById('1850147')?.name).toBe('Tokyo');
});
// countries.test.ts
it('looks countries up both ways and searches by name', () => {
  expect(countryByCode('JP')?.iso).toBe('JPN');
  expect(countryByIso('JPN')?.countryCode).toBe('JP');
  expect(searchCountries('sing')[0].name).toBe('Singapore');
});
```
(`distanceKm` is a local test helper; use `@travelog/core`'s geo helper in the implementation if one fits, else haversine inline.)

- [ ] **Step 3: Run** `pnpm --filter @travelog/globe test` — Expected: FAIL (functions missing).
- [ ] **Step 4: Implement `cities.ts` and `countries.ts`.** Keep the lazy `require` of `cities.json`; build a by-country index on first `topCities` call.
- [ ] **Step 5: Run** the package tests, then `pnpm install && pnpm check:native && pnpm typecheck` — Expected: PASS; `check:native` prints one more native package.
- [ ] **Step 6: Commit** — `Plan 66: the globe as a package, with city and country lookups`.

### Task 3: Map page and component — candidates, numbered stops, camera fits, theme

**Files:**
- Modify: `packages/globe/src/globeHtml.ts`, `packages/globe/src/GlobeMap.tsx`
- Create: `packages/globe/src/payload.ts`
- Test: `packages/globe/src/payload.test.ts`

**Interfaces:**
- Produces (`GlobeMap` props, added to the ported ones):
  - `candidates?: Place[]` — hollow tappable dots, drawn under stops
  - `stops?: Place[]` — ordered; each drawn as a filled pin showing its 1-based number, joined in order by the dashed great-circle line (when given, `route` is ignored)
  - `countryTapEnabled?: boolean` (default `true`)
  - `reduceMotion?: boolean` (default `false`) — camera moves jump, the route appears whole
  - `onCandidatePress?: (place: Place) => void`; `onPlacePress` fires for a tapped stop
  - `imageryUrl` default becomes `''`; `benchmark` default stays `false`
- Produces (`GlobeMapHandle`, added): `fitStops(): void`, `fitCountries(isos: string[]): void`
- Produces (`payload.ts`): `globePayload(p: { visited?: string[]; places?: Place[]; route?: {lat:number;lng:number}[]; candidates?: Place[]; stops?: Place[] }): string` — stable JSON; a candidate whose `id` is also a stop is left out of `candidates`.
- Page API (`window.globe`), added: `setCountryTap(on)`, `setReduceMotion(on)`, `fitPoints(points)`, `fitCountries(isos)`; `setData` accepts `candidates` and `stops`. New message: `{ type: 'candidate', id, name, lat, lng }`.
- Behaviour: when `stops` grows by one, the new leg animates from the previous stop over 400 ms (skipped with reduce motion); camera moves 600–900 ms and stop on touch; theme colours are still baked into the page (a theme change rebuilds it — acceptable per spec).

- [ ] **Step 1: Write the failing test**
```ts
it('drops candidates that are already stops and keeps stop order', () => {
  const tokyo = { id: '1850147', name: 'Tokyo', lat: 35.69, lng: 139.69 };
  const kyoto = { id: '1857910', name: 'Kyoto', lat: 35.02, lng: 135.75 };
  const out = JSON.parse(globePayload({ candidates: [tokyo, kyoto], stops: [kyoto] }));
  expect(out.candidates.map((c) => c.id)).toEqual(['1850147']);
  expect(out.stops.map((s) => s.id)).toEqual(['1857910']);
  expect(out.visited).toEqual([]);
});
it('is stable for equal input', () => {
  expect(globePayload({ stops: [] })).toBe(globePayload({}));
});
```
- [ ] **Step 2: Run** `pnpm --filter @travelog/globe test` — Expected: FAIL.
- [ ] **Step 3: Implement `payload.ts`; switch `GlobeMap` to it; add the props, handle methods and the `candidate` message.**
- [ ] **Step 4: Extend the page:** a `candidates` GeoJSON source with a circle layer (hollow, theme `pin` stroke) and a label layer; a `stops` source whose label images carry the number (reuse `labelImage`); `fitPoints`/`fitCountries` with `fitBounds` and the same latitude clamp the page already uses; `setCountryTap` gating the country click handler; route draw by revealing the last leg over time.
- [ ] **Step 5: Run** package tests and `pnpm typecheck` — Expected: PASS.
- [ ] **Step 6: Verify on a phone in Expo Go** with a temporary screen: dots tap, stops number, a third stop animates its leg, `fitStops` frames all, country taps stop when disabled. Remove the temporary screen.
- [ ] **Step 7: Commit** — `Plan 66: globe shows candidate cities, numbered stops and fits the route`.

### Task 4: Trips tab — globe on top, trip list in a drawer

**Files:**
- Modify: `apps/mobile/src/lib/runtime.ts`, `apps/mobile/src/app/(home)/index.tsx`, `apps/mobile/src/app/(home)/_layout.tsx`
- Create: `apps/mobile/src/lib/globe-theme.ts`, `apps/mobile/src/lib/create-flow.ts`, `apps/mobile/src/components/globe.tsx`, `apps/mobile/src/components/trips-list.tsx`, `apps/mobile/src/ui/drawer.tsx`
- Test: `apps/mobile/src/__tests__/globe-home.test.tsx`, `apps/mobile/src/__tests__/drawer.test.tsx`; add a `react-native-webview` mock to `jest.setup.js` (a `View` that records `injectJavaScript` calls)

**Interfaces:**
- Produces:
  - `hasGlobe(): boolean` in `lib/runtime.ts` — `TurboModuleRegistry.get('RNCWebViewModule') != null`
  - `globeThemeFor(name: ThemeName): GlobeTheme` — built from `themeFor(name, 'home', 'dark')` so the globe always sits on a dark ground: `space: bg`, `ocean: surface2`, `land: ink2`, `visited: ink`, `border: bg`, `pin: ink`, `route: ink`, `rim`: `ink2` as `'r,g,b'`
  - `useCreateFlow(): { open: boolean; start(): void; close(): void }` (module-level store read with `useSyncExternalStore`)
  - `<Globe ref {...GlobeMapProps} />` in `components/globe.tsx` — `require('@travelog/globe')` inside the component file behind `hasGlobe()`; renders `null` otherwise. Sets `accessibilityLabel="Globe"`, passes `active`, `reduceMotion={!useMotionOk()}`, `theme`.
  - `<TripsList />` — the live card, filter, cards, empty state and footnote now in `(home)/index.tsx`, unchanged in content
  - `<Drawer heights={[low, high]} index onIndexChange header>{children}</Drawer>` — non-modal; pan on the header follows the finger and springs to the nearer height (`withSpring`, no overshoot: `overshootClamping: true`); content scrolls only at the high position; exposes `progress: SharedValue<number>` (0 low → 1 high) through a render prop or context for the globe's scale; handle has `accessibilityRole="button"`, label "Expand trip list" / "Collapse trip list"; with Reduce motion it jumps.
- Screen: when `hasGlobe()` is false, render exactly today's screen with `<TripsList />`. Otherwise: `<Globe>` filling the area above the low drawer height; drawer low height ≈ 45 % of the window, high ≈ 88 %; header row "Your trips" + button "Create a trip"; the globe view scales to 0.92 as `progress` → 1 and `active` is false when the tab is unfocused or the drawer is high.
- Both create buttons (drawer header and tab-bar centre): `hasGlobe() ? flow.start() : router.push('/new-trip')`. `_layout.tsx` returns no tab bar while `flow.open`.

- [ ] **Step 1: Write the failing tests**
  - `globe-home.test.tsx`: (a) with the native module absent (`hasGlobe` mocked false): the screen renders "Your trips", no element labelled "Globe", pressing "Plan a trip"/"Create a trip" pushes `/new-trip`, and `jest.isolateModules(() => require('@/app/(home)/index'))` does not throw when `react-native-webview` is mocked to throw on import; (b) with it present: an element labelled "Globe" and a button "Create a trip" exist, pressing it sets `useCreateFlow().open` to `true` and the tab bar is not rendered.
  - `drawer.test.tsx`: starts at index 0; pressing the handle calls `onIndexChange(1)`; the handle's label flips.
- [ ] **Step 2: Run** `pnpm --filter @travelog/mobile test -- globe-home drawer` — Expected: FAIL.
- [ ] **Step 3: Implement** `hasGlobe`, `globeThemeFor`, `create-flow.ts`, `components/globe.tsx`, `trips-list.tsx`, `ui/drawer.tsx`, then the screen and layout.
- [ ] **Step 4: Run** the tests, `pnpm lint`, `pnpm typecheck` — Expected: PASS.
- [ ] **Step 5: Verify in Expo Go:** globe spins, drawer drags between two heights, list scrolls only when raised, all three themes, light and dark, Reduce motion on.
- [ ] **Step 6: Record** `node scripts/check-bundle-size.mjs` output after `pnpm --filter @travelog/mobile export:android`; write `docs/plans/66-globe-home.md` (include the size, and **"a new development build is needed; until then the installed build shows the list as before"**), README row, commit — `Plan 66: the Trips tab is a globe with the trip list in a drawer`.

---

## Part C — Create a trip on the globe (Plan 67)

### Task 5: Inline range calendar

**Files:**
- Create: `apps/mobile/src/ui/range-calendar.tsx`
- Modify: `apps/mobile/src/ui/date-field.tsx` (`CalendarSheet` renders `RangeCalendar` for its month grid; behaviour unchanged)
- Test: `apps/mobile/src/__tests__/date-field.test.tsx` (existing must stay green), `apps/mobile/src/__tests__/range-calendar.test.tsx`

**Interfaces:**
- Produces: `<RangeCalendar start={string} end={string} onChange={(start: string, end: string) => void} />` — `''` for unset; first tap sets start and clears end; a later tap on or after start sets end; a tap before start moves start; month paging as `CalendarSheet` has today; day buttons ≥ 44 pt with `accessibilityState.selected`.

- [ ] **Step 1: Failing test:** render with `start=''`; press "12" then "18" in March 2027 → `onChange` last called with `('2027-03-12', '2027-03-18')`; press "10" after only start is set → `('2027-03-10', '')`.
- [ ] **Step 2: Run** `pnpm --filter @travelog/mobile test -- range-calendar date-field` — FAIL.
- [ ] **Step 3: Extract** the grid from `CalendarSheet` into `RangeCalendar`; keep `CalendarSheet`'s props.
- [ ] **Step 4: Run** — PASS. **Step 5: Commit** — `Plan 67: a calendar that can sit inside a panel`.

### Task 6: Trip-draft rules in `packages/core`

**Files:**
- Create: `packages/core/src/trip-draft.ts`; modify `packages/core/src/index.ts` (`export * from './trip-draft'`)
- Test: `packages/core/src/trip-draft.test.ts`

**Interfaces:**
- Produces:
```ts
export interface DraftStop { placeId: string; name: string; countryCode: string; days: number }
export interface DraftCountry { code: string; name: string; continent: string | null }
export function tripLengthDays(start: string, end: string): number;              // both ends included
export function splitStatus(stops: readonly DraftStop[], totalDays: number):
  { placed: number; left: number; state: 'under' | 'exact' | 'over' };
/** What the person sees per stop: first and last day, both included. */
export function stopDays(stops: readonly DraftStop[], start: string): { first: string; last: string }[];
/** What is saved per stop (existing convention, core/whereabouts.ts: nights from startDate up to, not including, endDate). */
export function stopRows(stops: readonly DraftStop[], start: string, end: string):
  { placeId: string; startDate: string; endDate: string }[];
export function autoTripName(stops: readonly DraftStop[], countries: readonly DraftCountry[], start: string): string;
export function tripDestination(stops: readonly DraftStop[], countries: readonly DraftCountry[]):
  { destination: string; destinationPlaceId: string | null };
```
- `countries` is always the countries of the picked stops, unique, in first-appearance order.
- `stopRows`: stop *i* gets `startDate = first day`, `endDate = next stop's first day`; the last stop's `endDate` is the trip's `end`. Step 1 includes a `whereabouts` test; if the trip's last day does not resolve to the last city with that rule, make the last stop's `endDate` `addDays(end, 1)` and keep the test.

- [ ] **Step 1: Write the failing tests**
```ts
const tokyo = { placeId: 'gn:1850147', name: 'Tokyo', countryCode: 'JP', days: 3 };
const seoul = { placeId: 'gn:1835848', name: 'Seoul', countryCode: 'KR', days: 4 };
const JP = { code: 'JP', name: 'Japan', continent: 'Asia' };
const KR = { code: 'KR', name: 'South Korea', continent: 'Asia' };
const FR = { code: 'FR', name: 'France', continent: 'Europe' };

it('counts both ends', () => {
  expect(tripLengthDays('2027-03-12', '2027-03-18')).toBe(7);
  expect(tripLengthDays('2027-03-12', '2027-03-12')).toBe(1);
  expect(tripLengthDays('2026-12-28', '2027-01-03')).toBe(7);
});
it('reports under, exact and over', () => {
  expect(splitStatus([tokyo, seoul], 7)).toEqual({ placed: 7, left: 0, state: 'exact' });
  expect(splitStatus([tokyo], 7)).toEqual({ placed: 3, left: 4, state: 'under' });
  expect(splitStatus([{ ...tokyo, days: 5 }, seoul], 7)).toEqual({ placed: 9, left: -2, state: 'over' });
});
it('gives each stop its days, across a year end', () => {
  expect(stopDays([tokyo, seoul], '2027-03-12')).toEqual([
    { first: '2027-03-12', last: '2027-03-14' }, { first: '2027-03-15', last: '2027-03-18' }]);
  expect(stopDays([tokyo, seoul], '2026-12-28')[1]).toEqual({ first: '2026-12-31', last: '2027-01-03' });
});
it('saves stops the way the trip screens read them', () => {
  const rows = stopRows([tokyo, seoul], '2027-03-12', '2027-03-18');
  expect(rows[0]).toEqual({ placeId: 'gn:1850147', startDate: '2027-03-12', endDate: '2027-03-15' });
  expect(rows[1].startDate).toBe('2027-03-15');
  // whereabouts() over these rows: 12–14 → Tokyo, 15–18 → Seoul (build its inputs as whereabouts.test.ts does)
});
it('names the trip by the owner\'s rule', () => {
  expect(autoTripName([tokyo], [JP], '2027-03-12')).toBe('Tokyo trip');
  expect(autoTripName([tokyo, { ...tokyo, placeId: 'gn:1857910', name: 'Kyoto' }], [JP], '2027-03-12')).toBe('Japan Trip');
  expect(autoTripName([tokyo, seoul], [JP, KR], '2027-03-12')).toBe('Exploring Asia');
  expect(autoTripName([tokyo, { ...seoul, countryCode: 'FR' }], [JP, FR], '2027-03-12')).toBe('March Trip');
  expect(autoTripName([tokyo, seoul], [JP, { ...KR, continent: null }], '2026-12-28')).toBe('December Trip');
});
it('writes the destination', () => {
  expect(tripDestination([tokyo], [JP])).toEqual({ destination: 'Tokyo, Japan', destinationPlaceId: 'gn:1850147' });
  expect(tripDestination([tokyo, seoul], [JP, KR])).toEqual({ destination: 'Tokyo, Seoul', destinationPlaceId: 'cont:AS' });
  expect(tripDestination([tokyo, { ...seoul, countryCode: 'FR' }], [JP, FR]).destinationPlaceId).toBeNull();
});
```
For two cities in one country `destinationPlaceId` is `ctry:JP`. Continent ids follow the phone's `cont:` rows (`cont:AS` for Asia); map by the continent name the country rows carry, reading the pairs from `apps/mobile/assets/places/basic.places`.
- [ ] **Step 2: Run** `pnpm --filter @travelog/core test -- trip-draft` — FAIL.
- [ ] **Step 3: Implement** with `addDays`/`daysBetween` from `./dates`; month name via `Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' })`.
- [ ] **Step 4: Run** — PASS. **Step 5: Commit** — `Plan 67: trip length, day split, stop dates and the automatic trip name`.

### Task 7: Save a trip with its stops in one transaction

**Files:**
- Modify: `packages/db/src/repo/trips.ts` (export from `packages/db/src/index.ts` if repos are listed there)
- Create: `apps/mobile/src/lib/trip-draft-save.ts`
- Test: `packages/db/src/repo.test.ts` (or a new `packages/db/src/trip-with-stops.test.ts`), `apps/mobile/src/__tests__/trip-draft-save.test.ts`

**Interfaces:**
- Consumes: `stopRows`, `tripDestination` (Task 6); `City`, `cityPlaceId`, `countryByCode`, `countryCodeOnGlobe` (Task 2); `getPlace`, `savePlaces`, `createTrip`, `addStop`.
- Produces:
  - `createTripWithStops(db: Db, input: TripInput, me: { displayName: string; upiId?: string | null }, stops: readonly { placeId: string; startDate: string; endDate: string }[], places: readonly Place[]): Trip` — one `tx`: `savePlaces(places)`, `createTrip`, then `addStop({ tripId, kind: 'stay', ... })` per stop. Any throw rolls all of it back.
  - `draftToSave(db: Db, draft: { name: string; startDate: string; endDate: string; cities: readonly City[]; days: Record<string, number> }, profile: { homeCurrency?: string | null }): { input: TripInput; stops: ...; places: Place[] }` — builds a `Place` (`kind: 'city'`, `source: 'geonames'`, `population: 0`, `boost: 0`) for each city not already returned by `getPlace`; country name, continent and currency come from `getPlace(db, 'ctry:' + countryCodeOnGlobe(code))`, falling back to `countryByCode(...)?.name`, `null` continent and `profile.homeCurrency ?? 'INR'`; `timeZone` is the first city's place zone if the phone has it, else `deviceTimeZone()`; `emoji: 'trips'`.

- [ ] **Step 1: Failing tests**
  - db: `createTripWithStops` with two stops → `listStops(db, trip.id)` has 2 `stay` rows in order with the given dates, `getPlace(db, 'gn:1850147')?.name === 'Tokyo'`, one owner member; with a second stop whose `endDate < startDate` → throws and `listTrips(db)` is empty.
  - mobile: `draftToSave` for Tokyo 3 + Seoul 4, 12–18 March → `input.title` as given, `input.currency === 'JPY'`, `stops` equals `stopRows(...)`, `places` has both cities with `lat`/`lng`; for a city with `countryCode: 'RE'` and no `ctry:RE` row → `countryName` is France's (via `FR`), no throw; for a country with no row at all → currency is the profile's.
- [ ] **Step 2: Run** `pnpm --filter @travelog/db test && pnpm --filter @travelog/mobile test -- trip-draft-save` — FAIL.
- [ ] **Step 3: Implement both.** **Step 4: Run** — PASS. **Step 5: Commit** — `Plan 67: a trip and its stops are saved together`.

### Task 8: Flow state (reducer)

**Files:**
- Create: `apps/mobile/src/lib/trip-draft-state.ts`
- Test: `apps/mobile/src/__tests__/trip-draft-state.test.ts`

**Interfaces:**
- Produces:
```ts
export type Step = 'countries' | 'dates' | 'cities' | 'days';
export interface DraftState {
  step: Step;
  countries: string[];            // alpha-2 as drawn on the globe, pick order
  cities: City[];                 // visit order
  startDate: string; endDate: string;   // '' when unset
  days: Record<string, number>;   // by city id; missing = 1
  name: string | null;            // null = automatic
  dropped: string[];              // country codes left out on entering 'days'
}
export type DraftAction =
  | { type: 'toggleCountry'; code: string } | { type: 'addCity'; city: City } | { type: 'toggleCity'; city: City }
  | { type: 'setDates'; start: string; end: string } | { type: 'setDays'; cityId: string; days: number }
  | { type: 'setName'; name: string } | { type: 'next' } | { type: 'back' };
export const emptyDraft: DraftState;
export function draftReducer(s: DraftState, a: DraftAction): DraftState;
export function canGoNext(s: DraftState): boolean;
```
- Rules: removing a country removes its cities and their `days`; `addCity` adds its country (through `countryCodeOnGlobe`) and is a no-op for a city id already present; `toggleCity` removes if present else `addCity`; `setDays` clamps to ≥ 1; `setName('')` returns `name` to `null`; `next` from `cities` sets `dropped` to countries with no city and removes them; `back` from `days` → `cities` → `dates` → `countries`; `canGoNext`: ≥ 1 country / both dates / ≥ 1 city / `splitStatus(...).state === 'exact'`.

- [ ] **Step 1: Failing tests** covering each rule above, including: `addCity(tokyo)` twice → one city; `addCity` with the same id from a server result object (different object, same `id`) → one city; removing `JP` drops Tokyo and `days['1850147']`; `next` from `cities` with JP (Tokyo) and KR (none) → `countries: ['JP']`, `dropped: ['KR']`, `step: 'days'`; `setDays(id, 0)` → 1; `canGoNext` on `days` false at 5 of 7 and at 9 of 7, true at 7 of 7.
- [ ] **Step 2: Run** `pnpm --filter @travelog/mobile test -- trip-draft-state` — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS. **Step 5: Commit** — `Plan 67: the create flow's state`.

### Task 9: The four steps on the globe

**Files:**
- Create: `apps/mobile/src/components/create-trip/panel.tsx`, `step-countries.tsx`, `step-dates.tsx`, `step-cities.tsx`, `step-days.tsx`
- Modify: `apps/mobile/src/app/(home)/index.tsx`
- Test: `apps/mobile/src/__tests__/create-trip.test.tsx`

**Interfaces:**
- Consumes: `draftReducer`, `canGoNext`, `emptyDraft` (Task 8); `Globe` + `useCreateFlow` + `Drawer` (Task 4); `RangeCalendar` (Task 5); `tripLengthDays`, `splitStatus`, `stopDays`, `autoTripName` (Task 6); `draftToSave`, `createTripWithStops` (Task 7); `searchCountries`, `searchCities`, `topCities`, `countryByIso`, `countryByCode`, `getCountryList` (Task 2); the place-search hook `PlaceField` uses in `lib/places.ts`; `useCelebrate`, `tripHref`.
- Produces: `<CreateTripPanel draft dispatch onClose onCreate />` rendering a header (back arrow labelled "Back", title, subtitle) and the step body; the screen maps `draft` to globe props:

| Step | `visitedCountries` | `candidates` | `stops` | `countryTapEnabled` | camera on entry |
|---|---|---|---|---|---|
| countries | picked (as iso3) | — | — | true | `focusCountry` on each add |
| dates | picked | — | — | false | `fitCountries(picked)` |
| cities | picked | `topCities` of each picked country | picked cities | false | `fitCountries(picked)`; country chips call `focusCountry` |
| days | picked | — | picked cities | false | `fitStops()` |

- Step bodies:
  - **countries:** search field ("Search a country or city") → results: countries (`searchCountries`, tag "Country"/"Added") then cities (`searchCities`, tag "City"); country chips with remove (label "Remove {name}"); hint "Tap a country on the globe, or type one. Typing a city adds it straight away." when empty; "Let's go →" when `canGoNext`. `onCountryPress` from the globe dispatches `toggleCountry` with the tapped country's alpha-2.
  - **dates:** `RangeCalendar`; a line "{range} · {n} days" once both are set, else "Tap the first day" / "Now tap the last day"; "Next →".
  - **cities:** search field ("Search a city") → bundled results, then server results of kind `city` not already listed (matched by `gn:` id); numbered chips with remove; `onCandidatePress` and `onPlacePress` dispatch `toggleCity`; hint "Tap the cities on the map. Can't see one? Search for it."; "Next →".
  - **days:** trip-name `Field` (value `draft.name ?? autoTripName(...)`); "{placed} of {total} days" and the status line (in `t.danger` when over); one row per stop: number, name, its dates from `stopDays` (in `t.danger` when its last day is after the trip's end), "−" and "+" (labels "One day less in {city}", "One day more in {city}"); a line "No stops in {Country}, so it's left out" per `draft.dropped`; "Create trip" disabled unless `canGoNext`.
- The header subtitle on cities and days shows the dates and day count.
- `onCreate`: `mutate((db) => createTripWithStops(db, ...draftToSave(db, …)))`, `celebrate('Trip created')`, `flow.close()`, `router.push(tripHref(trip))`; on error show `ErrorText` in the panel and stay.
- Back on `countries`, and the Android back button at any step, step back or close; closing discards the draft.
- The draft lives in the screen's `useReducer`, not inside the globe, so a globe reload or failure loses nothing; when `Globe` reports a fatal error the panel stays fully usable.

- [ ] **Step 1: Write the failing test** (web view mocked; drive it through search and buttons only, which also proves the no-globe path): start the flow → type "tok", press "Tokyo" → chip "Japan" appears → "Let's go →" → press 12 then 18 (March 2027) → "Next →" → type "seo", press "Seoul" → chips "1 Tokyo", "2 Seoul" → "Next →" → name field shows "Exploring Asia"; "2 of 7 days", "5 days left to place", "Create trip" disabled → press "One day more in Tokyo" twice and "…in Seoul" three times → "All days placed" → press once more → "1 day too many" and disabled → "One day less in Seoul" → press "Create trip" → `listTrips(db)[0].title === 'Exploring Asia'`, two stops saved, router pushed the trip. Second test: simulate the mock web view's `onContentProcessDidTerminate` mid-flow → chips and step unchanged.
- [ ] **Step 2: Run** `pnpm --filter @travelog/mobile test -- create-trip` — FAIL.
- [ ] **Step 3: Implement the panel and step bodies, then wire the screen** (drawer shows `TripsList` when `!flow.open`, `CreateTripPanel` when open; drawer height animates to fit the step: low for countries and cities, high for dates and days).
- [ ] **Step 4: Run** the test, `pnpm lint`, `pnpm typecheck` — PASS.
- [ ] **Step 5: Verify in Expo Go:** the whole flow by tapping the globe only; then by search only; offline (airplane mode) end to end; a one-city trip names itself "{City} trip".
- [ ] **Step 6: Commit** — `Plan 67: create a trip on the globe`.

### Task 10: Motion and accessibility pass, docs

**Files:**
- Modify: `apps/mobile/src/ui/motion.tsx` (add haptic kind `'warning'` → `Haptics.notificationAsync(Warning)`), the `create-trip/*` files, `apps/mobile/src/app/(home)/index.tsx`
- Test: `apps/mobile/src/__tests__/create-trip.test.tsx` (extend), `apps/mobile/src/__tests__/celebrations.test.tsx` if it lists haptic kinds
- Create: `docs/plans/67-create-trip-on-the-globe.md`; modify `docs/plans/README.md`, `docs/13-development-plan.md` (current-phase note), `docs/07-open-items.md` (border review before launch; whether flags are wanted; date-less trips in the globe flow; drag to reorder stops; removing `/new-trip` after the new build)

**Interfaces:**
- Consumes: `MOTION`, `useMotionOk`, `CountUp`, `haptic` (existing).

- [ ] **Step 1: Failing tests:** adding a city announces "Tokyo added, stop 1" (`AccessibilityInfo.announceForAccessibility` spied); going over calls `haptic('warning')` once per crossing, reaching exact calls `haptic('success')`; with Reduce motion mocked on, the step body has no entering animation prop.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement:**
  - step change: outgoing body fades, incoming fades and slides 16 pt, `MOTION.base`+30 (250 ms); panel height animates over `MOTION.slow`;
  - chips and stop rows: `Appear`; a picked chip scales 0.9 → 1 (`MOTION.fast`) with `haptic('light')`;
  - day count: `CountUp`; total line shakes once (±6 pt, 3 swings, 300 ms) on crossing into over;
  - `haptic('select')` on − / +;
  - on create: `globe.fitStops()` then the celebration;
  - Reduce motion: fades only, no shake, no slide.
- [ ] **Step 4: Run** all checks: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` — PASS.
- [ ] **Step 5: Verify on a phone** with a screen reader on and with Reduce motion on; in all three themes.
- [ ] **Step 6: Write Plan 67, the README row and the doc notes; commit** — `Plan 67: motion, announcements and notes for the globe flow`.

---

## Self-review notes

- Spec coverage: theme (Task 1); screen and drawer, fallback build, tab bar (Task 4); steps 1–4, name rule, dropped countries, dates required (Tasks 5–9); saving, places rows, currency/zone (Tasks 6–7); globe package, look, borders, additions, reload (Tasks 2–4, 9); motion and accessibility (Tasks 4, 10); licences, size, plan log, open items (Tasks 2, 4, 10).
- Not built, per spec: date-less trips, drag to reorder, home-globe pins for existing trips, removal of `/new-trip`, theme change without a page rebuild.
