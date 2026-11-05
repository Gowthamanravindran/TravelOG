import { themeFor, type Mode, type Scheme, type Theme } from '@travelog/ui';
import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { resolveScheme, useAppearance } from '@/lib/appearance';

const ModeContext = createContext<Mode>('home');
const ForcedSchemeContext = createContext<Scheme | null>(null);

/**
 * Sets the app mode (Home / Plan / Trip) for everything inside; each mode has its own
 * accent. `scheme` forces light or dark there whatever the setting (the collage editor
 * is always dark).
 */
export function ModeProvider({
  mode,
  scheme,
  children,
}: {
  mode: Mode;
  scheme?: Scheme;
  children: ReactNode;
}) {
  const inherited = useContext(ForcedSchemeContext);
  return (
    <ModeContext.Provider value={mode}>
      <ForcedSchemeContext.Provider value={scheme ?? inherited}>
        {children}
      </ForcedSchemeContext.Provider>
    </ModeContext.Provider>
  );
}

export function useMode(): Mode {
  return useContext(ModeContext);
}

/** The colours for this screen: the saved theme and light/dark choice, in the current mode. */
export function useTheme(modeOverride?: Mode): Theme {
  const mode = useContext(ModeContext);
  const forced = useContext(ForcedSchemeContext);
  const appearance = useAppearance();
  const system = useColorScheme();
  return themeFor(
    appearance.theme,
    modeOverride ?? mode,
    forced ?? resolveScheme(appearance.mode, system),
  );
}

/** The resolved light/dark scheme (for the status bar and navigation theme). */
export function useScheme(): Scheme {
  const forced = useContext(ForcedSchemeContext);
  const appearance = useAppearance();
  const system = useColorScheme();
  return forced ?? resolveScheme(appearance.mode, system);
}
