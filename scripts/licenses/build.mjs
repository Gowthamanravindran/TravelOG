// Plan 52: everything the mobile app ships that has its own licence.
// - apps/mobile/assets/licenses.json: every open-source package, for the Licences screen
// - apps/mobile/assets/notices.json: art, fonts and data, with full licence texts
// - THIRD_PARTY_NOTICES.md: the same notices for the repository
// Run after adding or updating a dependency, art or fonts:  pnpm licenses:build
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const app = path.join(root, 'apps/mobile');
const raw = execFileSync('pnpm', ['licenses', 'list', '--prod', '--json'], {
  cwd: app,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
const byLicense = JSON.parse(raw);
const packages = [];
for (const [license, list] of Object.entries(byLicense))
  for (const p of list)
    if (!p.name.startsWith('@travelog/'))
      packages.push({
        name: p.name,
        version: p.versions.join(', '),
        license,
        homepage: p.homepage ?? null,
        author: typeof p.author === 'string' ? p.author : (p.author?.name ?? null),
      });
packages.sort((a, b) => a.name.localeCompare(b.name));
const out = path.join(app, 'assets/licenses.json');
writeFileSync(out, JSON.stringify({ packages }, null, 1) + '\n');
console.log(`Wrote ${packages.length} packages to ${path.relative(root, out)}`);

// Art, fonts and data: full texts read from their own licence files.
const font = (pkg) =>
  readFileSync(
    path.join(root, 'node_modules/@expo-google-fonts', pkg, 'LICENSE_FONT'),
    'utf8',
  ).trim();
const notices = [
  {
    group: 'Illustrations',
    name: 'Microsoft Fluent Emoji 3D',
    use: 'The 3D objects on trip cards, headers, Today and empty screens.',
    license: 'MIT',
    source: 'https://github.com/microsoft/fluentui-emoji',
    text: readFileSync(path.join(app, 'assets/art/LICENSE'), 'utf8').replace(/^ {4}/gm, '').trim(),
  },
  {
    group: 'Fonts',
    name: 'Plus Jakarta Sans',
    use: 'Headings.',
    license: 'SIL Open Font License 1.1',
    source: 'https://github.com/tokotype/PlusJakartaSans',
    text: font('plus-jakarta-sans'),
  },
  {
    group: 'Fonts',
    name: 'Figtree',
    use: 'Body text.',
    license: 'SIL Open Font License 1.1',
    source: 'https://github.com/erikdkennedy/figtree',
    text: font('figtree'),
  },
  {
    group: 'Icons',
    name: 'Material Symbols (Google)',
    use: 'Icons on Android, through expo-symbols. On iPhone, icons are Apple SF Symbols provided by the system.',
    license: 'Apache License 2.0',
    source: 'https://github.com/google/material-design-icons',
    text: font('material-symbols'),
  },
  {
    group: 'Place data',
    name: 'GeoNames',
    use: 'Cities, regions and countries for destination search and the globe.',
    license: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
    source: 'https://www.geonames.org',
    text: 'Place data © GeoNames (geonames.org), licensed under CC BY 4.0: https://creativecommons.org/licenses/by/4.0/',
  },
  {
    group: 'Place data',
    name: 'OpenStreetMap',
    use: 'Places found online, through Geoapify.',
    license: 'Open Database License (ODbL) 1.0',
    source: 'https://www.openstreetmap.org/copyright',
    text: '© OpenStreetMap contributors. Data available under the Open Database License: https://opendatacommons.org/licenses/odbl/1-0/',
  },
  {
    group: 'Globe',
    name: 'MapLibre GL JS',
    use: 'Draws the globe on the Trips tab (bundled in packages/globe).',
    license: 'BSD 3-Clause',
    source: 'https://github.com/maplibre/maplibre-gl-js',
    text: [
      'Copyright (c) 2023, MapLibre contributors. All rights reserved.',
      '',
      'Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:',
      '',
      '* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.',
      '* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.',
      '* Neither the name of MapLibre GL JS nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.',
      '',
      'THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.',
      '',
      'MapLibre GL JS contains code from Mapbox GL JS v1.13 and earlier (Copyright (c) 2020, Mapbox, BSD 3-Clause) and other projects; their notices are in the LICENSE.txt of the source repository.',
    ].join('\n'),
  },
  {
    group: 'Globe',
    name: 'Natural Earth',
    use: 'Country shapes and borders on the globe.',
    license: 'Public domain',
    source: 'https://www.naturalearthdata.com',
    text: 'Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.',
  },
  {
    group: 'Globe',
    name: 'flag-icons',
    use: 'Country flags on the globe and in country search.',
    license: 'MIT',
    source: 'https://github.com/lipis/flag-icons',
    text: [
      'The MIT License (MIT)',
      '',
      'Copyright (c) 2013 Panayiotis Lipiridis',
      '',
      'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:',
      '',
      'The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.',
      '',
      'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.',
    ].join('\n'),
  },
];
writeFileSync(path.join(app, 'assets/notices.json'), JSON.stringify({ notices }, null, 1) + '\n');

const photos = JSON.parse(readFileSync(path.join(app, 'assets/destinations.json'), 'utf8')).photos;
const md = [
  '# Third-party notices',
  '',
  'TravelOG includes the following work by others. Generated by `pnpm licenses:build`; do not edit by hand.',
  'The full list of open-source packages and their licences is in `apps/mobile/assets/licenses.json` and in the app (Profile → Licences and credits).',
  '',
  ...notices.flatMap((n) => [
    `## ${n.name}`,
    '',
    `${n.group}. ${n.use}`,
    '',
    `Licence: ${n.license}. Source: ${n.source}`,
    '',
    '```',
    n.text,
    '```',
    '',
  ]),
  ...(photos.length
    ? [
        '## Destination photos',
        '',
        'Trip cover photos served from our media bucket (Plan 53), listed in `data/destinations/destinations.csv`.',
        '',
        ...photos.map(
          (p) =>
            `- \`${p.key}\`: ${p.credit}. Licence: ${p.license}.${p.source ? ` Source: ${p.source}` : ''}`,
        ),
        '',
      ]
    : []),
].join('\n');
writeFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), md);
console.log(
  `Wrote ${notices.length} notices to apps/mobile/assets/notices.json and THIRD_PARTY_NOTICES.md`,
);
