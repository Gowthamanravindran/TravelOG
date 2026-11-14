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
    // Encrypted on-device database (tickets, PNRs, expenses are personal data). docs/11.
    ['expo-sqlite', { useSQLCipher: true }],
    'expo-secure-store',
    // Local trip reminders (docs/01 §11); push comes with accounts.
    'expo-notifications',
    // Memories: pick trip photos with the system photo picker (docs/01 §6). Collages are saved
    // through the share sheet, so no gallery permission (Play restricts READ_MEDIA_*).
    // Studio: hand slides to Instagram / Facebook / Photos (local module, Plan 15).
    ['./modules/social-share/app.plugin.js', {}],
    // Check-ins may add a one-off location while the app is open; never in the background.
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'TravelOG adds your location to a check-in only when you choose to.',
        locationAlwaysAndWhenInUsePermission: false,
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
        isAndroidForegroundServiceEnabled: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'TravelOG uses your photos to add them to your trip memories.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
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
    // Meta App ID: only needed to share to Instagram Stories (docs/14 §12). Public, not a secret.
    facebookAppId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? null,
    // Public base URL of the Cloudflare R2 media bucket (Plan 53), e.g. https://media.travelog.app.
    // Not a secret. Without it, trips show their 3D art instead of photos.
    mediaUrl: process.env.EXPO_PUBLIC_MEDIA_URL ?? null,
  },
});
