import { themeFor, type Mode, type Theme } from '@travelog/ui';
import { useColorScheme } from 'react-native';

/** Theme for the current app mode; Trip mode is always dark. */
export function useModeTheme(mode: Mode): Theme {
  return themeFor(mode, useColorScheme());
}
