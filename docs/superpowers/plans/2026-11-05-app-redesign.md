# App Redesign (Sunset + Colour block) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the phone app with two switchable themes (Sunset, Colour block), a Light / Dark / Match phone setting, loaded fonts, one button/card system, no violet and ≥4.5:1 contrast. Screens and navigation stay the same.

**Architecture:**
- Theme data and colour maths live in `packages/ui`, where they are pure and Vitest-tested. `themeFor(themeName, mode, scheme)` returns one flat `Theme` object.
- The app reads the saved choice through an `AppearanceProvider`, backed by the device settings table. `useTheme()` combines it with the mode context.
- Kit components (`ui/kit.tsx`, `ui/tab-bar.tsx`) draw everything from `Theme`, so most screens change without edits.

**Tech Stack:**
- Expo SDK 58 and React Native, with React Compiler on.
- `expo-font` with `@expo-google-fonts/plus-jakarta-sans` and `@expo-google-fonts/figtree`.
- Vitest for the packages; Jest (jest-expo) with RNTL v14 for the app.

**Spec:** `docs/superpowers/specs/2026-11-05-app-redesign-design.md`. It holds every hex value; tasks reference its sections rather than repeating tables.

## Global Constraints

- **No violet:** no app-chrome colour may have OKLCH hue 270–330° at chroma > 0.02. Collage content (`components/studio/*` canvas, templates, swatches, stickers) is exempt.
- **Contrast:** every text or label pair must be ≥ 4.5:1, for each theme × {light, dark} × {home, plan, trip}.
- **No native code:** packages are added only with `EXPO_OFFLINE=1 npx expo install <pkg>` inside `apps/mobile`. Everything must run in Expo Go.
- **Fonts on Android:** never set `fontWeight` together with a custom font family. Each weight is its own family name: `PlusJakartaSans_700Bold`, `PlusJakartaSans_800ExtraBold`, `Figtree_400Regular`, `Figtree_500Medium`, `Figtree_600SemiBold`.
- **Defaults:** theme `sunset`, mode `system` (Match phone). Settings keys are `appearance.theme` (`sunset` | `block`) and `appearance.mode` (`light` | `dark` | `system`).
- **Trip mode** follows the scheme. The collage editor and export screens are always dark.
- **Never name reference apps** in code, comments or commits (CLAUDE.md).
- **Before every commit:** `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.

## Review Focus

1. **A stored setting has an unknown value** (an old build, a typo). The app must fall back to Sunset / Match phone, never crash. → Task 3, `appearance falls back on bad stored values`.
2. **The fonts fail to load** (missing asset, offline Expo Go cache). The app must still open, in the system font. → Task 2, `renders children when fonts fail`.
3. **`useColorScheme()` returns `null`** (Android before the first layout, tests) while the mode is Match phone. Light is expected. → Task 1, `themeFor with null scheme`.
4. **The collage editor opens with theme Colour block and mode Light.** The editor must stay dark, and the canvas colours must be untouched. → Task 3, `studio stays dark in light mode`.
5. **The storage error screen appears before the database opens.** No appearance settings are readable yet, so it must still render, in Sunset. → Task 3, `error screen renders without AppearanceProvider`.

---

### Task 1: Theme data, colour maths and `themeFor`

**Files:**
- Create: `packages/ui/src/color.ts`
  - `contrast(a: string, b: string): number` (WCAG 2.x)
  - `oklch(hex: string): { C: number; H: number }`
  - `isViolet(hex: string): boolean`
- Create: `packages/ui/src/themes.ts`: the raw data for `sunset` and `block`, copied from spec §3.1–3.3
- Modify: `packages/ui/src/tokens.ts`: the `Theme` interface and `themeFor`; remove the old palettes, accents and `categoryColors`
- Modify: `packages/ui/src/index.ts`: export `color` and `themes`
- Test: `packages/ui/src/tokens.test.ts` (rewrite) and `packages/ui/src/themes.test.ts` (new)
- Modify (callers only, so typecheck passes):
  - `apps/mobile/src/ui/theme.tsx`: `themeFor('sunset', mode, useColorScheme())` for now
  - `apps/mobile/src/components/error-screen.tsx`: same call
  - `apps/mobile/src/components/budget-view.tsx`: `t.categories[c]` in place of `categoryColors`

**Interfaces (Produces):**
```ts
export type ThemeName = 'sunset' | 'block';
export type TileFamily = 'sea' | 'clay' | 'mango' | 'leaf' | 'rose';
export type CategoryKey = 'stay' | 'travel' | 'food' | 'activities' | 'shopping' | 'misc';
export interface Theme {
  name: ThemeName; mode: Mode; scheme: Scheme;
  bg: string;            // screen background; for block, the mode colour from spec §3.2
  surface: string; surface2: string; ink: string; ink2: string; line: string;
  mango: string; success: string; danger: string;
  accent: string; accentSoft: string; onAccent: string;
  band: string | null;   // header band fill: accentSoft for sunset, null for block
  tabBar: { bg: string; fg: string; activeBg: string; activeFg: string; line: string | null };
  tiles: Record<TileFamily, { bg: string; fg: string }>;
  categories: Record<CategoryKey, string>;
  displaySize: number;   // 28 sunset, 32 block
}
export function themeFor(name: ThemeName, mode: Mode, scheme: Scheme | null | undefined): Theme;
export const THEME_NAMES: readonly ThemeName[]; // ['sunset', 'block']
```

**Values not spelled out in the spec:**
- **Sunset tab bar:** `bg` = surface; `fg` = ink2; `activeBg` = accentSoft; `activeFg` = accent; `line` = line.
- **Block tab bar:** `bg` = `#141414`; `fg` = `#C9C9C4`; `activeBg` = accent; `activeFg` = onAccent; `line` = null.
- **Categories:** `shopping` uses the rose family's icon colour; `misc` = ink2.
- **Status colours:** `success`, `danger` and `mango` keep today's values per scheme.

- [ ] **Step 1: Write failing tests**
  - `themes.test.ts`, `every theme × scheme × mode passes contrast and has no violet`: loop over `THEME_NAMES` × `['light', 'dark']` × `['home', 'plan', 'trip']`, and assert `contrast(fg, bg) >= 4.5` for each pair:

    | Text | On |
    |---|---|
    | ink, ink2 | bg, surface, surface2 |
    | onAccent | accent |
    | accent | accentSoft |
    | ink, ink2 | band (when set) |
    | tile.fg | tile.bg, for every family |
    | tabBar.fg | tabBar.bg |
    | tabBar.activeFg | tabBar.activeBg |
    | success, danger | surface |

    Also assert `!isViolet(x)` for every string value in the theme.
  - `themes.test.ts`, `color maths`:
    - `contrast('#FFFFFF', '#000000')` ≈ 21;
    - `oklch('#5B5BD6').H` is within 1 of 278.3;
    - `isViolet('#5B5BD6') === true`;
    - `isViolet('#2457D6') === false`.
  - `tokens.test.ts`:
    - `themeFor('sunset', 'home', 'light').bg === '#FFF4EC'`;
    - `themeFor('block', 'plan', 'light').bg === '#C6D9FF'`;
    - `themeFor('sunset', 'trip', 'light').scheme === 'light'` and its `accent === '#9A5600'` (Trip follows the scheme);
    - `themeFor with null scheme` → `scheme === 'light'`;
    - each mode has a distinct accent per theme;
    - `themeFor('block', 'home', 'dark').tabBar.bg === '#141414'`.

- [ ] **Step 2:** Run `pnpm --filter @travelog/ui test`. Expected: FAIL, because the modules and exports don't exist yet.
- [ ] **Step 3:** Implement `color.ts`, `themes.ts` and `themeFor`. The OKLCH maths is the same as `isViolet` in the mock page: sRGB → linear → LMS cube root → OKLab, then hue = atan2(b, a).
- [ ] **Step 4:** Update the three app callers listed above.
- [ ] **Step 5:** Run `pnpm --filter @travelog/ui test && pnpm typecheck`. Expected: PASS. Then run `pnpm test`, and update any app test that asserts an old hex value.
- [ ] **Step 6:** Commit: `feat(ui): Sunset and Colour block themes with contrast and violet test`.

### Task 2: Load the fonts and give each weight its own family

**Files:**
- Modify: `apps/mobile/package.json`. Run `EXPO_OFFLINE=1 npx expo install @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/figtree` in `apps/mobile`.
- Modify: `packages/ui/src/tokens.ts`. `fonts` becomes per-weight family names. Add `font(role: 'display' | 'text', weight: 400 | 500 | 600 | 700 | 800): { fontFamily: string }`, which maps display→Jakarta (700, 800) and text→Figtree (400, 500, 600). Other weights snap to the nearest available one. Rewrite `type` so each style uses `font()` and has no `fontWeight`. Keep the sizes from spec §4: display 28/34, title 20/26, headline 16/22, body 15/22, label 13/18, caption 12/16.
- Create: `apps/mobile/src/lib/fonts.ts`, exporting `FONT_ASSETS`, the `useFonts` map for the five faces.
- Modify: `apps/mobile/src/app/_layout.tsx`. Call `useFonts(FONT_ASSETS)`. Hide the splash screen only when the DB is open **and** the fonts are `loaded || error`. Render the app on font error.
- Modify every non-studio `fontWeight` literal to `...font(role, weight)`. The current list (from `grep -rn fontWeight apps/mobile/src --include=*.tsx`):
  - `bookings-view.tsx:67`
  - `budget-view.tsx:121,234,279`
  - `error-screen.tsx:22,39`
  - `trip-header.tsx:82`
  - `memories-view.tsx:277`
  - `ui/tab-bar.tsx:53,83`
  - `ui/date-field.tsx:243,449`

  `components/studio/*` is collage content and is left as is.
- Test: `apps/mobile/src/__tests__/style-guard.test.ts` (extend), `apps/mobile/src/__tests__/fonts.test.tsx` (new), `packages/ui/src/tokens.test.ts`

- [ ] **Step 1: Write failing tests**
  - `tokens.test.ts`:
    - `font('display', 800).fontFamily === 'PlusJakartaSans_800ExtraBold'`;
    - `font('text', 600).fontFamily === 'Figtree_600SemiBold'`;
    - no `type.*` entry has `fontWeight`.
  - `style-guard.test.ts`, `no fontWeight outside collage content`: scan `src/**/*.tsx`, excluding `__tests__` and `components/studio`, for `fontWeight`, and expect `[]`.
  - `fonts.test.tsx`: every `fontFamily` value produced by `font()` is a key of `FONT_ASSETS`.
  - `fonts.test.tsx`, `renders children when fonts fail`: mock `expo-font`'s `useFonts` to return `[false, new Error('x')]`, render the root layout's font gate, and assert the child text renders and `SplashScreen.hideAsync` was called.

    For this, extract the gate as `export function FontGate({ ready, children })` in `lib/fonts.ts`; `_layout.tsx` uses it.
- [ ] **Step 2:** Run `pnpm test`. Expected: FAIL. The guard lists the files above, and `font`, `FONT_ASSETS` and `FontGate` are missing.
- [ ] **Step 3:** Implement and replace the literals.
- [ ] **Step 4:** Run `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. Expected: PASS.
- [ ] **Step 5:** Run `cd apps/mobile && EXPO_OFFLINE=1 pnpm export:android && node ../../scripts/check-bundle-size.mjs`. Expected: within budget; the font files are assets.
- [ ] **Step 6:** Commit: `feat(mobile): load Plus Jakarta Sans and Figtree; one family per weight`.

### Task 3: Appearance setting, provider and the always-dark collage editor

**Files:**
- Create: `apps/mobile/src/lib/appearance.tsx`

  ```ts
  export type AppearanceMode = 'light' | 'dark' | 'system';
  export interface Appearance { theme: ThemeName; mode: AppearanceMode }
  export const DEFAULT_APPEARANCE: Appearance; // { theme: 'sunset', mode: 'system' }
  export function readAppearance(db: Db): Appearance;           // bad/missing values → defaults
  export function saveAppearance(db: Db, next: Partial<Appearance>): void; // setSetting
  export function AppearanceProvider({ children }: { children: ReactNode }): JSX.Element; // useQuery(readAppearance)
  export function useAppearance(): Appearance;                  // DEFAULT_APPEARANCE outside the provider
  export function resolveScheme(mode: AppearanceMode, system: Scheme | null | undefined): Scheme;
  ```

- Modify: `apps/mobile/src/ui/theme.tsx`
  - `ModeProvider` gains an optional `scheme?: Scheme`, which forces that scheme for everything inside it.
  - `useTheme(modeOverride?)` = `themeFor(appearance.theme, mode, forced ?? resolveScheme(appearance.mode, useColorScheme()))`.
- Modify: `apps/mobile/src/app/_layout.tsx`. Wrap the content in `AppearanceProvider` inside `DataProvider`. The navigation `ThemeProvider` and `StatusBar` use the resolved scheme. Use a small inner component, because the provider needs the data context.
- Modify:
  - `apps/mobile/src/app/trip/[id]/studio/[projectId].tsx`
  - `apps/mobile/src/app/trip/[id]/studio/export.tsx`

  In both, use `<ModeProvider mode="trip" scheme="dark">`.
- Modify: `apps/mobile/src/components/error-screen.tsx`. Use `useTheme('home')` instead of calling `themeFor` directly. It works outside the provider through the defaults.
- Test: `apps/mobile/src/__tests__/appearance.test.tsx` (new)

- [ ] **Step 1: Write failing tests**
  - `appearance falls back on bad stored values`: `setSetting(db, 'appearance.theme', 'neon')` and `setSetting(db, 'appearance.mode', 'dim')`, then `readAppearance(db)` equals `DEFAULT_APPEARANCE`.
  - `saveAppearance round-trips`: save `{ theme: 'block', mode: 'dark' }`, then read it back the same.
  - `resolveScheme`:
    - `('system', null) → 'light'`
    - `('system', 'dark') → 'dark'`
    - `('light', 'dark') → 'light'`
  - `useTheme follows the saved choice`: render a probe that prints `useTheme().bg` inside `withData(db, …, 'plan')`. With `block` + `light` saved, it shows `#C6D9FF`. After `saveAppearance(db, { mode: 'dark' })` through `useMutate`, it shows `#15254A`.
  - `studio stays dark in light mode`: save `block` + `light`, render the editor as in `studio-editor.test.tsx`, and assert the root `SafeAreaView` background equals `themeFor('block', 'trip', 'dark').bg`.
  - `error screen renders without AppearanceProvider`: render `<ErrorScreen error={new Error('x')} retry={…} />` with no providers, and assert the header text is present.

  Check that `testing/test-utils.tsx` `withData` includes `AppearanceProvider`; add it there if it doesn't.
- [ ] **Step 2:** Run `pnpm --filter @travelog/mobile exec jest src/__tests__/appearance`. Expected: FAIL, because the module is missing.
- [ ] **Step 3:** Implement `appearance.tsx` and the `theme.tsx`, `_layout.tsx`, studio and error-screen changes.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS, with all earlier suites green, including the editing stress tests.
- [ ] **Step 5:** Commit: `feat(mobile): appearance setting (theme + light/dark/system); collage editor stays dark`.

### Task 4: Kit, tab bar, tiles and header band

**Files:**
- Modify: `apps/mobile/src/ui/kit.tsx`
  - **`Button`:** variants become `'primary' | 'secondary' | 'link'`, with `'ghost'` kept as a deprecated alias for `secondary`.
    - Primary: an `accent` pill (`borderRadius: 999`), height 44, or 36 when `small`, with an `onAccent` label.
    - Secondary: a transparent pill with a 1 pt `line` border and an `ink` label.
    - Press: `transform: [{ scale: 0.97 }]` and `opacity: 0.9` while pressed, skipped when `AccessibilityInfo.isReduceMotionEnabled` reports true. Read it once into state.
  - **`Card`:** `radius.card` = 16, `surface` fill, 1 pt `line` border, no shadow.
  - **`Chip` / `Segmented` selected:** `accentSoft` fill with an `accent` label (was an `accent` fill).
  - **`IconTile`:** gains `family?: TileFamily`. With a family it uses `t.tiles[family]`; without one, `accentSoft` / `accent` as today.
  - **`H1`:** uses `t.displaySize`.
- Modify: `packages/ui/src/tokens.ts`. Set `radius` to `{ chip: 999, button: 999, card: 16, tile: 12, sheet: 28 }`.
- Modify: `apps/mobile/src/lib/labels.ts`
  - Add a `family: TileFamily` to `ITEM_LABELS`, `BOOKING_LABELS` and `CATEGORY_LABELS` (spec §3.3):

    | Labels | Family |
    |---|---|
    | flight, train, bus, transport, travel | sea |
    | stay, rental | clay |
    | food, shopping | mango |
    | activity, place | leaf |
    | event, note, other, misc | rose |

  - Add `family: TileFamily` to each entry of the existing `TRIP_ICONS` list (`lib/labels.ts:59`): beach and flight → sea; mountain and camping → clay; city, food and festival → mango; road trip and train → leaf; luggage → rose. Add `tripIconFamily(icon: IconName): TileFamily`, which returns `'rose'` for unknown icons, for `trip-card.tsx` and `trip-header.tsx`.
- Modify: list rows that render `IconTile` for an item, booking or category, so they pass `family` from the labels. Four files use `IconTile`; find them with `grep -rln IconTile apps/mobile/src`.
- Modify: `apps/mobile/src/ui/tab-bar.tsx`
  - Colours come from `t.tabBar`; add a border only when `line` is set.
  - The shadow drops to opacity 0.08 (light) or 0.3 (dark), radius 16.
  - The Home + lift becomes `marginTop: -26`.
  - Delete the `dark` heuristic: Trip now follows the scheme.
- Modify:
  - `apps/mobile/src/components/trip-header.tsx`: when `t.band` is set, wrap the header in a `View` with `backgroundColor: t.band`, `borderBottomLeftRadius`/`borderBottomRightRadius: 26`, and horizontal padding matching the screen. Inside the band, chips and the round buttons use the `surface` background, and the trip tile uses `surface` with an `ink` icon.
  - `apps/mobile/src/app/(home)/index.tsx`: the same band behind the "Your trips" title.
- Rename `variant="ghost"` → `variant="secondary"` at all 31 call sites (`grep -rln 'variant="ghost"' apps/mobile/src`), then remove the alias.
- Test: `apps/mobile/src/__tests__/kit.test.tsx` (new)

- [ ] **Step 1: Write failing tests**
  - `kit.test.tsx`:
    - `Button primary uses the accent and a pill`: render inside `withData` with `sunset` + `light` + mode `home`; the pressable's flattened style has `backgroundColor === '#B32F18'` and `borderRadius === 999`.
    - `Button secondary is outlined`: `backgroundColor` is transparent and `borderWidth === 1`.
    - `IconTile family uses theme tiles`: with `block`, `family="sea"` gives a `#0B6584` background.
    - `Chip selected uses the tint`: `backgroundColor === accentSoft`.
    - `tab bar in Colour block is black`: render `ModeTabBar` with minimal props as in `trip-tabs.test.tsx`; its container background is `#141414`.
  - Extend `style-guard.test.ts` with `no ghost buttons`: no `variant="ghost"` in `src`.
- [ ] **Step 2:** Run `pnpm --filter @travelog/mobile exec jest src/__tests__/kit src/__tests__/style-guard`. Expected: FAIL.
- [ ] **Step 3:** Implement the changes above.
- [ ] **Step 4:** Run `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. Expected: PASS. Update queries in older tests that relied on `ghost` styling only by role or label, never by deleting assertions.
- [ ] **Step 5:** Commit: `feat(mobile): one button pair, flat cards, tinted chips, themed tab bar, coloured tiles, header band`.

### Task 5: Remove hard-coded chrome colours

**Files:**
- Modify, replacing each hex literal with a theme token or `t.tiles[...]`:
  - `apps/mobile/src/components/trip-card.tsx`
  - `apps/mobile/src/components/memories-view.tsx`: selection badge = accent / onAccent; floating bar = surface / line
  - `apps/mobile/src/app/trip/[id]/live/index.tsx`
  - `apps/mobile/src/app/(home)/index.tsx`

  Overlay scrims may stay as `rgba(0,0,0,x)`.
- Test: `apps/mobile/src/__tests__/style-guard.test.ts`

- [ ] **Step 1: Write failing test.** `no hex colours in app chrome`: scan `src/**/*.tsx` for `/#[0-9A-Fa-f]{6}\b/`, excluding `__tests__`, `components/studio`, `app/trip/[id]/studio` and `ui/icon.tsx`, and expect `[]`.
- [ ] **Step 2:** Run the guard. Expected: FAIL, listing the four files.
- [ ] **Step 3:** Replace the literals.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `refactor(mobile): screens take every colour from the theme`.

### Task 6: Profile → Appearance

**Files:**
- Create: `apps/mobile/src/components/appearance-card.tsx`, exporting `AppearanceCard()`, which reads `useAppearance()` and writes with `useMutate()` + `saveAppearance`.
  - A "Theme" row of two `Pressable` cards with `accessibilityRole="radio"`, labels `Theme Sunset` and `Theme Colour block`, and `accessibilityState.selected`. Each shows a 4-colour strip:
    - Sunset: `#FFF4EC`, `#B32F18`, `#0B6584`, `#FFB23F`
    - Colour block: `#C6D9FF`, `#FFFFFF`, `#1F4FD1`, `#141414`
  - The selected card has a 2 pt `accent` ring.
  - A "Mode" `Segmented` with `Light` / `Dark` / `Match phone`.
  - The caption: "Match phone follows your phone's dark-mode setting. Trip mode follows this too."
  - The two preview strips are theme specimens. Add `components/appearance-card.tsx` to the hex-guard exclusions with a comment.
- Modify: `apps/mobile/src/app/(home)/profile.tsx`. Add `<Section title="Appearance"><AppearanceCard /></Section>` after the reminders card.
- Test: `apps/mobile/src/__tests__/appearance.test.tsx` (extend)

- [ ] **Step 1: Write failing test.** `Profile switches theme and mode`: render the profile screen with `withData`. Press `radio` `Theme Colour block`, then the `tab` `Dark`. Then:
  - `readAppearance(db)` equals `{ theme: 'block', mode: 'dark' }`;
  - the radio's `accessibilityState.selected` is true;
  - pressing `Match phone` saves `mode: 'system'`.
- [ ] **Step 2:** Run it. Expected: FAIL, because there is no Appearance section yet.
- [ ] **Step 3:** Implement the card and the profile section.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(mobile): Profile → Appearance (Sunset / Colour block; Light / Dark / Match phone)`.

### Task 7: Docs, full verification, push

**Files:**
- Modify: `docs/02-design-system.md`. Add a "Plan 26" section summarising:
  - the two themes, with a pointer to the spec for values;
  - the rules: no violet, 4.5:1, one button pair;
  - the font faces.

  Earlier text is kept but marked "superseded by Plan 26".
- Modify:
  - `docs/plans/26-app-redesign.md`: status → ✅ Built
  - `docs/plans/README.md`: row title
  - `CLAUDE.md`: under Conventions, add a "**Design:** colours only from `themeFor` / `useTheme()`; no violet (hue 270–330°); ≥4.5:1, enforced by `packages/ui` tests" line

- [ ] **Step 1:** Run `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. Expected: all PASS.
- [ ] **Step 2:** Run `cd apps/mobile && EXPO_OFFLINE=1 pnpm export:android && node ../../scripts/check-bundle-size.mjs`. Expected: within the limit.
- [ ] **Step 3:** Run `EXPO_OFFLINE=1 pnpm dev:go` until Metro bundles, then stop it. Expected: no resolution errors.
- [ ] **Step 4:** Commit the docs and push to `claude/kind-allen-2woote`.
- [ ] **Step 5:** Owner check on the phone (`git pull && pnpm dev:go`):
  - Profile → Appearance: try both themes × Light / Dark / Match phone.
  - Open a trip in Plan and Trip mode.
  - Open the collage editor: it stays dark.
  - No new build is needed.
