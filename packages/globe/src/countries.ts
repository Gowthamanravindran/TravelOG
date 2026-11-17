// The countries and territories drawn on the globe, for search and pickers.
import { foldText } from './cities';
import { FLAGS } from './flags';
import type { GlobeData } from './globeHtml';

declare const require: (id: string) => unknown;

export type CountryInfo = {
  /** ISO 3166-1 alpha-3, the globe's own key, e.g. 'IND'. */
  iso: string;
  name: string;
  /** ISO alpha-2 code, e.g. 'IN'; missing for a few territories. */
  countryCode?: string;
  /** Flag image as a data URI for <Image source={{ uri }}>; missing for a few territories. */
  flag?: string;
  /** Other names to match in search. */
  alt?: string;
};

let data: GlobeData | null = null;
let list: CountryInfo[] | null = null;
let index: { country: CountryInfo; name: string; text: string }[] | null = null;

/** Country shapes, India point of view (the only border set the app ships; spec, Borders). */
export function loadCountries(): GlobeData {
  if (!data) data = require('./data/countries.in.json') as GlobeData;
  return data;
}

/** Flag image (data URI) for an ISO alpha-2 country code, if there is one. */
export function getFlag(countryCode?: string): string | undefined {
  return countryCode ? FLAGS[countryCode] : undefined;
}

/** Every country and territory on the globe, sorted by name. */
export function getCountryList(): CountryInfo[] {
  if (!list) {
    const shapes = loadCountries() as {
      countries: {
        features: { properties: { iso: string; name: string; a2?: string; alt?: string } }[];
      };
    };
    list = shapes.countries.features
      .map((f) => ({
        iso: f.properties.iso,
        name: f.properties.name,
        countryCode: f.properties.a2,
        flag: getFlag(f.properties.a2),
        alt: f.properties.alt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return list;
}

export function countryByCode(countryCode: string): CountryInfo | undefined {
  return getCountryList().find((c) => c.countryCode === countryCode);
}

export function countryByIso(iso: string): CountryInfo | undefined {
  return getCountryList().find((c) => c.iso === iso);
}

/** Countries whose name starts with the query, then those that contain it (name, other names, code). */
export function searchCountries(query: string, limit = 6): CountryInfo[] {
  const q = foldText(query.trim());
  if (!q) return [];
  if (!index)
    index = getCountryList().map((country) => ({
      country,
      name: foldText(country.name),
      text: foldText(`${country.name} ${country.alt ?? ''} ${country.iso}`),
    }));
  const starts: CountryInfo[] = [];
  const contains: CountryInfo[] = [];
  for (const entry of index) {
    if (entry.name.startsWith(q)) starts.push(entry.country);
    else if (entry.text.includes(q)) contains.push(entry.country);
  }
  return starts.concat(contains).slice(0, limit);
}
