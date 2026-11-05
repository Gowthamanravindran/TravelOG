#!/usr/bin/env node
/**
 * Builds the phone's basic places list (Plans 29, 30) from GeoNames and our corrections:
 *   node scripts/places/build.mjs
 * Checks the full build, then writes only continents and countries to
 * apps/mobile/assets/places/basic.places (cities come from our server).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { geonames } from './download.mjs';
import { KNOWN } from './known.mjs';
import {
  buildPlaces,
  checkPlaces,
  fromCompact,
  parseAdmin1,
  parseCities,
  parseCountries,
  parseTimeZones,
  phoneList,
  toCompact,
} from './lib.mjs';

const OUT = new URL('../../apps/mobile/assets/places/basic.places', import.meta.url);
const overrides = JSON.parse(
  readFileSync(new URL('../../data/places/overrides.json', import.meta.url), 'utf8'),
);

const places = buildPlaces({
  countries: parseCountries(await geonames('countryInfo.txt')),
  timeZones: parseTimeZones(await geonames('timeZones.txt')),
  admin1: parseAdmin1(await geonames('admin1CodesASCII.txt')),
  cities: parseCities(await geonames('cities15000.zip')),
  overrides,
  minPopulation: 15000,
});

const previous = existsSync(OUT)
  ? fromCompact(JSON.parse(readFileSync(OUT, 'utf8'))).places.length
  : 0;
// The full build is checked (the same data goes to Supabase); the phone keeps a slice.
const errors = checkPlaces(places, { known: KNOWN, minCities: 20000, minCountries: 240 });
const phone = phoneList(places);
const text = JSON.stringify(toCompact(phone, new Date().toISOString().slice(0, 10)));
if (text.length > 200_000)
  errors.push(`the phone list is ${text.length} bytes; keep it under 200 KB`);
if (errors.length) {
  console.error(`Places build stopped:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
writeFileSync(OUT, text);
const kinds = Object.groupBy(phone, (p) => p.kind);
console.log(
  `phone places: ${phone.length} rows, ${text.length} bytes (previously ${previous} rows) — ` +
    Object.entries(kinds)
      .map(([k, v]) => `${v.length} ${k}`)
      .join(', '),
);
