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

it('no fontWeight outside collage content (Android ignores it with custom fonts)', () => {
  const offenders = files(path.join(__dirname, '..'))
    .filter((f) => !f.includes(`${path.sep}components${path.sep}studio${path.sep}`))
    .flatMap((f) =>
      fs
        .readFileSync(f, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, at: `${path.basename(f)}:${i + 1}` }))
        .filter(({ line }) => /fontWeight/.test(line))
        .map(({ at }) => at),
    );
  expect(offenders).toEqual([]);
});

it('no ghost buttons (one outlined secondary style, Plan 26)', () => {
  const offenders = files(path.join(__dirname, '..')).filter((f) =>
    fs.readFileSync(f, 'utf8').includes('variant="ghost"'),
  );
  expect(offenders.map((f) => path.basename(f))).toEqual([]);
});

it('no hex colours in app chrome (colours come from the theme, Plan 26)', () => {
  // Collage content and the icon map keep their own colours; appearance-card shows theme specimens.
  const allowed = [
    `${path.sep}components${path.sep}studio${path.sep}`,
    `${path.sep}studio${path.sep}`,
    `${path.sep}ui${path.sep}icon.tsx`,
    `${path.sep}components${path.sep}appearance-card.tsx`,
  ];
  const offenders = files(path.join(__dirname, '..'))
    .filter((f) => !allowed.some((a) => f.includes(a)))
    .flatMap((f) =>
      fs
        .readFileSync(f, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, at: `${path.basename(f)}:${i + 1}` }))
        .filter(({ line }) => /#[0-9A-Fa-f]{6}\b/.test(line))
        .map(({ at }) => at),
    );
  expect(offenders).toEqual([]);
});

it('nothing bounces: no springs, only eased timing (Plan 32)', () => {
  const offenders = files(path.join(__dirname, '..')).flatMap((f) =>
    fs
      .readFileSync(f, 'utf8')
      .split('\n')
      .map((line, i) => ({ line, at: `${path.basename(f)}:${i + 1}` }))
      .filter(({ line }) => /springify\(|withSpring\b/.test(line))
      .map(({ at }) => at),
  );
  expect(offenders).toEqual([]);
});

it('slide-ins land without a jump: no SafeAreaView, sheets only through BottomSheet (Plan 33)', () => {
  const all = files(path.join(__dirname, '..'));
  const scan = (re: RegExp, skip: string[] = []) =>
    all
      .filter((f) => !skip.some((s) => f.endsWith(s)))
      .flatMap((f) =>
        fs
          .readFileSync(f, 'utf8')
          .split('\n')
          .map((line, i) => ({ line, at: `${path.basename(f)}:${i + 1}` }))
          .filter(({ line }) => re.test(line))
          .map(({ at }) => at),
      );
  // SafeAreaView measures insets from where it sits, so it changes padding as a page slides in.
  expect(scan(/\bSafeAreaView\b/)).toEqual([]);
  // A plain Modal settles its window after the first frame on Android.
  expect(scan(/<Modal\b/, [`ui${path.sep}bottom-sheet.tsx`])).toEqual([]);
});
