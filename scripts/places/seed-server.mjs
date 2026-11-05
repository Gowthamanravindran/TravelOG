#!/usr/bin/env node
/**
 * Loads the full places data into our Supabase `places` table (Plan 29): every
 * town over 500 people, regions, countries, continents and our own places.
 *   SUPABASE_DB_URL=postgresql://… node scripts/places/seed-server.mjs
 * Uses the database connection string (a GitHub secret, like the DB password for
 * migrations); the service-role key stays in Supabase (docs/14 §4). Upserts by id,
 * so re-running refreshes rows and keeps places found online.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

import { KNOWN } from './known.mjs';
import { geonames } from './download.mjs';
import {
  buildPlaces,
  checkPlaces,
  normalize,
  parseAdmin1,
  parseCities,
  parseCountries,
  parseTimeZones,
} from './lib.mjs';

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('Set SUPABASE_DB_URL (GitHub secret STAGING_DB_URL, docs/14 §4).');
  process.exit(1);
}
const overrides = JSON.parse(
  readFileSync(new URL('../../data/places/overrides.json', import.meta.url), 'utf8'),
);
const places = buildPlaces({
  countries: parseCountries(await geonames('countryInfo.txt')),
  timeZones: parseTimeZones(await geonames('timeZones.txt')),
  admin1: parseAdmin1(await geonames('admin1CodesASCII.txt')),
  cities: parseCities(await geonames('cities500.zip')),
  overrides,
  minPopulation: 500,
});
const errors = checkPlaces(places, { known: KNOWN, minCities: 150000, minCountries: 240 });
if (errors.length) {
  console.error(`Seeding stopped:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

const COLUMNS = [
  'id',
  'kind',
  'name',
  'country_code',
  'country_name',
  'region',
  'continent',
  'lat',
  'lng',
  'time_zone',
  'currency',
  'population',
  'boost',
  'aliases',
  'source',
  'search',
];
const csv = (v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`);
const pgArray = (xs) =>
  `{${xs.map((x) => `"${x.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')}}`;
const line = (p) =>
  [
    p.id,
    p.kind,
    p.name,
    p.countryCode,
    p.countryName,
    p.region,
    p.continent,
    p.lat,
    p.lng,
    p.timeZone,
    p.currency,
    p.population,
    p.boost,
    pgArray(p.aliases),
    p.source,
    [p.name, ...p.aliases].map(normalize).join(' | '),
  ]
    .map(csv)
    .join(',');

const file = '.places-cache/places.csv';
writeFileSync(file, places.map(line).join('\n') + '\n');
const set = COLUMNS.filter((c) => c !== 'id')
  .map((c) => `${c} = excluded.${c}`)
  .join(', ');
// One psql session: each -c runs in turn, so the temp table lives until the end.
const statements = [
  'create temp table incoming (like public.places including defaults);',
  `\\copy incoming (${COLUMNS.join(', ')}) from '${file}' with (format csv)`,
  `insert into public.places (${COLUMNS.join(', ')}) select ${COLUMNS.join(', ')} from incoming on conflict (id) do update set ${set};`,
  'select count(*) as places from public.places;',
];
execFileSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', ...statements.flatMap((s) => ['-c', s])], {
  stdio: 'inherit',
});
console.log(`Seeded ${places.length} places.`);
