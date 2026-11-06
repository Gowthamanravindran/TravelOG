import { Linking } from 'react-native';

/**
 * Opens an address or place in the phone's maps app (Plan 35). A maps search
 * link works on both platforms and needs no map package, so it runs in Expo Go.
 */
export function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;
}

export function openInMaps(query: string): Promise<void> {
  return Linking.openURL(mapsUrl(query));
}
