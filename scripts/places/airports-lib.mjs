/**
 * Airports for reading tickets (Plan 35): IATA code → the city it serves.
 * Built from OurAirports (public domain, ourairports.com/data) by airports.mjs.
 * Only airports with scheduled flights and an IATA code are kept.
 */

/** A small CSV reader: commas, double quotes, "" inside quotes, \n or \r\n rows. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

const TYPES = new Set(['large_airport', 'medium_airport', 'small_airport']);
const RANK = { large_airport: 0, medium_airport: 1, small_airport: 2 };

/** airports.csv → [{ iata, city, country, name }], one per code (the biggest airport wins). */
export function buildAirports(csvText) {
  const [header, ...rows] = parseCsv(csvText);
  const col = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`airports.csv has no ${name} column`);
    return i;
  };
  const c = {
    type: col('type'),
    name: col('name'),
    country: col('iso_country'),
    city: col('municipality'),
    scheduled: col('scheduled_service'),
    iata: col('iata_code'),
  };
  const best = new Map();
  for (const r of rows) {
    const iata = (r[c.iata] ?? '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(iata) || r[c.scheduled] !== 'yes' || !TYPES.has(r[c.type])) continue;
    const city = (r[c.city] ?? '').trim();
    if (!city) continue;
    const a = { iata, city, country: r[c.country], name: r[c.name].trim(), rank: RANK[r[c.type]] };
    const prev = best.get(iata);
    if (!prev || a.rank < prev.rank) best.set(iata, a);
  }
  return [...best.values()]
    .sort((a, b) => a.iata.localeCompare(b.iata))
    .map(({ rank: _rank, ...a }) => a);
}

/** Problems that must stop a release. */
export function checkAirports(airports, known = []) {
  const errors = [];
  if (airports.length < 2500) errors.push(`only ${airports.length} airports`);
  const by = new Map(airports.map((a) => [a.iata, a]));
  for (const k of known) {
    const a = by.get(k.iata);
    if (!a || a.country !== k.country) errors.push(`${k.iata} (${k.country}) is missing`);
  }
  return errors;
}

/** The phone's file: one row per airport, [iata, city, country, name]. */
export function airportsCompact(airports, version) {
  return {
    version,
    credit: 'OurAirports (public domain), ourairports.com',
    columns: ['iata', 'city', 'country', 'name'],
    rows: airports.map((a) => [a.iata, a.city, a.country, a.name]),
  };
}
