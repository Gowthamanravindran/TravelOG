import assert from 'node:assert/strict';
import { test } from 'node:test';

import { encode, isBlurhashValid } from 'blurhash';
import sharp from 'sharp';

import { normalizePlace, parseCsv, rowProblems } from './destinations.mjs';

test('reads CSV rows, quoted fields included', () => {
  const rows = parseCsv(
    'file,places,credit,license\ngoa.jpg,"Goa;Panaji",Asha,"Own photo, with permission"\n',
  );
  assert.deepEqual(rows, [
    {
      file: 'goa.jpg',
      places: 'Goa;Panaji',
      credit: 'Asha',
      license: 'Own photo, with permission',
    },
  ]);
});

test('every photo needs a credit, a licence and something to match', () => {
  assert.deepEqual(
    rowProblems({ file: 'goa.jpg', places: 'Goa', credit: 'A', license: 'Own photo' }),
    [],
  );
  assert.deepEqual(
    rowProblems({ file: 'india.jpg', country: 'IN', credit: 'A', license: 'CC BY 4.0' }),
    [],
  );
  assert.ok(
    rowProblems({ file: 'goa.jpg', places: 'Goa', license: 'x' }).includes('credit is required'),
  );
  assert.ok(
    rowProblems({ file: 'goa.jpg', places: 'Goa', credit: 'A' }).includes('license is required'),
  );
  assert.equal(rowProblems({ file: 'x.jpg', credit: 'A', license: 'B' }).length, 1);
  assert.equal(
    rowProblems({ file: '../evil.jpg', places: 'Goa', credit: 'A', license: 'B' }).length,
    1,
  );
});

test('names normalise the same way as the app (accents, case, punctuation)', () => {
  assert.equal(normalizePlace('  São Paulo '), 'sao paulo');
  assert.equal(normalizePlace('Spiti-Valley'), 'spiti valley');
});

test('a photo turns into a valid BlurHash preview', async () => {
  const img = sharp({
    create: { width: 64, height: 40, channels: 3, background: { r: 30, g: 120, b: 200 } },
  });
  const small = await img
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const hash = encode(new Uint8ClampedArray(small.data), small.info.width, small.info.height, 4, 3);
  assert.equal(isBlurhashValid(hash).result, true);
});
