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
import { Platform, Text, TurboModuleRegistry, View } from 'react-native';
import { themeFor, type } from '@travelog/ui';
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

// Gesture-handler's root view needs its native module to exist before it's drawn.
// The library looks the module up when it loads, but tree shaking (release builds)
// removes that lookup, and the app crashed on launch with "Tried to access a
// non-existent registry" (Plan 49 T4). Looking it up here keeps it in every build.
// Not on web, where there are no native modules (Plan 63).
if (Platform.OS !== 'web') TurboModuleRegistry.get('RNGestureHandlerModule');

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

/**
 * Plan 63: TravelOG runs on phones. The dev server also serves a web page (opened when a QR
 * code is scanned with the camera instead of Expo Go); it explains that instead of trying to
 * open the phone's encrypted database.
 */
function WebNotice() {
  const t = themeFor('sunset', 'home', 'light');
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
        backgroundColor: t.bg,
      }}
    >
      <Text style={[type.display, { color: t.ink, textAlign: 'center' }]}>
        TravelOG runs on your phone
      </Text>
      <Text style={[type.body, { color: t.ink2, textAlign: 'center', maxWidth: 420 }]}>
        Open Expo Go, tap Scan QR code, and scan the code in your terminal. Scanning it with the
        camera opens this page instead.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  return Platform.OS === 'web' ? <WebNotice /> : <AppRoot />;
}

function AppRoot() {
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
