# TravelOG app redesign: Sunset and Colour block themes

- **Date:** 2026-11-05
- **Plan:** 26
- **Status:** spec for owner review
- **Mocks:** https://claude.ai/artifact/KSicGSuSPm6xfjabrEvYh9 (private to the owner)

## 1. Goal

Give the phone app (`apps/mobile`) a new look while keeping the same screens and navigation. The owner looked at three directions and then at nine colour schemes. They chose two themes, **Sunset** and **Colour block**, and want to switch between them in settings. They also want a **Light / Dark / Match phone** switch.

**Success means:**
- Both themes ship, chosen in **Profile → Appearance**, with Light / Dark / Match phone. The choice is saved on the phone and applies instantly.
- No colour in the app's own design falls in the violet band, OKLCH hue 270–330°. Collage content colours are exempt (section 8).
- Every text and label pair is at least 4.5:1, in both themes, both schemes and all three modes. A unit test enforces this.
- The fonts actually load: Plus Jakarta Sans for headings and Figtree for text. Until now they were named but never loaded, so Android showed Roboto.
- One system: one filled button for the main action, one outlined secondary style, one card recipe, one radius family and one type scale.
- No new native code: everything works in Expo Go (`pnpm dev:go`), so no new build is needed.

**Out of scope:**
- New screens or changes to navigation.
- The collage canvas, its templates, background swatches and sticker colours.
- The web pages and the HTML prototype.

## 2. Principles carried over from the design-taste-frontend skill

The skill (`Leonxlnx/taste-skill`, commit `9b4bf93`) is written for HTML websites. Only its principles transfer, and **none of its files are copied** (section 10):
- **No violet.** Hue 270–330° moves to blue or rose.
- **One system:** one button pair, one card recipe, one radius family, one heading scale with its fonts actually loaded.
- **The accent is for** the main action, the active tab, selection and focus. Elsewhere, colour comes from the theme's surfaces and tiles.
- **Labels on colour** are at least 4.5:1.
- **Quiet press feedback** with no bounce, tilt or scroll-triggered animation.
- **Rounder corners**, the skill's choice for consumer apps.
- **Dropped as web-only:** one section per screen, the dealing scripts, shader effects and the browser checkers.

## 3. Themes

There are two themes. Each has **light** and **dark** colours for all three modes: Home, Plan and Trip. Trip mode now follows the Light / Dark switch; it used to be always dark.

### 3.1 Sunset (default)

The warm peach background stays neutral, and colour comes from a tinted header band and from icon tiles coloured by type.

| | Light | Dark |
|---|---|---|
| Background | `#FFF4EC` | `#17110E` |
| Card | `#FFFFFF` | `#221A16` |
| Chip / second surface | `#FBE6D8` | `#2E2420` |
| Text | `#22160F` | `#FBF1EA` |
| Secondary text | `#6B5547` | `#C2AC9F` |
| Line | `#F1DCCD` | `#3A2E28` |

| Mode | Light accent / tint / label | Dark accent / tint / label |
|---|---|---|
| Home (tomato) | `#B32F18` / `#FFE1D6` / `#FFFFFF` | `#FF7A55` / `#4A2218` / `#17110E` |
| Plan (ocean) | `#0B6584` / `#D4EEF7` / `#FFFFFF` | `#5CC6E6` / `#123844` / `#17110E` |
| Trip (marigold) | `#9A5600` / `#FFEFC7` / `#FFFFFF` | `#FFB23F` / `#4A3412` / `#1F1400` |

- **Header band:** the trip header and the Home title sit on the mode's tint. On the band, chips are white and the trip icon sits on a white tile.
- **Icon tiles:** coloured by what the item is (section 3.3), as a tint with a coloured icon.

### 3.2 Colour block

The whole screen background is the mode colour, with white cards on top. Tiles are solid, and the tab bar is black.

| | Light | Dark |
|---|---|---|
| Card | `#FFFFFF` | `#1A1A1B` |
| Chip / second surface | `#F1ECE8` | `#262627` |
| Text | `#141414` | `#F7F7F5` |
| Secondary text | `#3F3F3F` | `#B8B8B3` |
| Line | `#E6DFDA` | `#333335` |

| Mode | Background (light / dark) | Light accent / tint / label | Dark accent / tint / label |
|---|---|---|---|
| Home | `#FFCDBD` / `#3E1B12` | `#A82C15` / `#FFE0D5` / `#FFFFFF` | `#FF7A55` / `#4A2016` / `#141414` |
| Plan | `#C6D9FF` / `#15254A` | `#1F4FD1` / `#DCE5FB` / `#FFFFFF` | `#86AAFF` / `#1A2B52` / `#141414` |
| Trip | `#BFEDE6` / `#0E3A36` | `#08705F` / `#D2F3EE` / `#FFFFFF` | `#2EE6C9` / `#0F4A43` / `#062420` |

- **Tab bar:** `#141414` with icons in `#C9C9C4`. The active tab is a pill in the accent colour, with the icon and label in the accent's label colour.
- **Screen titles:** 32 pt, weight 800.
- **Icon tiles:** solid colour with white icons (section 3.3).

### 3.3 Icon tile colours

Tiles are coloured by what they show. The mapping lives next to the existing type → icon map in `lib/labels.ts`.

| Family | Used for | Sunset tile (light, light-mode icon, dark, dark-mode icon) | Colour block tile (fill / icon) |
|---|---|---|---|
| sea | flights, trains, buses, beach, sea | `#D4EEF7`, `#0B6584`, `#123A49`, `#6FD0F0` | `#0B6584` / `#FFFFFF` |
| clay | stays, mountains | `#FFE1D6`, `#B4321A`, `#4A2218`, `#FF9475` | `#B4321A` / `#FFFFFF` |
| mango | food, cities, shopping | `#FFEFC7`, `#7A5000`, `#46340E`, `#FFC94D` | `#8A5200` / `#FFFFFF` |
| leaf | activities, outdoors, cruises | `#DDF3E4`, `#17734A`, `#163A27`, `#62D69A` | `#17734A` / `#FFFFFF` |
| rose | events, festivals, other | `#FCE1EA`, `#B0154A`, `#4A1A2A`, `#FF7FA3` | `#B0154A` / `#FFFFFF` |

Budget category colours use the same families: stay is clay, travel is sea, food is mango, activities is leaf, and misc uses the theme's secondary text colour. They become part of the theme, replacing the fixed `categoryColors`.

### 3.4 Status colours

`success`, `danger` and `mango` stay theme-independent. Their dark-mode values are re-checked against the new surfaces by the contrast test. Final values after the contrast sweep (Plan 26 review): light success `#126A33` and danger `#A82020`, which pass 4.5:1 on cards and on every light background, including Colour block's mode colours. Dark values are unchanged.

## 4. Type

- **Loading:** fonts load with `expo-font` (`useFonts`) from `@expo-google-fonts/plus-jakarta-sans` and `@expo-google-fonts/figtree`, added with `npx expo install`. These are font files, not native code, so they work in Expo Go.
- **Faces:** Plus Jakarta Sans 700 and 800; Figtree 400, 500 and 600.
- **Android needs one family name per weight.** It ignores `fontWeight` on custom fonts, so each style in `type` names its exact face (for example `PlusJakartaSans_800ExtraBold`, `Figtree_600SemiBold`) and drops `fontWeight`. A helper `font(role, weight)` replaces the ad-hoc `fontWeight` literals in components (about 25 places).
- **Scale:**

  | Style | Size / line height |
  |---|---|
  | display | 28/34, or 32/38 in Colour block |
  | title | 20/26 |
  | headline | 16/22 |
  | body | 15/22 |
  | label | 13/18 |
  | caption | 12/16 |

- **Splash screen:** stays up until the database **and** the fonts are ready. If the fonts fail to load, the app still starts in the system font.

## 5. Components (`ui/kit.tsx`, `ui/tab-bar.tsx`)

**Buttons**
- Primary: a filled pill in the accent colour, 44 pt tall (36 when small). Exactly one per view, for the main action.
- Secondary: an outlined pill, transparent fill, a 1 pt line and ink text. Every other button, including what was "ghost".
- Link: accent-coloured text.

**Cards**
- Card colour with a 1 pt line, radius 16, no shadow. Nesting is at most two boxes deep.

**Chips and segmented controls**
- Unselected: the second surface with ink text.
- Selected: the accent tint with accent text. Today selected chips are filled with the accent.

**Tab bar:** floating and detached, as now.
- Sunset: card colour with a hairline and a soft shadow.
- Colour block: the black bar from section 3.2.
- The Home + button stays raised, with a lower lift and a softer shadow.

**Header band** (`components/trip-header.tsx`, Home title): the mode tint in Sunset, none in Colour block.

**Press feedback:** a 0.97 scale and a slight darken for about 90 ms. Nothing moves when reduce motion is on.

**Radii:** chip 999, button 999, card 16, tile 12, sheet 28.

## 6. Appearance settings

- **Where:** a Profile section, **Appearance**, as in the mocks.
  - **Theme:** two cards, Sunset and Colour block, each showing a strip of its colours. The selected card has an accent ring.
  - **Mode:** a segmented control, Light · Dark · Match phone. Match phone is the default and follows `useColorScheme()`.
- **Storage:** device settings `appearance.theme` (`sunset` | `block`) and `appearance.mode` (`light` | `dark` | `system`), through the existing `getSetting` / `setSetting` in `packages/db/src/repo/settings.ts`. These are local only, never synced, and need no migration.
- **Flow:**
  - An `AppearanceProvider` inside `DataProvider` reads both settings with `useQuery`, so a change re-renders at once, and resolves the scheme.
  - `useTheme()` (`ui/theme.tsx`) reads that context.
  - `themeFor(theme, mode, scheme)` in `packages/ui` returns the full `Theme`, which gains `ground`, `band`, `bandInk`, tab-bar colours, tile families and category colours. Existing keys (`bg`, `accent`, …) keep their meaning, so most screens need no change.
  - The navigation `ThemeProvider` and `StatusBar` use the resolved scheme.
- **Before the database opens** (the storage error screen): Sunset with the phone's scheme.
- **Bad stored values** fall back to the defaults.

## 7. Trip mode and the collage editor

- **Trip mode** (Today, Plan, Nearby, Budget, Memories, check-in) follows the switch. Light Trip colours are in section 3.
- **Collage editor and export screen** (`studio/[projectId].tsx`, `studio/export.tsx`) keep a **dark editing workspace** in every setting, like a photo editor, so the collage colours read the same while editing. They use the current theme's dark Trip colours. *Owner to confirm in review.*

## 8. What does not change

- **Collage content:**
  - the canvas default background `#0F1020`
  - templates
  - background swatches and gradients
  - sticker colours
  - the "Made with TravelOG" mark

  These are the user's own picture, not app chrome. They're exempt from the violet rule.
- Screens, routes, navigation, copy and behaviour.

## 9. Testing

- **`packages/ui` (Vitest): theme contrast and hue.** For each theme × light/dark × home/plan/trip:
  - every pair in sections 3–5 is at least 4.5:1: text and secondary text on background, card and chip; label on accent; accent on tint; band text; tile icons; tab bar; status colours;
  - no theme colour has OKLCH hue 270–330° at chroma above 0.02.

  The maths matches the mock page's `schemes.js` checks.
- **`packages/ui`:** `themeFor` returns complete themes, and bad inputs fall back to Sunset with the phone's scheme.
- **`apps/mobile` (Jest):**
  - Profile → Appearance switches theme and mode; the choices are saved in settings, and a themed screen re-renders with the new colours.
  - Match phone follows a mocked `useColorScheme`.
  - Trip mode honours light.
  - The collage editor stays dark.
- **`apps/mobile`:**
  - Fonts: the type tokens name only loaded faces.
  - Style guard: no `fontWeight` used with a custom family.
- **Existing suites stay green.** Tests that assert colours or labels are updated, not deleted.
- **Before finishing:** `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` and a full Android export within the bundle budget. Fonts add assets, not JS.
- **Owner:** `git pull && pnpm dev:go`. Switch both themes and all three modes on the phone. No new build is needed.

## 10. The third-party skill: safety review

The repo was inspected in a separate folder outside the project and never installed.
- **No secrets read or sent.** The only environment variables read are a temp-folder path, the Chrome path and debug flags. Its network use is optional downloads of icons (jsDelivr), stock photos (picsum, Wikimedia) and map data (Overpass). Its scripts start headless Chrome with throwaway profiles and delete only those and their own output.
- **Nothing runs on install:** no plugin hooks, and no install-time scripts. The CI workflow runs a text-encoding check.
- **No hidden instructions.** It has 4 HTML comments, all sample-code notes. Its "ignore" comments only swallow JSON parse errors. No file has hidden Unicode, none of the 958 SVGs contains script, and no text addresses an AI.
- **Nothing from it is used in the app.** Its `assets/` are HTML, CSS and WebGL for websites.

## 11. Rollout

All of this is one change. Section 5's pieces are small and share the tokens, so splitting it would leave the app half-themed. The implementation plan (writing-plans) orders it as:
1. Tokens and the contrast test.
2. Fonts.
3. Appearance provider and settings.
4. Kit, tab bar and header band.
5. Screen fixes for hard-coded colours: `trip-card.tsx`, `memories-view.tsx`, `live/index.tsx`, `(home)/index.tsx`, `budget-view.tsx` category colours.
6. Profile → Appearance.
7. Collage editor stays dark.
8. Docs: `docs/02-design-system.md`, plan log.
