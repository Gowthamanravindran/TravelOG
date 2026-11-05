import { getSetting, setSetting, type Db } from '@travelog/db';
import { THEME_NAMES, type Scheme, type ThemeName } from '@travelog/ui';
import { createContext, useContext, type ReactNode } from 'react';

import { useQuery } from '@/data/provider';

/** Light, dark, or follow the phone (Plan 26). */
export type AppearanceMode = 'light' | 'dark' | 'system';
export interface Appearance {
  theme: ThemeName;
  mode: AppearanceMode;
}

export const DEFAULT_APPEARANCE: Appearance = { theme: 'sunset', mode: 'system' };
const MODES: readonly AppearanceMode[] = ['light', 'dark', 'system'];
const KEY = { theme: 'appearance.theme', mode: 'appearance.mode' } as const;

/** The saved choice; unknown or missing values fall back to the defaults. */
export function readAppearance(db: Db): Appearance {
  const theme = getSetting(db, KEY.theme);
  const mode = getSetting(db, KEY.mode);
  return {
    theme: THEME_NAMES.includes(theme as ThemeName)
      ? (theme as ThemeName)
      : DEFAULT_APPEARANCE.theme,
    mode: MODES.includes(mode as AppearanceMode)
      ? (mode as AppearanceMode)
      : DEFAULT_APPEARANCE.mode,
  };
}

/** Saves on this phone only (device settings; never synced). */
export function saveAppearance(db: Db, next: Partial<Appearance>): void {
  if (next.theme) setSetting(db, KEY.theme, next.theme);
  if (next.mode) setSetting(db, KEY.mode, next.mode);
}

export function resolveScheme(mode: AppearanceMode, system: Scheme | null | undefined): Scheme {
  if (mode !== 'system') return mode;
  return system === 'dark' ? 'dark' : 'light';
}

const AppearanceContext = createContext<Appearance>(DEFAULT_APPEARANCE);

/** Reads the saved appearance; changes re-render the app at once. Needs DataProvider. */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const appearance = useQuery((db) => readAppearance(db));
  return <AppearanceContext.Provider value={appearance}>{children}</AppearanceContext.Provider>;
}

/** The saved appearance, or the defaults outside AppearanceProvider (e.g. the storage error screen). */
export function useAppearance(): Appearance {
  return useContext(AppearanceContext);
}
