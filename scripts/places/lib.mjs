/**
 * Places data pipeline (Plan 29): turns GeoNames dumps (CC-BY 4.0) plus our
 * corrections file into place rows for the phone's seed and the Supabase table.
 * Pure functions, tested in lib.test.mjs; build.mjs does the downloading.
 */

/** Same rule as @travelog/core normalizePlace (scripts are plain Node and can't import it). */
export function normalize(s) {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const CONTINENTS = {
  AF: 'Africa',
  AN: 'Antarctica',
  AS: 'Asia',
  EU: 'Europe',
  NA: 'North America',
  OC: 'Oceania',
  SA: 'South America',
};

const rows = (text) =>
  text
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('\t'));

/** countryInfo.txt → Map code → country facts. */
export function parseCountries(text) {
  const out = new Map();
  for (const c of rows(text)) {
    out.set(c[0], {
      code: c[0],
      name: c[4],
      capital: c[5] || null,
      population: Number(c[7]) || 0,
      continentCode: c[8],
      currency: c[10] || null,
    });
  }
  return out;
}

/** timeZones.txt → Map country code → its first (main) time zone. */
export function parseTimeZones(text) {
  const out = new Map();
  for (const [cc, tz] of rows(text)) if (cc !== 'CountryCode' && !out.has(cc)) out.set(cc, tz);
  return out;
}

/** admin1CodesASCII.txt → Map "IN.33" → { name, ascii }. */
export function parseAdmin1(text) {
  const out = new Map();
  for (const [key, name, ascii] of rows(text)) out.set(key, { name, ascii });
  return out;
}

/** citiesNNNN.txt → city rows. */
export function parseCities(text) {
  return rows(text).map((c) => ({
    id: c[0],
    name: c[1],
    ascii: c[2],
    alternates: c[3] ? c[3].split(',') : [],
    lat: Number(c[4]),
    lng: Number(c[5]),
    country: c[8],
    admin1: c[10],
    population: Number(c[14]) || 0,
    timeZone: c[17] || null,
  }));
}

const LATIN = /^\p{Script=Latin}[\p{Script=Latin}\s'.-]*$/u;
const MAX_ALIASES = 6;

/** Readable other names: Latin script, not codes (TYO, BLR), not the name itself. */
function aliasesFor(name, candidates) {
  const own = normalize(name);
  const seen = new Set([own]);
  const out = [];
  for (const raw of candidates) {
    const a = raw.trim();
    if (a.length < 3 || a.length > 40 || !LATIN.test(a) || !/\p{Ll}/u.test(a)) continue;
    const k = normalize(a);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
    if (out.length >= MAX_ALIASES) break;
  }
  return out;
}

const place = (p) => ({
  id: p.id,
  kind: p.kind,
  name: p.name,
  countryCode: p.countryCode ?? null,
  countryName: p.countryName ?? null,
  region: p.region ?? null,
  continent: p.continent ?? null,
  lat: p.lat ?? null,
  lng: p.lng ?? null,
  timeZone: p.timeZone ?? null,
  currency: p.currency ?? null,
  population: p.population ?? 0,
  boost: p.boost ?? 0,
  aliases: p.aliases ?? [],
  source: p.source ?? 'geonames',
});

/**
 * All place rows: 7 continents, every country, cities with at least `minPopulation`
 * people, the states/provinces those cities are in, and our own places and fixes.
 */
export function buildPlaces({
  countries,
  timeZones,
  admin1,
  cities,
  overrides = {},
  minPopulation,
}) {
  const out = [];
  const countryOf = (cc) => countries.get(cc);
  const continentOf = (cc) => CONTINENTS[countryOf(cc)?.continentCode] ?? null;

  const continentPopulation = {};
  for (const c of countries.values())
    continentPopulation[c.continentCode] =
      (continentPopulation[c.continentCode] ?? 0) + c.population;
  for (const [code, name] of Object.entries(CONTINENTS))
    out.push(
      place({
        id: `cont:${code}`,
        kind: 'continent',
        name,
        population: continentPopulation[code] ?? 0,
      }),
    );

  const kept = cities.filter((c) => c.population >= minPopulation && countries.has(c.country));
  for (const c of countries.values()) {
    const capital = cities.find((x) => x.country === c.code && x.name === c.capital);
    out.push(
      place({
        id: `ctry:${c.code}`,
        kind: 'country',
        name: c.name,
        countryCode: c.code,
        countryName: c.name,
        continent: CONTINENTS[c.continentCode] ?? null,
        lat: capital?.lat,
        lng: capital?.lng,
        timeZone: timeZones.get(c.code) ?? capital?.timeZone ?? null,
        currency: c.currency,
        population: c.population,
      }),
    );
  }

  // States and provinces that hold at least one kept city; facts from their largest city.
  const regions = new Map();
  for (const c of kept) {
    const key = `${c.country}.${c.admin1}`;
    const a = admin1.get(key);
    if (!a) continue;
    const r = regions.get(key) ?? { key, a, country: c.country, largest: c, population: 0 };
    r.population += c.population;
    if (c.population > r.largest.population) r.largest = c;
    regions.set(key, r);
  }
  for (const r of regions.values()) {
    const country = countryOf(r.country);
    out.push(
      place({
        id: `adm1:${r.key}`,
        kind: 'region',
        name: r.a.name,
        countryCode: r.country,
        countryName: country.name,
        continent: continentOf(r.country),
        lat: r.largest.lat,
        lng: r.largest.lng,
        timeZone: r.largest.timeZone,
        currency: country.currency,
        population: r.population,
        aliases: aliasesFor(r.a.name, [r.a.ascii]),
      }),
    );
  }

  for (const c of kept) {
    const country = countryOf(c.country);
    out.push(
      place({
        id: `gn:${c.id}`,
        kind: 'city',
        name: c.name,
        countryCode: c.country,
        countryName: country.name,
        region: admin1.get(`${c.country}.${c.admin1}`)?.name ?? null,
        continent: continentOf(c.country),
        lat: c.lat,
        lng: c.lng,
        timeZone: c.timeZone,
        currency: country.currency,
        population: c.population,
        aliases: aliasesFor(c.name, [c.ascii, ...c.alternates]),
      }),
    );
  }

  for (const o of overrides.places ?? []) {
    const country = countryOf(o.country);
    if (!country) throw new Error(`override place ${o.id}: unknown country ${o.country}`);
    out.push(
      place({
        ...o,
        countryCode: o.country,
        countryName: country.name,
        continent: continentOf(o.country),
        currency: o.currency ?? country.currency,
        source: 'ours',
      }),
    );
  }

  const find = (rule) => {
    const hits = out.filter(
      (p) =>
        p.name === rule.name &&
        p.countryCode === rule.country &&
        (!rule.kind || p.kind === rule.kind),
    );
    if (!hits.length) throw new Error(`override matches no place: ${rule.name} (${rule.country})`);
    return hits;
  };
  for (const rule of overrides.aliases ?? [])
    for (const p of find(rule)) p.aliases = aliasesFor(p.name, [...p.aliases, ...rule.add]);
  for (const rule of overrides.boosts ?? []) for (const p of find(rule)) p.boost = rule.boost;

  return out;
}

/**
 * What the phone ships with (Plan 30): continents and countries only, a few KB.
 * Cities and regions come from our Supabase places table as you type.
 */
export function phoneList(places) {
  return places.filter((p) => p.kind === 'continent' || p.kind === 'country');
}

/** Problems that must stop a release; empty when the data looks right. */
export function checkPlaces(places, { known = [], minCities, minCountries, previousCount }) {
  const errors = [];
  const count = (kind) => places.filter((p) => p.kind === kind).length;
  if (count('continent') !== 7) errors.push(`expected 7 continents, found ${count('continent')}`);
  if (count('country') < minCountries) errors.push(`only ${count('country')} countries`);
  if (count('city') < minCities) errors.push(`only ${count('city')} cities`);
  for (const k of known)
    if (!places.some((p) => p.name === k.name && p.countryCode === k.country))
      errors.push(`${k.name} (${k.country}) is missing`);
  const broken = places.filter(
    (p) =>
      !p.name ||
      (p.kind !== 'continent' && !p.countryCode) ||
      (p.kind === 'city' && (!p.timeZone || p.lat == null || p.lng == null)),
  );
  if (broken.length)
    errors.push(
      `incomplete rows: ${broken
        .slice(0, 5)
        .map((p) => p.id)
        .join(', ')}`,
    );
  const noCurrency = places.filter((p) => p.kind === 'country' && p.population > 0 && !p.currency);
  if (noCurrency.length)
    errors.push(`countries without a currency: ${noCurrency.map((p) => p.id).join(', ')}`);
  if (previousCount && places.length < previousCount * 0.9)
    errors.push(`row count dropped from ${previousCount} to ${places.length}`);
  return errors;
}

const COLUMNS = [
  'id',
  'kind',
  'name',
  'countryCode',
  'countryName',
  'region',
  'continent',
  'lat',
  'lng',
  'timeZone',
  'currency',
  'population',
  'boost',
  'aliases',
  'source',
];

/** The phone's seed file: one column list and plain rows, much smaller than objects. */
export function toCompact(places, version) {
  return {
    version,
    credit: 'GeoNames (CC-BY 4.0), geonames.org',
    columns: COLUMNS,
    rows: places.map((p) => COLUMNS.map((c) => (c === 'aliases' ? p.aliases.join('|') : p[c]))),
  };
}

export function fromCompact({ version, columns, rows: data }) {
  return {
    version,
    places: data.map((r) => {
      const p = Object.fromEntries(columns.map((c, i) => [c, r[i]]));
      return { ...p, aliases: p.aliases ? p.aliases.split('|') : [] };
    }),
  };
}
