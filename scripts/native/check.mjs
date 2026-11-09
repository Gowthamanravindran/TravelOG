import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkNative } from './lib.mjs';

/**
 * Fails when the app depends on a package with native code that isn't in
 * apps/mobile/native-packages.json: the installed app (Expo Go or the owner's
 * development build) doesn't have it, and using it crashes (Plan 48).
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const appDir = path.join(root, 'apps/mobile');
const list = JSON.parse(fs.readFileSync(path.join(appDir, 'native-packages.json'), 'utf8'));
const { native, unlisted, unused } = checkNative(appDir, list.packages);

for (const name of unlisted)
  console.error(
    `✗ ${name} has native code and isn't in the installed app. Draw or do it in JS instead, ` +
      'or add it to apps/mobile/native-packages.json and tell the owner a new development build is needed.',
  );
for (const name of unused)
  console.error(`✗ ${name} is in native-packages.json but not a dependency any more: remove it.`);
if (unlisted.length || unused.length) process.exit(1);
console.log(`Native packages: ${native.length}, all in the installed app (${list.lastBuild}).`);
