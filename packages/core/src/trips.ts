import { daysBetween, localDateIn } from './dates';

export type TripState = 'planning' | 'upcoming' | 'live' | 'completed' | 'archived';

export interface TripForState {
  startDate: string | null;
  endDate: string | null;
  timeZone: string;
  endedAt?: string | null;
  archivedAt?: string | null;
}

/**
 * Where a trip is in its lifecycle (docs/01 §2), judged by the calendar in the
 * trip's own time zone:
 * planning (no dates yet) → upcoming → live (on the trip dates) → completed → archived.
 */
export function tripState(trip: TripForState, now: Date = new Date()): TripState {
  if (trip.archivedAt) return 'archived';
  if (trip.endedAt) return 'completed';
  if (!trip.startDate || !trip.endDate) return 'planning';
  const today = localDateIn(trip.timeZone, now);
  if (today < trip.startDate) return 'upcoming';
  if (today > trip.endDate) return 'completed';
  return 'live';
}

/** "Day 3 of 5" while live; null otherwise. */
export function tripDayNumber(
  trip: TripForState,
  now: Date = new Date(),
): { day: number; of: number } | null {
  if (tripState(trip, now) !== 'live' || !trip.startDate || !trip.endDate) return null;
  const today = localDateIn(trip.timeZone, now);
  return {
    day: daysBetween(trip.startDate, today) + 1,
    of: daysBetween(trip.startDate, trip.endDate) + 1,
  };
}

/** Days until the trip starts (0 on the first day); null without dates. */
export function daysUntilStart(trip: TripForState, now: Date = new Date()): number | null {
  if (!trip.startDate) return null;
  return daysBetween(localDateIn(trip.timeZone, now), trip.startDate);
}
