import { themeFor, type Mode, type Theme } from '@travelog/ui';
import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

const ModeContext = createContext<Mode>('home');

/** Sets the app mode (Home / Plan / Trip) for everything inside; each mode has its own accent. */
export function ModeProvider({ mode, children }: { mode: Mode; children: ReactNode }) {
  return <ModeContext.Provider value={mode}>{children}</ModeContext.Provider>;
}

export function useMode(): Mode {
  return useContext(ModeContext);
}

export function useTheme(modeOverride?: Mode): Theme {
  const mode = useContext(ModeContext);
  return themeFor(modeOverride ?? mode, useColorScheme());
}
