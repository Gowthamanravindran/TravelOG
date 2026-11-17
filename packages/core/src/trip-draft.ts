import { addDays, daysBetween, isLocalDate } from './dates';

/**
 * The rules for a trip made on the globe (Plan 67): how long it is, how its days are split
 * between its stops, which dates each stop gets, and what the trip is called. Pure, so the
 * create flow, the saved rows and the tests all agree.
 */

/** A city on the trip, in visit order, with the days spent there (at least 1). */
export interface DraftStop {
  /** The app's place id, `gn:<geonameid>`. */
  placeId: string;
  name: string;
  /** ISO alpha-2 of the country the city counts under. */
  countryCode: string;
  days: number;
}

/** A country of the picked stops. */
export interface DraftCountry {
  code: string;
  name: string;
  /** Continent name as the places list has it ("Asia"); null when not known. */
  continent: string | null;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** The places list's continent ids, by the continent names its country rows carry. */
const CONTINENT_IDS: Record<string, string> = {
  Africa: 'cont:AF',
  Antarctica: 'cont:AN',
  Asia: 'cont:AS',
  Europe: 'cont:EU',
  'North America': 'cont:NA',
  Oceania: 'cont:OC',
  'South America': 'cont:SA',
};

/** Days on the trip with both ends included: 12–18 March is 7. 0 until both dates are set. */
export function tripLengthDays(start: string, end: string): number {
  if (!isLocalDate(start) || !isLocalDate(end) || end < start) return 0;
  return daysBetween(start, end) + 1;
}

/** How the stops' days add up against the trip's length. `left` is negative when over. */
export function splitStatus(
  stops: readonly DraftStop[],
  totalDays: number,
): { placed: number; left: number; state: 'under' | 'exact' | 'over' } {
  const placed = stops.reduce((sum, s) => sum + s.days, 0);
  const left = totalDays - placed;
  return { placed, left, state: left === 0 ? 'exact' : left > 0 ? 'under' : 'over' };
}

/** What the person sees for each stop: its first and last day, both included. */
export function stopDays(
  stops: readonly DraftStop[],
  start: string,
): { first: string; last: string }[] {
  let first = start;
  return stops.map((s) => {
    const days = { first, last: addDays(first, s.days - 1) };
    first = addDays(first, s.days);
    return days;
  });
}

/**
 * What is saved for each stop. The trip screens read a stay as "the nights from startDate up
 * to, not including, endDate" (whereabouts.ts), so a stop runs from its first day to the next
 * stop's first day, and the last stop ends on the trip's last day.
 */
export function stopRows(
  stops: readonly DraftStop[],
  start: string,
  end: string,
): { placeId: string; startDate: string; endDate: string }[] {
  const days = stopDays(stops, start);
  return stops.map((s, i) => ({
    placeId: s.placeId,
    startDate: days[i]!.first,
    endDate: days[i + 1]?.first ?? end,
  }));
}

/** The one continent every country is on, or null. */
function sharedContinent(countries: readonly DraftCountry[]): string | null {
  const first = countries[0]?.continent ?? null;
  return first && countries.every((c) => c.continent === first) ? first : null;
}

/**
 * The trip's name until the person types their own (the owner's rule):
 * one city → "{City} trip"; one country → "{Country} Trip"; several countries on one
 * continent → "Exploring {Continent}"; otherwise "{Month} Trip", the month of the first day.
 * `countries` are the countries of the picked stops.
 */
export function autoTripName(
  stops: readonly DraftStop[],
  countries: readonly DraftCountry[],
  start: string,
): string {
  if (stops.length === 1) return `${stops[0]!.name} trip`;
  if (stops.length > 1 && countries.length === 1) return `${countries[0]!.name} Trip`;
  const continent = countries.length > 1 ? sharedContinent(countries) : null;
  if (continent) return `Exploring ${continent}`;
  const month = isLocalDate(start) ? MONTHS[Number(start.slice(5, 7)) - 1] : undefined;
  return month ? `${month} Trip` : 'New trip';
}

/**
 * The trip's destination text and the place it links to: the single city, else the single
 * country, else the continent all its countries share, else nothing.
 */
export function tripDestination(
  stops: readonly DraftStop[],
  countries: readonly DraftCountry[],
): { destination: string; destinationPlaceId: string | null } {
  if (stops.length === 1) {
    const country = countries[0]?.name;
    return {
      destination: country ? `${stops[0]!.name}, ${country}` : stops[0]!.name,
      destinationPlaceId: stops[0]!.placeId,
    };
  }
  const destination = stops.map((s) => s.name).join(', ');
  if (countries.length === 1)
    return { destination, destinationPlaceId: `ctry:${countries[0]!.code}` };
  const continent = sharedContinent(countries);
  return {
    destination,
    destinationPlaceId: (continent && CONTINENT_IDS[continent]) || null,
  };
}
