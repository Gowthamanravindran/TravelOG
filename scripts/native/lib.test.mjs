import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { checkNative } from './lib.mjs';

/** A tiny app folder: one JS-only dependency and three kinds of native ones. */
function fixture() {
  const app = fs.mkdtempSync(path.join(os.tmpdir(), 'native-'));
  const deps = ['js-only', 'expo-thing', 'gradle-thing', 'pod-thing'];
  fs.writeFileSync(
    path.join(app, 'package.json'),
    JSON.stringify({ dependencies: Object.fromEntries(deps.map((d) => [d, '1.0.0'])) }),
  );
  const put = (file, body = '') => {
    fs.mkdirSync(path.dirname(path.join(app, 'node_modules', file)), { recursive: true });
    fs.writeFileSync(path.join(app, 'node_modules', file), body);
  };
  for (const d of deps) put(`${d}/package.json`, JSON.stringify({ name: d }));
  put('expo-thing/expo-module.config.json', '{}');
  put('gradle-thing/android/build.gradle');
  put('pod-thing/PodThing.podspec');
  return app;
}

test('finds packages with native code, and ignores JS-only ones', () => {
  const r = checkNative(fixture(), {});
  assert.deepEqual(r.native.sort(), ['expo-thing', 'gradle-thing', 'pod-thing']);
});

test('flags native packages missing from the list, and listed ones no longer used', () => {
  const r = checkNative(fixture(), { 'expo-thing': 'ok', 'gradle-thing': 'ok', 'old-thing': 'ok' });
  assert.deepEqual(r.unlisted, ['pod-thing']);
  assert.deepEqual(r.unused, ['old-thing']);
});
