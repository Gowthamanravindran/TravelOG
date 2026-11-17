import { splitStatus, tripLengthDays } from '@travelog/core';
import { countryCodeOnGlobe, type City } from '@travelog/globe';

/**
 * The state of "create a trip" on the globe (Plan 67), as a reducer: which step is showing and
 * what has been picked. It lives in the Trips screen, not in the globe, so a globe that reloads
 * or fails loses nothing, and every step can be finished without it.
 */

export type Step = 'countries' | 'dates' | 'cities' | 'days';

export interface DraftState {
  step: Step;
  /** ISO alpha-2 codes as drawn on the globe, in pick order. */
  countries: string[];
  /** Picked cities; tap order is visit order. */
  cities: City[];
  /** `YYYY-MM-DD`, or '' when not set. */
  startDate: string;
  endDate: string;
  /** Days per city id; a city with no entry has 1. */
  days: Record<string, number>;
  /** The typed trip name; null means the automatic one. */
  name: string | null;
  /** Countries left out on moving to the days because no city was picked in them. */
  dropped: string[];
}

export type DraftAction =
  | { type: 'toggleCountry'; code: string }
  | { type: 'addCity'; city: City }
  | { type: 'toggleCity'; city: City }
  | { type: 'setDates'; start: string; end: string }
  | { type: 'setDays'; cityId: string; days: number }
  | { type: 'setName'; name: string }
  | { type: 'next' }
  | { type: 'back' };

export const emptyDraft: DraftState = {
  step: 'countries',
  countries: [],
  cities: [],
  startDate: '',
  endDate: '',
  days: {},
  name: null,
  dropped: [],
};

const ORDER: readonly Step[] = ['countries', 'dates', 'cities', 'days'];
const countryOf = (city: City) => countryCodeOnGlobe(city.countryCode);

/** The picked cities with their day counts, as `splitStatus` takes them. */
function stopsOf(s: DraftState) {
  return s.cities.map((c) => ({
    placeId: c.id,
    name: c.name,
    countryCode: countryOf(c),
    days: s.days[c.id] ?? 1,
  }));
}

/** Whether this step is done: its main button shows (or, on the last step, is enabled). */
export function canGoNext(s: DraftState): boolean {
  switch (s.step) {
    case 'countries':
      return s.countries.length > 0;
    case 'dates':
      return tripLengthDays(s.startDate, s.endDate) > 0;
    case 'cities':
      return s.cities.length > 0;
    case 'days':
      return (
        s.cities.length > 0 &&
        splitStatus(stopsOf(s), tripLengthDays(s.startDate, s.endDate)).state === 'exact'
      );
  }
}

function addCity(s: DraftState, city: City): DraftState {
  if (s.cities.some((c) => c.id === city.id)) return s;
  const code = countryOf(city);
  return {
    ...s,
    countries: s.countries.includes(code) ? s.countries : [...s.countries, code],
    cities: [...s.cities, city],
  };
}

function removeCities(s: DraftState, gone: (city: City) => boolean): DraftState {
  const days = { ...s.days };
  for (const c of s.cities) if (gone(c)) delete days[c.id];
  return { ...s, cities: s.cities.filter((c) => !gone(c)), days };
}

export function draftReducer(s: DraftState, a: DraftAction): DraftState {
  switch (a.type) {
    case 'toggleCountry': {
      if (!s.countries.includes(a.code)) return { ...s, countries: [...s.countries, a.code] };
      return {
        ...removeCities(s, (c) => countryOf(c) === a.code),
        countries: s.countries.filter((c) => c !== a.code),
      };
    }
    case 'addCity':
      return addCity(s, a.city);
    case 'toggleCity':
      return s.cities.some((c) => c.id === a.city.id)
        ? removeCities(s, (c) => c.id === a.city.id)
        : addCity(s, a.city);
    case 'setDates':
      return { ...s, startDate: a.start, endDate: a.end };
    case 'setDays':
      return { ...s, days: { ...s.days, [a.cityId]: Math.max(1, Math.round(a.days)) } };
    case 'setName':
      return { ...s, name: a.name.trim() ? a.name : null };
    case 'next': {
      if (s.step === 'days' || !canGoNext(s)) return s;
      const step = ORDER[ORDER.indexOf(s.step) + 1]!;
      if (step !== 'days') return { ...s, step };
      // Days can only be given to cities, so a country without one is left out (and said so).
      const used = new Set(s.cities.map(countryOf));
      return {
        ...s,
        step,
        countries: s.countries.filter((c) => used.has(c)),
        dropped: s.countries.filter((c) => !used.has(c)),
      };
    }
    case 'back': {
      if (s.step === 'countries') return s;
      const step = ORDER[ORDER.indexOf(s.step) - 1]!;
      // Leaving the days brings back the countries that were left out, to pick cities in.
      return s.step === 'days'
        ? { ...s, step, countries: [...s.countries, ...s.dropped], dropped: [] }
        : { ...s, step };
    }
  }
}
