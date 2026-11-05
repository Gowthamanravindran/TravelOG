/**
 * The two app themes (Plan 26). Values come from
 * docs/superpowers/specs/2026-11-05-app-redesign-design.md §3; every pair is checked
 * for 4.5:1 contrast and the violet band in themes.test.ts.
 */

export type ThemeName = 'sunset' | 'block';
export type TileFamily = 'sea' | 'clay' | 'mango' | 'leaf' | 'rose';
type SchemeKey = 'light' | 'dark';
type ModeKey = 'home' | 'plan' | 'trip';

export interface Neutrals {
  surface: string;
  surface2: string;
  ink: string;
  ink2: string;
  line: string;
}

/** [accent, accentSoft (tint), onAccent (label on accent)] */
export type AccentSet = [string, string, string];

export interface ThemeData {
  /** Screen background per mode and scheme. */
  grounds: Record<ModeKey, Record<SchemeKey, string>>;
  neutrals: Record<SchemeKey, Neutrals>;
  accents: Record<ModeKey, Record<SchemeKey, AccentSet>>;
  /** Tile fill and icon per family and scheme. */
  tiles: Record<TileFamily, Record<SchemeKey, { bg: string; fg: string }>>;
  /** Header band behind the trip header: the mode tint, or none. */
  band: boolean;
  /** Black tab bar with the accent as the active pill. */
  inkTabBar: boolean;
  displaySize: number;
}

const tint = (light: [string, string], dark: [string, string]) => ({
  light: { bg: light[0], fg: light[1] },
  dark: { bg: dark[0], fg: dark[1] },
});
const solid = (bg: string) => ({ light: { bg, fg: '#FFFFFF' }, dark: { bg, fg: '#FFFFFF' } });

const SUNSET_LIGHT_BG = '#FFF4EC';
const SUNSET_DARK_BG = '#17110E';

export const THEMES: Record<ThemeName, ThemeData> = {
  sunset: {
    grounds: {
      home: { light: SUNSET_LIGHT_BG, dark: SUNSET_DARK_BG },
      plan: { light: SUNSET_LIGHT_BG, dark: SUNSET_DARK_BG },
      trip: { light: SUNSET_LIGHT_BG, dark: SUNSET_DARK_BG },
    },
    neutrals: {
      light: {
        surface: '#FFFFFF',
        surface2: '#FBE6D8',
        ink: '#22160F',
        ink2: '#6B5547',
        line: '#F1DCCD',
      },
      dark: {
        surface: '#221A16',
        surface2: '#2E2420',
        ink: '#FBF1EA',
        ink2: '#C2AC9F',
        line: '#3A2E28',
      },
    },
    accents: {
      home: { light: ['#B32F18', '#FFE1D6', '#FFFFFF'], dark: ['#FF7A55', '#4A2218', '#17110E'] },
      plan: { light: ['#0B6584', '#D4EEF7', '#FFFFFF'], dark: ['#5CC6E6', '#123844', '#17110E'] },
      trip: { light: ['#9A5600', '#FFEFC7', '#FFFFFF'], dark: ['#FFB23F', '#4A3412', '#1F1400'] },
    },
    tiles: {
      sea: tint(['#D4EEF7', '#0B6584'], ['#123A49', '#6FD0F0']),
      clay: tint(['#FFE1D6', '#B4321A'], ['#4A2218', '#FF9475']),
      mango: tint(['#FFEFC7', '#7A5000'], ['#46340E', '#FFC94D']),
      leaf: tint(['#DDF3E4', '#17734A'], ['#163A27', '#62D69A']),
      rose: tint(['#FCE1EA', '#B0154A'], ['#4A1A2A', '#FF7FA3']),
    },
    band: true,
    inkTabBar: false,
    displaySize: 28,
  },
  block: {
    grounds: {
      home: { light: '#FFCDBD', dark: '#3E1B12' },
      plan: { light: '#C6D9FF', dark: '#15254A' },
      trip: { light: '#BFEDE6', dark: '#0E3A36' },
    },
    neutrals: {
      light: {
        surface: '#FFFFFF',
        surface2: '#F1ECE8',
        ink: '#141414',
        ink2: '#3F3F3F',
        line: '#E6DFDA',
      },
      dark: {
        surface: '#1A1A1B',
        surface2: '#262627',
        ink: '#F7F7F5',
        ink2: '#B8B8B3',
        line: '#333335',
      },
    },
    accents: {
      home: { light: ['#B4321A', '#FFE0D5', '#FFFFFF'], dark: ['#FF7A55', '#4A2016', '#141414'] },
      plan: { light: ['#1F4FD1', '#DCE5FB', '#FFFFFF'], dark: ['#86AAFF', '#1A2B52', '#141414'] },
      trip: { light: ['#08705F', '#D2F3EE', '#FFFFFF'], dark: ['#2EE6C9', '#0F4A43', '#062420'] },
    },
    tiles: {
      sea: solid('#0B6584'),
      clay: solid('#B4321A'),
      mango: solid('#8A5200'),
      leaf: solid('#17734A'),
      rose: solid('#B0154A'),
    },
    band: false,
    inkTabBar: true,
    displaySize: 32,
  },
};
