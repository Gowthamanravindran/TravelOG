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
  tabBar: { bg: string; fg: string; activeBg: string; activeFg: string; line: string | null };
  tiles: Record<TileFamily, { bg: string; fg: string }>;
  categories: Record<CategoryKey, string>;
  /** Size of screen titles (display style). */
  displaySize: number;
}

export const THEME_NAMES: readonly ThemeName[] = ['sunset', 'block'];

/** Status colours, the same in both themes (light values darkened for 4.5:1 in Plan 26). */
const STATUS: Record<Scheme, { mango: string; success: string; danger: string }> = {
  light: { mango: '#FFB020', success: '#15803D', danger: '#C62828' },
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
      ? { bg: '#141414', fg: '#C9C9C4', activeBg: accent, activeFg: onAccent, line: null }
      : { bg: n.surface, fg: n.ink2, activeBg: accentSoft, activeFg: accent, line: n.line },
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

export const radius = { chip: 999, button: 14, card: 20, sheet: 28 } as const;

export const fonts = {
  display: 'PlusJakartaSans',
  body: 'Figtree',
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, fontWeight: '800' },
  title: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  headline: { fontFamily: fonts.display, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;

/** Minimum touch target in points. */
export const minTouch = 44;
