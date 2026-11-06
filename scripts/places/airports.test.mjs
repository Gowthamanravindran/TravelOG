import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { airportsCompact, buildAirports, checkAirports, parseCsv } from './airports-lib.mjs';

const csv = readFileSync(new URL('./fixtures/airports.csv', import.meta.url), 'utf8');

test('reads quoted CSV cells, including "" inside quotes', () => {
  assert.deepEqual(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\n'), [
    ['a', 'b, c', 'say "hi"'],
    ['1', '2', '3'],
  ]);
});

test('keeps airports with scheduled flights and an IATA code', () => {
  assert.deepEqual(buildAirports(csv), [
    {
      iata: 'BLR',
      city: 'Bengaluru',
      country: 'IN',
      name: 'Kempegowda International Airport Bengaluru',
    },
    { iata: 'GOI', city: 'Vasco da Gama', country: 'IN', name: 'Dabolim Airport' },
    { iata: 'GOX', city: 'Mopa', country: 'IN', name: 'Manohar International Airport' },
    { iata: 'NRT', city: 'Narita', country: 'JP', name: 'Narita International Airport' },
  ]);
});

test('stops the build when known airports are missing or the list is short', () => {
  const errors = checkAirports(buildAirports(csv), [{ iata: 'CDG', country: 'FR' }]);
  assert.deepEqual(errors, ['only 4 airports', 'CDG (FR) is missing']);
});

test('writes one compact row per airport', () => {
  const c = airportsCompact(buildAirports(csv).slice(0, 1), '2026-11-06');
  assert.deepEqual(c.rows, [
    ['BLR', 'Bengaluru', 'IN', 'Kempegowda International Airport Bengaluru'],
  ]);
});
