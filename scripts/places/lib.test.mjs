import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  buildPlaces,
  checkPlaces,
  fromCompact,
  parseAdmin1,
  parseCities,
  parseCountries,
  parseTimeZones,
  phoneList,
  toCompact,
} from './lib.mjs';

const fx = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');
const inputs = () => ({
  countries: parseCountries(fx('countryInfo.txt')),
  timeZones: parseTimeZones(fx('timeZones.txt')),
  admin1: parseAdmin1(fx('admin1CodesASCII.txt')),
  cities: parseCities(fx('cities.txt')),
  overrides: JSON.parse(fx('overrides.json')),
});
const byId = (ps) => new Map(ps.map((p) => [p.id, p]));

test('builds continents, countries, regions and cities with plain facts', () => {
  const ps = byId(buildPlaces({ ...inputs(), minPopulation: 15000 }));
  assert.deepEqual(
    [...ps.values()]
      .filter((p) => p.kind === 'continent')
      .map((p) => p.name)
      .sort(),
    ['Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'],
  );
  const japan = ps.get('ctry:JP');
  assert.equal(japan.name, 'Japan');
  assert.equal(japan.continent, 'Asia');
  assert.equal(japan.currency, 'JPY');
  assert.equal(japan.timeZone, 'Asia/Tokyo');
  const tokyo = ps.get('gn:1850147');
  assert.equal(tokyo.countryName, 'Japan');
  assert.equal(tokyo.timeZone, 'Asia/Tokyo');
  assert.equal(tokyo.currency, 'JPY');
  assert.equal(tokyo.region, 'Tokyo');
  const goa = ps.get('adm1:IN.33');
  assert.equal(goa.kind, 'region');
  assert.equal(goa.timeZone, 'Asia/Kolkata');
  assert.equal(goa.boost, 20);
});

test('keeps only readable Latin aliases (old names), drops codes and other scripts', () => {
  const ps = byId(buildPlaces({ ...inputs(), minPopulation: 15000 }));
  assert.deepEqual(ps.get('gn:1277333').aliases, ['Bangalore', 'Bangalor']);
  assert.ok(ps.get('gn:1275339').aliases.includes('Bombay'));
  assert.ok(!ps.get('gn:1850147').aliases.includes('TYO'));
  assert.ok(ps.get('gn:1260607').aliases.includes('Goa capital'));
});

test('adds our own places and fills their country facts', () => {
  const hampi = byId(buildPlaces({ ...inputs(), minPopulation: 15000 })).get('ours:hampi');
  assert.equal(hampi.countryName, 'India');
  assert.equal(hampi.currency, 'INR');
  assert.equal(hampi.source, 'ours');
});

test('an override that matches nothing is an error, not silently ignored', () => {
  const bad = { ...inputs(), minPopulation: 15000 };
  bad.overrides = { ...bad.overrides, aliases: [{ name: 'Nowhere', country: 'IN', add: ['x'] }] };
  assert.throws(() => buildPlaces(bad), /Nowhere/);
});

test('checks catch a broken build', () => {
  const ps = buildPlaces({ ...inputs(), minPopulation: 15000 });
  const known = [
    { name: 'Tokyo', country: 'JP' },
    { name: 'Mumbai', country: 'IN' },
  ];
  assert.deepEqual(checkPlaces(ps, { known, minCities: 3, minCountries: 4 }), []);
  assert.match(
    checkPlaces(ps, {
      known: [{ name: 'Atlantis', country: 'GR' }],
      minCities: 3,
      minCountries: 4,
    }).join(),
    /Atlantis/,
  );
  assert.match(
    checkPlaces(
      ps.filter((p) => p.kind !== 'continent'),
      { known, minCities: 3, minCountries: 4 },
    ).join(),
    /continent/,
  );
  assert.match(
    checkPlaces(ps, { known, minCities: 3, minCountries: 4, previousCount: 1000 }).join(),
    /dropped/,
  );
});

test('compact form round-trips', () => {
  const ps = buildPlaces({ ...inputs(), minPopulation: 15000 });
  assert.deepEqual(fromCompact(JSON.parse(JSON.stringify(toCompact(ps, 'v1')))).places, ps);
});

test('the phone list keeps only continents and countries (cities come from our server)', () => {
  const phone = phoneList(buildPlaces({ ...inputs(), minPopulation: 15000 }));
  assert.deepEqual([...new Set(phone.map((p) => p.kind))].sort(), ['continent', 'country']);
  assert.equal(phone.length, 7 + 4);
  assert.ok(JSON.stringify(toCompact(phone, 'v')).length < 5000);
});
