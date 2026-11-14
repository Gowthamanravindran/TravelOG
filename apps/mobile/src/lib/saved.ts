import { normalizePlace } from '@travelog/core';
import {
  getPlace,
  getTrip,
  type Db,
  type ItemType,
  type SavedInput,
  type SavedPlace,
  type SavedSource,
} from '@travelog/db';

import type { StopPlaceValue } from '@/ui/stop-place-field';

/** Plan 58: the Saved tab's words for where a place came from. */
export const SOURCE_LABELS: Record<SavedSource, string> = {
  typed: 'Added by you',
  stop: 'From a trip',
  instagram: 'From Instagram',
  youtube: 'From YouTube',
  tiktok: 'From TikTok',
  web: 'From a website',
};

export interface SavedGroup {
  country: string;
  areas: { area: string; places: SavedPlace[] }[];
  count: number;
}

const OTHER = 'Somewhere';

/** Country name for a code, from the phone's places (else the code). */
export function countryName(db: Db, code: string | null): string {
  if (!code) return OTHER;
  return getPlace(db, `ctry:${code}`)?.name ?? code;
}

/** Saved places grouped by country, then town or area; biggest groups first. */
export function groupSaved(db: Db, places: readonly SavedPlace[]): SavedGroup[] {
  const byCountry = new Map<string, Map<string, SavedPlace[]>>();
  for (const p of places) {
    const country = countryName(db, p.countryCode);
    const area = p.area ?? 'Other places';
    const areas = byCountry.get(country) ?? new Map<string, SavedPlace[]>();
    areas.set(area, [...(areas.get(area) ?? []), p]);
    byCountry.set(country, areas);
  }
  return [...byCountry.entries()]
    .map(([country, areas]) => ({
      country,
      areas: [...areas.entries()]
        .map(([area, list]) => ({ area, places: list }))
        .sort((a, b) => b.places.length - a.places.length || a.area.localeCompare(b.area)),
      count: [...areas.values()].reduce((n, l) => n + l.length, 0),
    }))
    .sort((a, b) =>
      a.country === OTHER
        ? 1
        : b.country === OTHER
          ? -1
          : b.count - a.count || a.country.localeCompare(b.country),
    );
}

/** Text search over a saved place's name, area and address. */
export function matchesSaved(p: SavedPlace, query: string): boolean {
  const q = normalizePlace(query);
  if (!q) return true;
  return [p.title, p.area, p.address, p.note]
    .filter((x): x is string => !!x)
    .some((x) => normalizePlace(x).includes(q));
}

/** A guess at the area from an address like "Market Road, Anjuna, Bardez". */
export function areaFromAddress(address: string | null): string | null {
  const parts = (address ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && !/\d/.test(s));
  return parts.length >= 2 ? parts[parts.length - 2]! : (parts[0] ?? null);
}

/** What to save for a stop's place: its area and country from the search, else guessed. */
export function savedFromStop(
  db: Db,
  tripId: string | null,
  p: { title: string; type: ItemType; place: StopPlaceValue },
  source: SavedSource = 'stop',
): SavedInput {
  const trip = tripId ? getTrip(db, tripId) : undefined;
  const dest = trip?.destinationPlaceId ? getPlace(db, trip.destinationPlaceId) : undefined;
  return {
    title: p.place.name.trim() || p.title,
    type: p.type,
    address: p.place.address,
    area:
      p.place.area ??
      areaFromAddress(p.place.address) ??
      (dest?.kind === 'city' ? dest.name : null),
    countryCode: p.place.countryCode ?? dest?.countryCode ?? null,
    lat: p.place.lat,
    lng: p.place.lng,
    poiId: p.place.poiId,
    source,
  };
}
