/**
 * Design tokens from docs/02-design-system.md.
 * Each mode re-themes the app through its accent; Trip mode is always dark.
 */

export type Mode = 'home' | 'plan' | 'trip';
export type Scheme = 'light' | 'dark';

export interface Palette {
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  ink2: string;
  line: string;
  mango: string;
  success: string;
  danger: string;
}

export interface Theme extends Palette {
  mode: Mode;
  scheme: Scheme;
  accent: string;
  accentSoft: string;
  /** Text/icon colour placed on top of `accent`. */
  onAccent: string;
}

export const palettes: Record<Scheme, Palette> = {
  light: {
    bg: '#FAF7F2',
    surface: '#FFFFFF',
    surface2: '#F2EEE7',
    ink: '#1B1A3A',
    ink2: '#5E5C78',
    line: '#E8E3DA',
    mango: '#FFB020',
    success: '#16A34A',
    danger: '#E5484D',
  },
  dark: {
    bg: '#0F1020',
    surface: '#1A1B2E',
    surface2: '#24253B',
    ink: '#F4F3FA',
    ink2: '#A9A8C2',
    line: '#2E2F48',
    mango: '#FFC24D',
    success: '#34D399',
    danger: '#FF6B6E',
  },
};

const accents: Record<
  Mode,
  Record<Scheme, { accent: string; accentSoft: string; onAccent: string }>
> = {
  home: {
    light: { accent: '#FF6B5B', accentSoft: '#FFE6E2', onAccent: '#FFFFFF' },
    dark: { accent: '#FF6B5B', accentSoft: '#3A2230', onAccent: '#FFFFFF' },
  },
  plan: {
    light: { accent: '#5B5BD6', accentSoft: '#E7E7FB', onAccent: '#FFFFFF' },
    dark: { accent: '#8B8BF0', accentSoft: '#262759', onAccent: '#0F1020' },
  },
  trip: {
    light: { accent: '#14B8A6', accentSoft: '#0F3B38', onAccent: '#04201D' },
    dark: { accent: '#14B8A6', accentSoft: '#0F3B38', onAccent: '#04201D' },
  },
};

/** Trip mode ignores the system setting and is always dark. */
export function themeFor(mode: Mode, systemScheme: Scheme | null | undefined): Theme {
  const scheme: Scheme = mode === 'trip' ? 'dark' : systemScheme === 'dark' ? 'dark' : 'light';
  return { mode, scheme, ...palettes[scheme], ...accents[mode][scheme] };
}

export const categoryColors = {
  stay: '#5B5BD6',
  travel: '#14B8A6',
  food: '#FF6B5B',
  activities: '#FFB020',
  shopping: '#E056A0',
  misc: '#8A8AA3',
} as const;

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
