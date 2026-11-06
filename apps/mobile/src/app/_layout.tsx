import type { Db } from '@travelog/db';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  type ErrorBoundaryProps,
} from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ErrorScreen } from '@/components/error-screen';
import { openAppDatabase } from '@/data/open';
import { DataProvider } from '@/data/provider';
import { AppearanceProvider } from '@/lib/appearance';
import { FONT_ASSETS, FontGate } from '@/lib/fonts';
import { usePlacesSeed } from '@/lib/places';
import { CelebrationHost } from '@/ui/motion';
import { useScheme, useTheme } from '@/ui/theme';
import { useReminders } from '@/lib/reminders';

SplashScreen.preventAutoHideAsync();

/** Any screen that crashes shows this instead of a blank app. */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorScreen {...props} />;
}

/**
 * Navigation colours and the status bar follow the saved theme and light/dark
 * choice, so the colour behind pages while they slide is the app's own (Plan 36).
 */
function Themed({ children }: { children: ReactNode }) {
  const scheme = useScheme();
  const t = useTheme('home');
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: t.bg,
      card: t.surface,
      text: t.ink,
      border: t.line,
      primary: t.accent,
    },
  };
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeProvider>
  );
}

/** Work that follows the data in the background (reminders, places seed). */
function Background() {
  useReminders();
  usePlacesSeed();
  return null;
}

export default function RootLayout() {
  const fonts = useFonts(FONT_ASSETS);
  const [db, setDb] = useState<Db | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // The splash screen stays up until the database is open and migrated and the fonts
    // are loaded (FontGate; docs/08: no network at startup).
    openAppDatabase()
      .then(setDb)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [attempt]);

  if (error) {
    return (
      <FontGate fonts={fonts} dataReady>
        <ErrorScreen
          error={new Error(`TravelOG couldn't open its storage on this phone. ${error}`)}
          retry={async () => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
        />
      </FontGate>
    );
  }
  if (!db) return null;

  return (
    <FontGate fonts={fonts} dataReady>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <DataProvider db={db}>
          <AppearanceProvider>
            <Themed>
              <CelebrationHost>
                <Background />
                <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                  <Stack.Screen
                    name="new-trip"
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                  />
                </Stack>
              </CelebrationHost>
            </Themed>
          </AppearanceProvider>
        </DataProvider>
      </GestureHandlerRootView>
    </FontGate>
  );
}
