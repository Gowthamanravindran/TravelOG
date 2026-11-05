/**
 * Places for destination autocomplete (Plan 29): cities, regions, countries and
 * continents from open data (GeoNames, OpenStreetMap). Pure ranking and wording;
 * storage lives in @travelog/db and the Supabase places table.
 */

export type PlaceKind = 'city' | 'region' | 'country' | 'continent';
export type PlaceSource = 'geonames' | 'osm' | 'ours';

export interface Place {
  /** Stable id: `gn:<geonameid>`, `osm:<type><id>`, `ctry:JP`, `cont:AS`. */
  id: string;
  kind: PlaceKind;
  name: string;
  countryCode: string | null;
  countryName: string | null;
  /** State or province, when known. */
  region: string | null;
  continent: string | null;
  lat: number | null;
  lng: number | null;
  /** IANA zone, e.g. Asia/Tokyo (stored, never shown as is). */
  timeZone: string | null;
  /** ISO 4217 code, e.g. JPY. */
  currency: string | null;
  population: number;
  /** Extra ranking from our corrections file (popular destinations). */
  boost: number;
  /** Other names and old names (Bangalore, Bombay, Coorg). */
  aliases: string[];
  source: PlaceSource;
}

/** Lowercase, accents removed, punctuation to spaces, single spaces. */
export function normalizePlace(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const KIND_ORDER: Record<PlaceKind, number> = { city: 3, region: 2, country: 1, continent: 0 };

function matchScore(name: string, q: string): number {
  const n = normalizePlace(name);
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  if (n.split(' ').some((w) => w.startsWith(q))) return 50;
  return 0;
}

/**
 * Places matching the typed text, best first: exact or prefix matches on the name,
 * then aliases, bigger and boosted places first, the home country ahead.
 */
export function rankPlaces(
  places: readonly Place[],
  query: string,
  { homeCountry }: { homeCountry?: string | null } = {},
): Place[] {
  const q = normalizePlace(query);
  if (!q) return [];
  const scored: { p: Place; score: number }[] = [];
  for (const p of places) {
    const own = matchScore(p.name, q);
    const alias = Math.max(0, ...p.aliases.map((a) => matchScore(a, q) - 10));
    const match = Math.max(own, alias);
    if (!match) continue;
    const size = Math.log10(Math.max(1, p.population)) * 3;
    const home = homeCountry && p.countryCode === homeCountry ? 15 : 0;
    scored.push({ p, score: match + size + p.boost + home + KIND_ORDER[p.kind] * 0.1 });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.p);
}

/** Two-line label for a result: "Tokyo" / "Japan". */
export function placeLabel(p: Place): { title: string; subtitle: string } {
  switch (p.kind) {
    case 'continent':
      return { title: p.name, subtitle: 'Continent' };
    case 'country':
      return { title: p.name, subtitle: p.continent ?? 'Country' };
    default:
      return {
        title: p.name,
        subtitle:
          [p.kind === 'city' ? null : p.region, p.countryName].filter(Boolean).join(', ') ||
          'Place',
      };
  }
}

/** What the trip shows as its destination: "Tokyo, Japan". */
export function placeText(p: Place): string {
  if (p.kind === 'country' || p.kind === 'continent' || !p.countryName) return p.name;
  return `${p.name}, ${p.countryName}`;
}

/** "Japan time (GMT+9)" — never the raw zone id. */
export function timeZoneLabel(
  timeZone: string,
  countryName: string | null,
  at: Date = new Date(),
): string {
  const city = timeZone.split('/').pop()?.replace(/_/g, ' ') ?? timeZone;
  let offset = '';
  try {
    offset =
      new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
        .formatToParts(at)
        .find((x) => x.type === 'timeZoneName')?.value ?? '';
  } catch {
    // Unknown zone or no Intl time-zone data: name only.
  }
  // Time-zone data differs between devices: some write "GMT+0" for Greenwich time.
  if (/^(GMT|UTC)[+-]0(:00)?$/.test(offset)) offset = 'GMT';
  const name = `${countryName ?? city} time`;
  return offset ? `${name} (${offset})` : name;
}

/** "Japanese Yen (JPY)" — the code alone if the name is unknown. */
export function currencyLabel(code: string): string {
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'currency', fallback: 'none' }).of(code);
    return name ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

const KINDS: readonly PlaceKind[] = ['city', 'region', 'country', 'continent'];
const SOURCES: readonly PlaceSource[] = ['geonames', 'osm', 'ours'];

/** The phone's seed file (scripts/places): one column list and plain rows. */
export function placesFromCompact(file: {
  version: string;
  columns: string[];
  rows: unknown[][];
}): { version: string; places: Place[] } {
  return {
    version: file.version,
    places: file.rows.map((r) => {
      const v = Object.fromEntries(file.columns.map((c, i) => [c, r[i]])) as Record<
        string,
        unknown
      >;
      return {
        id: String(v.id),
        kind: v.kind as PlaceKind,
        name: String(v.name),
        countryCode: (v.countryCode as string) ?? null,
        countryName: (v.countryName as string) ?? null,
        region: (v.region as string) ?? null,
        continent: (v.continent as string) ?? null,
        lat: (v.lat as number) ?? null,
        lng: (v.lng as number) ?? null,
        timeZone: (v.timeZone as string) ?? null,
        currency: (v.currency as string) ?? null,
        population: Number(v.population) || 0,
        boost: Number(v.boost) || 0,
        aliases: v.aliases ? String(v.aliases).split('|') : [],
        source: v.source as PlaceSource,
      };
    }),
  };
}

/** A row from our Supabase `places` table (snake_case), or null if it isn't a place we show. */
export function placeFromServerRow(r: Record<string, unknown>): Place | null {
  const kind = r.kind as PlaceKind;
  const source = r.source as PlaceSource;
  if (!KINDS.includes(kind) || !SOURCES.includes(source) || typeof r.name !== 'string') return null;
  const str = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : null);
  const num = (k: string) => (typeof r[k] === 'number' ? (r[k] as number) : null);
  return {
    id: String(r.id),
    kind,
    name: r.name,
    countryCode: str('country_code'),
    countryName: str('country_name'),
    region: str('region'),
    continent: str('continent'),
    lat: num('lat'),
    lng: num('lng'),
    timeZone: str('time_zone'),
    currency: str('currency'),
    population: num('population') ?? 0,
    boost: num('boost') ?? 0,
    aliases: Array.isArray(r.aliases)
      ? r.aliases.filter((a): a is string => typeof a === 'string')
      : [],
    source,
  };
}
