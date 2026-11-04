import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Placeholders chosen in Plan 9; change them here when the owner confirms
 * the final name, domain and bundle id (docs/17-owner-checklist.md, section A).
 */
const APP_NAME = 'TravelOG';
const BUNDLE_ID = 'app.travelog.mobile';
const SCHEME = 'travelog';
const WEB_DOMAIN = process.env.EXPO_PUBLIC_WEB_DOMAIN ?? 'travelog.app';
/** EAS project created by the owner (not a secret), in the TravelOGApp organisation. */
const EAS_PROJECT_ID = 'c1fca343-1181-4e23-a750-137c4ca9447d';
const EAS_OWNER = 'travelogapp';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  owner: EAS_OWNER,
  slug: 'travelog',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: SCHEME,
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    icon: './assets/expo.icon',
    associatedDomains: [`applinks:${WEB_DOMAIN}`],
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: '#FFE6E2',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FAF7F2',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
        dark: { backgroundColor: '#0F1020' },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
  runtimeVersion: { policy: 'appVersion' },
  extra: {
    eas: { projectId: EAS_PROJECT_ID },
    webDomain: WEB_DOMAIN,
    // Filled from EAS environment variables once the Supabase projects exist (docs/14 §4).
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? null,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? null,
  },
});
