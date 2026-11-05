import { describe, expect, it } from 'vitest';

import {
  fromGeoapify,
  normalizeForSearch,
  type GeoapifyResult,
} from '../../../supabase/functions/_shared/places-osm';
import { normalizePlace } from './places';

const hampi: GeoapifyResult = {
  result_type: 'city',
  city: 'Hampi',
  state: 'Karnataka',
  country: 'India',
  country_code: 'in',
  lat: 15.335,
  lon: 76.46,
  timezone: { name: 'Asia/Kolkata' },
  datasource: { sourcename: 'openstreetmap', raw: { osm_type: 'n', osm_id: 245678 } },
};

describe('place-search: OpenStreetMap results (Plan 29)', () => {
  it('keeps the same name rule as the app', () => {
    for (const s of ['São Paulo', '  Kodagu (Coorg) ', 'ÎLE-DE-France', 'Tōkyō'])
      expect(normalizeForSearch(s)).toBe(normalizePlace(s));
  });

  it('turns a city result into a place with a stable OSM id', () => {
    expect(fromGeoapify(hampi)).toEqual({
      id: 'osm:N245678',
      kind: 'city',
      name: 'Hampi',
      country_code: 'IN',
      country_name: 'India',
      region: 'Karnataka',
      lat: 15.335,
      lng: 76.46,
      time_zone: 'Asia/Kolkata',
      source: 'osm',
      search: 'hampi',
    });
  });

  it('maps states to regions and countries to countries', () => {
    expect(fromGeoapify({ ...hampi, result_type: 'state', city: undefined })?.kind).toBe('region');
    expect(fromGeoapify({ ...hampi, result_type: 'state', city: undefined })?.name).toBe(
      'Karnataka',
    );
    expect(
      fromGeoapify({ ...hampi, result_type: 'country', city: undefined, state: undefined })?.name,
    ).toBe('India');
  });

  it('skips streets, buildings and results without OSM ids or coordinates', () => {
    expect(fromGeoapify({ ...hampi, result_type: 'street' })).toBeNull();
    expect(fromGeoapify({ ...hampi, datasource: undefined })).toBeNull();
    expect(fromGeoapify({ ...hampi, lat: undefined })).toBeNull();
  });
});
