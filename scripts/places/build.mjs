#!/usr/bin/env node
/**
 * Builds the phone's basic places seed (Plan 29) from GeoNames and our corrections:
 *   node scripts/places/build.mjs
 * Writes apps/mobile/assets/places/basic.places only if every check passes.
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
const errors = checkPlaces(places, {
  known: KNOWN,
  minCities: 20000,
  minCountries: 240,
  previousCount: previous > 100 ? previous : undefined,
});
if (errors.length) {
  console.error(`Places build stopped:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
const version = new Date().toISOString().slice(0, 10);
writeFileSync(OUT, JSON.stringify(toCompact(places, version)));
const kinds = Object.groupBy(places, (p) => p.kind);
console.log(
  `places ${version}: ${places.length} rows (previously ${previous}) — ` +
    Object.entries(kinds)
      .map(([k, v]) => `${v.length} ${k}`)
      .join(', '),
);
