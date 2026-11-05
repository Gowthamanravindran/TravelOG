import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'https://download.geonames.org/export/dump/';

/** Downloads a GeoNames dump file (unzipping .zip) and returns its text. */
export async function geonames(file, dir = '.places-cache') {
  mkdirSync(dir, { recursive: true });
  const res = await fetch(BASE + file);
  if (!res.ok) throw new Error(`GeoNames ${file}: HTTP ${res.status}`);
  const path = join(dir, file);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  if (!file.endsWith('.zip')) return readFileSync(path, 'utf8');
  return execFileSync('unzip', ['-p', path], { maxBuffer: 1024 * 1024 * 1024 }).toString('utf8');
}
