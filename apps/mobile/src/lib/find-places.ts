import { findPlaceCandidates, sameName, type LatLng } from '@travelog/core';
import type { ItemType } from '@travelog/db';

import { searchStopsServer } from './stop-search';

/** Plan 59: a place found in a post, matched to the map when our server can. */
export interface FoundPlace {
  key: string;
  name: string;
  type: ItemType;
  address: string | null;
  area: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  poiId: string | null;
  /** Ticked to start with: clearly a place in the post, or matched on the map. */
  sure: boolean;
}

/** At most this many lookups per post, to stay well inside the server's limit. */
const LOOKUPS = 8;

/**
 * Finds place names in the text and looks each one up near `near`. Names our server can't
 * match (or when it isn't set up / offline) are kept as typed, with no map spot.
 */
export async function findPlaces(
  text: string,
  near: LatLng | null,
  signal?: AbortSignal,
): Promise<FoundPlace[]> {
  const candidates = findPlaceCandidates(text);
  const found = await Promise.all(
    candidates.map(async (c, i): Promise<FoundPlace> => {
      const typed: FoundPlace = {
        key: `typed:${c.name}`,
        name: c.name,
        type: 'place',
        address: null,
        area: c.area,
        countryCode: null,
        lat: null,
        lng: null,
        poiId: null,
        sure: c.sure,
      };
      if (i >= LOOKUPS) return typed;
      const q = c.area ? `${c.name} ${c.area}` : c.name;
      const { places } = await searchStopsServer(q, near, signal);
      const hit = places.find((p) => sameName(c.name, p.name));
      if (!hit) return typed;
      return {
        key: hit.id ?? `${hit.lat},${hit.lng}`,
        name: hit.name,
        type: hit.kind,
        address: hit.address,
        area: hit.area ?? c.area,
        countryCode: hit.countryCode ?? null,
        lat: hit.lat,
        lng: hit.lng,
        poiId: hit.id,
        sure: true,
      };
    }),
  );
  const seen = new Set<string>();
  return found.filter((f) => !seen.has(f.key) && !!seen.add(f.key));
}
