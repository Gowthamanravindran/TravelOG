/**
 * Design tokens (docs/02-design-system.md, Plan 26).
 * Two themes × light/dark × three modes; each mode re-themes the app through its accent.
 */

export type Mode = 'home' | 'plan' | 'trip';
export type Scheme = 'light' | 'dark';

import { THEMES, type ThemeName, type TileFamily } from './themes';

export { THEMES, type ThemeName, type TileFamily } from './themes';

export type CategoryKey = 'stay' | 'travel' | 'food' | 'activities' | 'shopping' | 'misc';

export interface Theme {
  name: ThemeName;
  mode: Mode;
  scheme: Scheme;
  /** Screen background; in Colour block, the mode colour. */
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  ink2: string;
  line: string;
  mango: string;
  success: string;
  danger: string;
  accent: string;
  accentSoft: string;
  /** Text/icon colour placed on top of `accent`. */
  onAccent: string;
  /** Header band fill behind the trip header, or null for none. */
  band: string | null;
  /** activeFg sits on the active pill; activeLabel is the active tab's label on the bar. */
  tabBar: {
    bg: string;
    fg: string;
    activeBg: string;
    activeFg: string;
    activeLabel: string;
    line: string | null;
  };
  tiles: Record<TileFamily, { bg: string; fg: string }>;
  categories: Record<CategoryKey, string>;
  /** Size of screen titles (display style). */
  displaySize: number;
}

export const THEME_NAMES: readonly ThemeName[] = ['sunset', 'block'];

/** Status colours, the same in both themes (light values darkened for 4.5:1 in Plan 26). */
const STATUS: Record<Scheme, { mango: string; success: string; danger: string }> = {
  light: { mango: '#FFB020', success: '#126A33', danger: '#A82020' },
  dark: { mango: '#FFC24D', success: '#34D399', danger: '#FF6B6E' },
};

/** A tile's most saturated colour: the fill for solid tiles, else the icon. */
const strong = (tile: { bg: string; fg: string }) => (tile.fg === '#FFFFFF' ? tile.bg : tile.fg);

/**
 * The full set of colours for a theme, app mode and light/dark scheme. Trip mode follows
 * the scheme like the others (Plan 26); an unknown scheme is light.
 */
export function themeFor(
  name: ThemeName,
  mode: Mode,
  systemScheme: Scheme | null | undefined,
): Theme {
  const data = THEMES[name] ?? THEMES.sunset;
  const scheme: Scheme = systemScheme === 'dark' ? 'dark' : 'light';
  const n = data.neutrals[scheme];
  const [accent, accentSoft, onAccent] = data.accents[mode][scheme];
  const tiles = Object.fromEntries(
    Object.entries(data.tiles).map(([k, v]) => [k, v[scheme]]),
  ) as Theme['tiles'];
  return {
    name: data === THEMES.sunset ? 'sunset' : name,
    mode,
    scheme,
    bg: data.grounds[mode][scheme],
    ...n,
    ...STATUS[scheme],
    accent,
    accentSoft,
    onAccent,
    band: data.band ? accentSoft : null,
    tabBar: data.inkTabBar
      ? {
          bg: '#141414',
          fg: '#C9C9C4',
          activeBg: accent,
          activeFg: onAccent,
          activeLabel: '#FFFFFF',
          line: null,
        }
      : {
          bg: n.surface,
          fg: n.ink2,
          activeBg: accentSoft,
          activeFg: accent,
          activeLabel: accent,
          line: n.line,
        },
    tiles,
    categories: {
      stay: strong(tiles.clay),
      travel: strong(tiles.sea),
      food: strong(tiles.mango),
      activities: strong(tiles.leaf),
      shopping: strong(tiles.rose),
      misc: n.ink2,
    },
    displaySize: data.displaySize,
  };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { chip: 999, button: 999, card: 16, tile: 12, sheet: 28 } as const;

/** Loaded font faces (Plan 26). Android ignores fontWeight on custom fonts, so each weight is its own family. */
export const fonts = {
  display: { 700: 'PlusJakartaSans_700Bold', 800: 'PlusJakartaSans_800ExtraBold' },
  text: { 400: 'Figtree_400Regular', 500: 'Figtree_500Medium', 600: 'Figtree_600SemiBold' },
} as const;

export type FontRole = keyof typeof fonts;
export type FontWeight = 400 | 500 | 600 | 700 | 800;

/** The font family for a role and weight, snapped to the nearest loaded face. */
export function font(role: FontRole, weight: FontWeight): { fontFamily: string } {
  const faces = fonts[role] as Record<number, string>;
  const nearest = Object.keys(faces)
    .map(Number)
    .reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best));
  return { fontFamily: faces[nearest]! };
}

export const type = {
  display: { ...font('display', 800), fontSize: 28, lineHeight: 34 },
  title: { ...font('display', 700), fontSize: 20, lineHeight: 26 },
  headline: { ...font('display', 700), fontSize: 16, lineHeight: 22 },
  body: { ...font('text', 400), fontSize: 15, lineHeight: 22 },
  label: { ...font('text', 600), fontSize: 13, lineHeight: 18 },
  caption: { ...font('text', 500), fontSize: 12, lineHeight: 16 },
} as const;

/** Minimum touch target in points. */
export const minTouch = 44;
