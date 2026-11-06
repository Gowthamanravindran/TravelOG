#!/usr/bin/env node
/**
 * Builds the phone's airports list (Plan 35) from OurAirports (public domain):
 *   node scripts/places/airports.mjs
 * Writes apps/mobile/assets/places/airports.places.
 */
import { writeFileSync } from 'node:fs';

import { airportsCompact, buildAirports, checkAirports } from './airports-lib.mjs';

const URL_CSV = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const OUT = new URL('../../apps/mobile/assets/places/airports.places', import.meta.url);
const KNOWN = [
  { iata: 'BLR', country: 'IN' },
  { iata: 'BOM', country: 'IN' },
  { iata: 'DEL', country: 'IN' },
  { iata: 'GOI', country: 'IN' },
  { iata: 'GOX', country: 'IN' },
  { iata: 'NRT', country: 'JP' },
  { iata: 'CDG', country: 'FR' },
  { iata: 'DXB', country: 'AE' },
];

const res = await fetch(URL_CSV);
if (!res.ok) throw new Error(`OurAirports: HTTP ${res.status}`);
const airports = buildAirports(await res.text());
const errors = checkAirports(airports, KNOWN);
const text = JSON.stringify(airportsCompact(airports, new Date().toISOString().slice(0, 10)));
if (text.length > 400_000)
  errors.push(`the airports list is ${text.length} bytes; keep it under 400 KB`);
if (errors.length) {
  console.error(`Airports build stopped:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
writeFileSync(OUT, text);
console.log(`airports: ${airports.length} rows, ${text.length} bytes`);
