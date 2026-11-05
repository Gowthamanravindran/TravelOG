import fs from 'node:fs';
import path from 'node:path';

import { rotationStyle } from '@/components/studio/rotation';

/**
 * Plan 25: on the new renderer, a `transform` that changes from an array to
 * `undefined`/`null` crashes ("Cannot read property 'forEach' of null"). It
 * happened whenever a collage item rotated back to exactly 0°. Transforms must
 * always be arrays.
 */
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : files(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

it('never sets a transform that can be undefined or null', () => {
  const offenders = files(path.join(__dirname, '..')).flatMap((f) =>
    fs
      .readFileSync(f, 'utf8')
      .split('\n')
      .map((line, i) => ({ line, at: `${path.basename(f)}:${i + 1}` }))
      .filter(({ line }) => /transform:.*\?.*:\s*(undefined|null)\b/.test(line))
      .map(({ at }) => at),
  );
  expect(offenders).toEqual([]);
});

it('rotationStyle is always an array with a finite angle', () => {
  expect(rotationStyle(0)).toEqual([{ rotate: '0deg' }]);
  expect(rotationStyle(15.5)).toEqual([{ rotate: '15.5deg' }]);
  expect(rotationStyle(Number.NaN)).toEqual([{ rotate: '0deg' }]);
  expect(rotationStyle(Number.POSITIVE_INFINITY)).toEqual([{ rotate: '0deg' }]);
  expect(rotationStyle(undefined)).toEqual([{ rotate: '0deg' }]);
});
