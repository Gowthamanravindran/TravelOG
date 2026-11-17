import {
  autoTripName,
  stopRows,
  tripDestination,
  type DraftCountry,
  type DraftStop,
  type Place,
} from '@travelog/core';
import { getPlace, type Db, type TripInput } from '@travelog/db';
import { cityPlaceId, countryByCode, countryCodeOnGlobe, type City } from '@travelog/globe';

import { deviceTimeZone } from '@/lib/format';

/** What the create flow has gathered by the time the trip is made (Plan 67). */
export interface DraftToSave {
  /** Typed by the person; null or blank means the automatic name. */
  name: string | null;
  startDate: string;
  endDate: string;
  /** Picked cities in visit order. */
  cities: readonly City[];
  /** Days per city id; a city with no entry has 1. */
  days: Readonly<Record<string, number>>;
}

/** The country a city counts under: territories drawn inside a parent count as the parent. */
const countryOf = (city: City) => countryCodeOnGlobe(city.countryCode);

/** The picked cities as the rules in `@travelog/core` take them. */
export function draftStops(draft: Pick<DraftToSave, 'cities' | 'days'>): DraftStop[] {
  return draft.cities.map((c) => ({
    placeId: cityPlaceId(c),
    name: c.name,
    countryCode: countryOf(c),
    days: Math.max(1, draft.days[c.id] ?? 1),
  }));
}

/**
 * The countries of the picked cities, in the order they first appear. Names and continents
 * come from the phone's places; a country it does not have falls back to the globe's name.
 */
export function draftCountries(db: Db, cities: readonly City[]): DraftCountry[] {
  const out: DraftCountry[] = [];
  for (const city of cities) {
    const code = countryOf(city);
    if (out.some((c) => c.code === code)) continue;
    const row = getPlace(db, `ctry:${code}`);
    out.push({
      code,
      name: row?.name ?? countryByCode(code)?.name ?? code,
      continent: row?.continent ?? null,
    });
  }
  return out;
}

/** The automatic name for a draft, as shown in the name field before the person types. */
export function draftAutoName(db: Db, draft: Pick<DraftToSave, 'cities' | 'days' | 'startDate'>) {
  return autoTripName(draftStops(draft), draftCountries(db, draft.cities), draft.startDate);
}

/**
 * Everything `createTripWithStops` needs for a finished draft. Currency and time zone are
 * never asked: they come from the first stop's country, falling back to the person's home
 * currency and the phone's time zone, and can be changed later in Edit trip.
 */
export function draftToSave(
  db: Db,
  draft: DraftToSave,
  profile: { homeCurrency?: string | null },
): {
  input: TripInput;
  stops: { placeId: string; startDate: string; endDate: string }[];
  places: Place[];
} {
  const stops = draftStops(draft);
  const countries = draftCountries(db, draft.cities);
  const first = draft.cities[0];
  const firstCountry = first ? getPlace(db, `ctry:${countryOf(first)}`) : undefined;
  const firstPlace = first ? getPlace(db, cityPlaceId(first)) : undefined;

  const places: Place[] = [];
  for (const city of draft.cities) {
    const id = cityPlaceId(city);
    if (getPlace(db, id) || places.some((p) => p.id === id)) continue;
    const code = countryOf(city);
    const row = getPlace(db, `ctry:${code}`);
    places.push({
      id,
      kind: 'city',
      name: city.name,
      countryCode: code,
      countryName: row?.name ?? countryByCode(code)?.name ?? null,
      region: null,
      continent: row?.continent ?? null,
      lat: city.lat,
      lng: city.lng,
      // Not known offline; the trip's own zone is used until the server fills it in.
      timeZone: null,
      currency: row?.currency ?? null,
      population: 0,
      boost: 0,
      aliases: [],
      source: 'geonames',
    });
  }

  return {
    input: {
      title: draft.name?.trim() || autoTripName(stops, countries, draft.startDate),
      emoji: 'trips',
      ...tripDestination(stops, countries),
      startDate: draft.startDate,
      endDate: draft.endDate,
      currency: firstCountry?.currency ?? profile.homeCurrency ?? 'INR',
      timeZone: firstPlace?.timeZone ?? firstCountry?.timeZone ?? deviceTimeZone(),
    },
    stops: stopRows(stops, draft.startDate, draft.endDate),
    places,
  };
}
