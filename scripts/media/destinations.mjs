// Plan 53: turns data/destinations/destinations.csv into apps/mobile/assets/destinations.json:
// for each photo in the media bucket, its BlurHash preview, size and credit, bundled with the
// app so covers show something at once and work offline. See data/destinations/README.md.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { encode } from 'blurhash';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'data/destinations');

/** Same as normalizePlace in @travelog/core: lowercase, no accents, single spaces. */
export function normalizePlace(s) {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** CSV with quoted fields allowed. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') ((cell += '"'), i++);
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') (row.push(cell), (cell = ''));
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      (row.push(cell), rows.push(row), (row = []), (cell = ''));
    } else cell += c;
  }
  if (cell || row.length) (row.push(cell), rows.push(row));
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

/** Checks a row; returns problems (an empty list when it's fine). */
export function rowProblems(r) {
  const p = [];
  if (!/^[\w.-]+\.(jpe?g|png|webp|avif)$/i.test(r.file ?? ''))
    p.push('file must be a name like goa.jpg');
  if (!r.credit) p.push('credit is required');
  if (!r.license) p.push('license is required');
  if (!r.places && !/^[A-Z]{2}$/.test(r.country ?? ''))
    p.push('give places, or a two-letter country for a country-wide photo');
  return p;
}

const split = (s) =>
  s
    ? s
        .split(';')
        .map((x) => x.trim())
        .filter(Boolean)
    : [];

async function photoBytes(file) {
  const local = path.join(dir, 'photos', file);
  if (existsSync(local)) return readFileSync(local);
  const base = process.env.EXPO_PUBLIC_MEDIA_URL;
  if (!base)
    throw new Error(
      `${file}: no local copy in data/destinations/photos and EXPO_PUBLIC_MEDIA_URL isn't set`,
    );
  const res = await fetch(`${base.replace(/\/+$/, '')}/destinations/${file}`);
  if (!res.ok) throw new Error(`${file}: download failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const rows = parseCsv(readFileSync(path.join(dir, 'destinations.csv'), 'utf8'));
  const bad = rows.flatMap((r, i) =>
    rowProblems(r).map((p) => `row ${i + 2} (${r.file || '?'}): ${p}`),
  );
  if (bad.length) {
    console.error(bad.join('\n'));
    process.exit(1);
  }
  const photos = [];
  for (const r of rows) {
    const img = sharp(await photoBytes(r.file)).rotate();
    const { width, height } = await img.metadata();
    const small = await img
      .clone()
      .resize(32, 32, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    photos.push({
      key: `destinations/${r.file}`,
      names: split(r.places).map(normalizePlace),
      placeIds: split(r.place_ids),
      country: r.country || null,
      blurhash: encode(
        new Uint8ClampedArray(small.data),
        small.info.width,
        small.info.height,
        4,
        3,
      ),
      width,
      height,
      credit: r.credit,
      license: r.license,
      source: r.source || null,
    });
  }
  const out = path.join(root, 'apps/mobile/assets/destinations.json');
  writeFileSync(out, JSON.stringify({ photos }, null, 1) + '\n');
  console.log(`Wrote ${photos.length} destination photos to ${path.relative(root, out)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
