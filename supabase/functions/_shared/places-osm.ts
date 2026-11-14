/**
 * OpenStreetMap results (through Geoapify) as rows for our `places` table (Plan 29).
 * Plain TypeScript with no Deno APIs, so it is unit-tested with Vitest in
 * packages/core (places-osm.test.ts).
 */

/** The fields we read from a Geoapify autocomplete result. */
export interface GeoapifyResult {
  result_type?: string;
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  country_code?: string;
  lat?: number;
  lon?: number;
  timezone?: { name?: string };
  datasource?: { sourcename?: string; raw?: { osm_type?: string; osm_id?: number } };
  /** Plan 57: points of interest. */
  suburb?: string;
  street?: string;
  housenumber?: string;
  address_line1?: string;
  address_line2?: string;
  category?: string;
}

export interface PlaceRow {
  id: string;
  kind: 'city' | 'region' | 'country';
  name: string;
  country_code: string | null;
  country_name: string | null;
  region: string | null;
  lat: number;
  lng: number;
  time_zone: string | null;
  source: 'osm';
  search: string;
}

/** Same rule as @travelog/core normalizePlace (a test keeps them in step). */
export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const KIND: Record<string, PlaceRow['kind']> = {
  city: 'city',
  suburb: 'city',
  district: 'city',
  county: 'region',
  state: 'region',
  country: 'country',
};

/** A place row, or null for streets, buildings and results we can't keep a stable id for. */
export function fromGeoapify(r: GeoapifyResult): PlaceRow | null {
  const kind = KIND[r.result_type ?? ''];
  const raw = r.datasource?.raw;
  if (!kind || !raw?.osm_type || raw.osm_id == null || r.lat == null || r.lon == null) return null;
  const name =
    kind === 'country' ? r.country : kind === 'region' ? (r.state ?? r.name) : (r.city ?? r.name);
  if (!name) return null;
  return {
    id: `osm:${raw.osm_type.toUpperCase()}${raw.osm_id}`,
    kind,
    name,
    country_code: r.country_code ? r.country_code.toUpperCase() : null,
    country_name: r.country ?? null,
    region: kind === 'city' ? (r.state ?? null) : null,
    lat: r.lat,
    lng: r.lon,
    time_zone: r.timezone?.name ?? null,
    source: 'osm',
    search: normalizeForSearch(name),
  };
}

/** Plan 57: a café, sight or shop for an itinerary stop. Not stored in `places`. */
export interface PoiRow {
  id: string;
  name: string;
  address: string | null;
  /** The kind of stop it suggests in the app. */
  kind: 'food' | 'stay' | 'activity' | 'place';
  category: string | null;
  lat: number;
  lng: number;
}

const POI_KIND: [prefix: string, kind: PoiRow['kind']][] = [
  ['catering', 'food'],
  ['accommodation', 'stay'],
  ['entertainment', 'activity'],
  ['sport', 'activity'],
  ['leisure', 'activity'],
  ['activity', 'activity'],
];

/** A stop-sized place (an amenity, sight or building with a name), or null. */
export function poiFromGeoapify(r: GeoapifyResult): PoiRow | null {
  const raw = r.datasource?.raw;
  const name = r.name?.trim();
  if (!name || !raw?.osm_type || raw.osm_id == null || r.lat == null || r.lon == null) return null;
  if (r.result_type && !['amenity', 'building'].includes(r.result_type)) return null;
  const area = [r.suburb, r.city ?? r.state].filter((x, i, all) => x && all.indexOf(x) === i);
  const street = [r.street, r.housenumber].filter(Boolean).join(' ');
  const address =
    [street, ...area].filter(Boolean).join(', ') ||
    (r.address_line2 && r.address_line2 !== name ? r.address_line2 : null);
  const category = r.category ?? null;
  const kind = POI_KIND.find(([p]) => category?.startsWith(p))?.[1] ?? 'place';
  return {
    id: `osm:${raw.osm_type.toUpperCase()}${raw.osm_id}`,
    name,
    address: address || null,
    kind,
    category,
    lat: r.lat,
    lng: r.lon,
  };
}
