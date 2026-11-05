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
