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

/**
 * Plan 57: a stop's place in the phone's maps app. With coordinates the pin is exact; the name
 * goes along so the maps app can show the business.
 */
export function placeMapsUrl(p: { name: string; lat: number | null; lng: number | null }): string {
  if (p.lat == null || p.lng == null) return mapsUrl(p.name);
  const q = `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function openPlaceInMaps(p: {
  name: string;
  lat: number | null;
  lng: number | null;
}): Promise<void> {
  return Linking.openURL(placeMapsUrl(p));
}
