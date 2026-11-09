import {
  addDays,
  planChecks,
  routeStops,
  whereabouts,
  type Day,
  type PlanCheck,
  type RouteItem,
  type WherePlace,
  type Whereabouts,
} from '@travelog/core';
import { getSetting, setSetting, whereInputs, type Db } from '@travelog/db';

import { useQuery } from '@/data/provider';

import { shortDate } from './format';

/**
 * Where you'll be on a trip (Plan 35): worked out from its bookings and the
 * places you set, for the route strip, the city on each day and "Check your plan".
 */
export interface Where {
  w: Whereabouts;
  route: RouteItem[];
  checks: PlanCheck[];
  places: ReadonlyMap<string, WherePlace>;
  /** Ids of places you set yourself, to tell them from bookings. */
  stopIds: ReadonlySet<string>;
  /** The trip, bookings, stops and places read for this, so screens don't read them again (Plan 45). */
  inputs: NonNullable<ReturnType<typeof whereInputs>>;
}

const dismissedKey = (tripId: string) => `where.dismissed.${tripId}`;

export function dismissedChecks(db: Db, tripId: string): string[] {
  try {
    return JSON.parse(getSetting(db, dismissedKey(tripId)) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function dismissCheck(db: Db, tripId: string, key: string): void {
  setSetting(db, dismissedKey(tripId), JSON.stringify([...dismissedChecks(db, tripId), key]));
}

export function whereFor(db: Db, tripId: string): Where | null {
  const inputs = whereInputs(db, tripId);
  if (!inputs) return null;
  const w = whereabouts(inputs);
  const dismissed = new Set(dismissedChecks(db, tripId));
  return {
    w,
    route: routeStops(w),
    checks: planChecks(inputs, w).filter((c) => !dismissed.has(c.key)),
    places: inputs.places,
    stopIds: new Set(inputs.stops.map((s) => s.id)),
    inputs,
  };
}

export function useWhere(tripId: string): Where | null {
  return useQuery((db) => whereFor(db, tripId), [tripId]);
}

export const placeName = (places: Where['places'], id: string | null) =>
  (id && places.get(id)?.name) || null;

/** The line under a day: "Goa", "Goa?", "In transit", "→ Delhi", or nothing. */
export function dayPlaceLabel(day: Day | undefined, where: Where): string | null {
  if (!day) return null;
  if (day.inTransitAllDay) return 'In transit';
  if (day.kind === 'transit') {
    const n = where.w.nights.find((x) => x.date === day.date);
    const to = placeName(where.places, n?.toPlaceId ?? null);
    return to ? `→ ${to}` : 'In transit';
  }
  const name = placeName(where.places, day.placeId);
  if (!name) return null;
  return day.kind === 'probably' ? `${name}?` : name;
}

/** "15 Jul" or "15–16 Jul": the nights from start up to end. */
export function nightsText(start: string, end: string): string {
  const last = addDays(end, -1);
  if (last <= start) return shortDate(start);
  const [a, b] = [shortDate(start), shortDate(last)];
  return a.split(' ')[1] === b.split(' ')[1] ? `${a.split(' ')[0]}–${b}` : `${a} – ${b}`;
}

/** How long a journey takes: "1 h 15 min", "28 h". */
export function durationText(minutes: number | null): string | null {
  if (minutes == null || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
