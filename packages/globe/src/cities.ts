// City search over a bundled list of about 24,000 cities with 15,000+ people.
//
// The list in data/cities.json comes from GeoNames (geonames.org), licensed CC BY 4.0; the app
// credits GeoNames on its licences screen. Rows are [id, name, countryCode, lat, lng, region?],
// sorted by population, largest first. The ids are GeoNames ids, the same ones the app's places
// use as `gn:<id>`.
import { distanceKm } from '@travelog/core';

export type City = {
  /** GeoNames id as text. */
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2, e.g. 'IN'. */
  countryCode: string;
  /** State code, only present for US cities, to tell same-named cities apart. */
  region?: string;
  lat: number;
  lng: number;
};

type Row = [number, string, string, number, number, string?];

declare const require: (id: string) => unknown;

// A few territories are drawn as part of their parent country on the globe.
const PARENT_COUNTRY: Record<string, string> = {
  RE: 'FR',
  MQ: 'FR',
  GP: 'FR',
  GF: 'FR',
  YT: 'FR',
};

/** The country code to use for flags and for marking a country on the globe. */
export function countryCodeOnGlobe(countryCode: string): string {
  return PARENT_COUNTRY[countryCode] ?? countryCode;
}

/** Lower-case and strip accents and punctuation, so "sao" finds "São Paulo". */
export function foldText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9 ]/g, '');
}

let rows: Row[] | null = null;
let folded: string[] | null = null;
let byCountry: Map<string, Row[]> | null = null;
let byId: Map<string, Row> | null = null;

// The list is about 1 MB, so it is only loaded and indexed the first time it is needed.
function load(): { rows: Row[]; folded: string[] } {
  if (!rows || !folded) {
    rows = require('./data/cities.json') as Row[];
    folded = rows.map((r) => foldText(r[1]));
  }
  return { rows, folded };
}

function toCity(r: Row): City {
  return { id: String(r[0]), name: r[1], countryCode: r[2], lat: r[3], lng: r[4], region: r[5] };
}

/**
 * Cities whose name starts with the query, largest first. If that leaves room, cities with a
 * later word starting with the query are added ("york" finds "New York City").
 */
export function searchCities(query: string, limit = 30): City[] {
  const q = foldText(query.trim());
  if (q.length < 2) return [];
  const data = load();
  const out: City[] = [];
  const later: City[] = [];
  const inner = ' ' + q;
  for (let i = 0; i < data.folded.length && out.length < limit; i++) {
    const name = data.folded[i]!;
    if (name.startsWith(q)) out.push(toCity(data.rows[i]!));
    else if (later.length < limit && name.includes(inner)) later.push(toCity(data.rows[i]!));
  }
  return out.concat(later).slice(0, limit);
}

/**
 * The best-known cities of a country as drawn on the globe: its largest, skipping any that sit
 * within `minGapKm` of one already chosen so the dots do not pile up.
 */
export function topCities(countryCode: string, limit = 8, minGapKm = 40): City[] {
  if (!byCountry) {
    byCountry = new Map();
    for (const r of load().rows) {
      const code = countryCodeOnGlobe(r[2]);
      const list = byCountry.get(code);
      if (list) list.push(r);
      else byCountry.set(code, [r]);
    }
  }
  const out: City[] = [];
  for (const r of byCountry.get(countryCode) ?? []) {
    if (out.length >= limit) break;
    const c = toCity(r);
    if (out.every((o) => distanceKm(o, c) >= minGapKm)) out.push(c);
  }
  return out;
}

export function cityById(id: string): City | undefined {
  if (!byId) {
    byId = new Map();
    for (const r of load().rows) byId.set(String(r[0]), r);
  }
  const r = byId.get(id);
  return r ? toCity(r) : undefined;
}

/** The app's place id for a city (`gn:<geonameid>`). */
export function cityPlaceId(city: City): string {
  return `gn:${city.id}`;
}
