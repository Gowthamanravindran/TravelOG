import fs from 'node:fs';
import path from 'node:path';

/**
 * Plan 20: the app must open in Expo Go and in older builds. Importing a native
 * package that isn't in them crashes every screen that uses it, so these may not
 * be imported anywhere in the app (use a JS alternative or an optional module).
 */
const NOT_IN_EXPO_GO = ['@react-native-community/datetimepicker'];

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : files(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

it('imports no native package that Expo Go lacks', () => {
  const offenders = files(path.join(__dirname, '..')).filter((f) => {
    const src = fs.readFileSync(f, 'utf8');
    return NOT_IN_EXPO_GO.some((pkg) => src.includes(`'${pkg}'`) || src.includes(`"${pkg}"`));
  });
  expect(offenders).toEqual([]);
});
