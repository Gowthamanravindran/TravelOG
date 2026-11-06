import { addDays, localDateIn, localTimeIn } from './dates';

/**
 * Where you'll be on each day of a trip (Plan 35), worked out from its bookings
 * and the places you set yourself. One answer per night, in this order:
 *   1. a place you set (a manual stop),
 *   2. a stay that covers the night,
 *   3. in transit (a journey that leaves on or before the night and arrives later),
 *   4. probably where you last arrived, else the trip's destination.
 * Days list their journeys; a day spent entirely on the way is "in transit".
 */

export interface WherePlace {
  id: string;
  name: string;
  kind: 'city' | 'region' | 'country' | 'continent';
  timeZone: string | null;
}

export type WhereBookingType = 'flight' | 'train' | 'bus' | 'stay' | 'event' | 'rental' | 'other';

export interface WhereBooking {
  id: string;
  type: WhereBookingType;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  fromPlaceId: string | null;
  toPlaceId: string | null;
  placeId: string | null;
}

export interface WhereStop {
  id: string;
  kind: 'stay' | 'travel';
  placeId: string | null;
  toPlaceId: string | null;
  /** Local dates: the nights from startDate up to (not including) endDate. */
  startDate: string;
  endDate: string;
  label: string | null;
}

export interface WhereTrip {
  startDate: string | null;
  endDate: string | null;
  timeZone: string;
  destinationPlaceId: string | null;
}

export type NightKind = 'set' | 'stay' | 'transit' | 'probably' | 'unknown';

export interface Night {
  date: string;
  kind: NightKind;
  placeId: string | null;
  /** For transit: where the journey goes. */
  toPlaceId: string | null;
  /** The booking or stop this came from. */
  sourceId: string | null;
}

export interface Journey {
  sourceId: string;
  /** 'travel' for a journey you added by hand. */
  type: WhereBookingType | 'travel';
  title: string;
  fromPlaceId: string | null;
  toPlaceId: string | null;
  departDate: string;
  departTime: string | null;
  arriveDate: string | null;
  arriveTime: string | null;
  /** Minutes on the way, when both ends have a time. */
  minutes: number | null;
}

export interface Day {
  date: string;
  /** Where you are that night, or where you end up on the last day. */
  placeId: string | null;
  kind: NightKind;
  journeys: Journey[];
  /** Left before the day began and arrive after it ends. */
  inTransitAllDay: boolean;
}

export interface Whereabouts {
  nights: Night[];
  days: Day[];
  journeys: Journey[];
}

const JOURNEY_TYPES = new Set<string>(['flight', 'train', 'bus']);
const STAY_LIKE = new Set<NightKind>(['set', 'stay', 'probably']);

interface Inputs {
  trip: WhereTrip;
  bookings: readonly WhereBooking[];
  stops: readonly WhereStop[];
  places: ReadonlyMap<string, WherePlace>;
}

const tzOf = (places: Inputs['places'], id: string | null, fallback: string) =>
  (id && places.get(id)?.timeZone) || fallback;

const localOf = (iso: string | null, tz: string) =>
  iso ? { date: localDateIn(tz, new Date(iso)), time: localTimeIn(tz, new Date(iso)) } : null;

interface StaySpan {
  sourceId: string;
  placeId: string | null;
  start: string;
  end: string;
  set: boolean;
}

function spans({ trip, bookings, stops, places }: Inputs) {
  const journeys: Journey[] = [];
  const stays: StaySpan[] = [];
  for (const b of bookings) {
    if (JOURNEY_TYPES.has(b.type)) {
      const dep = localOf(b.startsAt, tzOf(places, b.fromPlaceId, trip.timeZone));
      if (!dep) continue;
      const arr = localOf(b.endsAt, tzOf(places, b.toPlaceId, trip.timeZone));
      journeys.push({
        sourceId: b.id,
        type: b.type,
        title: b.title,
        fromPlaceId: b.fromPlaceId,
        toPlaceId: b.toPlaceId,
        departDate: dep.date,
        departTime: dep.time,
        arriveDate: arr?.date ?? null,
        arriveTime: arr?.time ?? null,
        minutes:
          b.startsAt && b.endsAt
            ? Math.round((Date.parse(b.endsAt) - Date.parse(b.startsAt)) / 60000)
            : null,
      });
    } else if (b.type === 'stay') {
      const tz = tzOf(places, b.placeId, trip.timeZone);
      const inn = localOf(b.startsAt, tz);
      if (!inn) continue;
      const out = localOf(b.endsAt, tz);
      const end = out && out.date > inn.date ? out.date : addDays(inn.date, 1);
      stays.push({ sourceId: b.id, placeId: b.placeId, start: inn.date, end, set: false });
    }
  }
  for (const s of stops) {
    if (s.endDate < s.startDate) continue;
    if (s.kind === 'stay') {
      const end = s.endDate > s.startDate ? s.endDate : addDays(s.startDate, 1);
      stays.push({ sourceId: s.id, placeId: s.placeId, start: s.startDate, end, set: true });
    } else {
      journeys.push({
        sourceId: s.id,
        type: 'travel',
        title: s.label ?? '',
        fromPlaceId: s.placeId,
        toPlaceId: s.toPlaceId,
        departDate: s.startDate,
        departTime: null,
        arriveDate: s.endDate,
        arriveTime: null,
        minutes: null,
      });
    }
  }
  journeys.sort((a, b) =>
    (a.departDate + (a.departTime ?? '')).localeCompare(b.departDate + (b.departTime ?? '')),
  );
  return { journeys, stays };
}

/** The trip's dates, or the dates its bookings cover when the trip has none. */
function tripRange(trip: WhereTrip, journeys: Journey[], stays: StaySpan[]) {
  const dates = [
    ...journeys.flatMap((j) => [j.departDate, j.arriveDate ?? j.departDate]),
    ...stays.flatMap((s) => [s.start, s.end]),
  ].sort();
  const start = trip.startDate ?? dates[0] ?? null;
  const end = trip.endDate ?? dates[dates.length - 1] ?? start;
  if (!start || !end || end < start) return null;
  return { start, end };
}

export function whereabouts(inputs: Inputs): Whereabouts {
  const { trip } = inputs;
  const { journeys, stays } = spans(inputs);
  const range = tripRange(trip, journeys, stays);
  if (!range) return { nights: [], days: [], journeys };

  const nights: Night[] = [];
  for (let d = range.start; d < range.end && nights.length < 120; d = addDays(d, 1)) {
    const covering = stays.filter((s) => s.start <= d && d < s.end);
    const set = covering.find((s) => s.set);
    const stay = set ?? covering[0];
    // A journey you added by hand counts as set, like a stay you added.
    const setTravel = journeys.find(
      (j) => j.type === 'travel' && j.departDate <= d && j.arriveDate && d < j.arriveDate,
    );
    const transit =
      setTravel ??
      journeys.find((j) => j.departDate <= d && j.arriveDate !== null && d < j.arriveDate);
    if (set) {
      nights.push(night(d, 'set', set.placeId, null, set.sourceId));
    } else if (setTravel) {
      nights.push(
        night(d, 'transit', setTravel.fromPlaceId, setTravel.toPlaceId, setTravel.sourceId),
      );
    } else if (stay) {
      nights.push(night(d, 'stay', stay.placeId, null, stay.sourceId));
    } else if (transit) {
      nights.push(night(d, 'transit', transit.fromPlaceId, transit.toPlaceId, transit.sourceId));
    } else {
      const last = lastKnown(d, journeys, stays);
      const placeId = last ?? trip.destinationPlaceId;
      nights.push(night(d, placeId ? 'probably' : 'unknown', placeId, null, null));
    }
  }

  const days: Day[] = [];
  for (let d = range.start; d <= range.end && days.length < 121; d = addDays(d, 1)) {
    const todays = journeys.filter((j) => j.departDate === d || j.arriveDate === d);
    const inTransitAllDay = journeys.some(
      (j) => j.departDate < d && j.arriveDate !== null && d < j.arriveDate,
    );
    const n = nights.find((x) => x.date === d);
    if (n) {
      days.push({ date: d, placeId: n.placeId, kind: n.kind, journeys: todays, inTransitAllDay });
    } else {
      // The last day: where the day's last journey arrives, else where the last night was.
      const arriving = [...todays].reverse().find((j) => j.arriveDate === d && j.toPlaceId);
      const prev = nights[nights.length - 1];
      const placeId =
        arriving?.toPlaceId ?? (prev?.kind === 'transit' ? prev.toPlaceId : prev?.placeId) ?? null;
      days.push({
        date: d,
        placeId,
        kind: arriving ? 'stay' : (prev?.kind ?? 'unknown'),
        journeys: todays,
        inTransitAllDay,
      });
    }
  }
  return { nights, days, journeys };
}

function night(
  date: string,
  kind: NightKind,
  placeId: string | null,
  toPlaceId: string | null,
  sourceId: string | null,
): Night {
  return { date, kind, placeId, toPlaceId, sourceId };
}

/** The most recent place you arrived at or stayed in, up to night `d`. */
function lastKnown(d: string, journeys: Journey[], stays: StaySpan[]): string | null {
  let best: { at: string; placeId: string } | null = null;
  for (const j of journeys) {
    if (!j.toPlaceId || !j.arriveDate || j.arriveDate > d) continue;
    const at = j.arriveDate + (j.arriveTime ?? '00:00');
    if (!best || at >= best.at) best = { at, placeId: j.toPlaceId };
  }
  for (const s of stays) {
    if (!s.placeId || s.start > d) continue;
    const at = s.start + '12:00';
    if (!best || at >= best.at) best = { at, placeId: s.placeId };
  }
  return best?.placeId ?? null;
}

// ---------------------------------------------------------------- route strip

export type RouteItem =
  | {
      type: 'stay';
      placeId: string | null;
      startDate: string;
      endDate: string;
      probable: boolean;
      sourceId: string | null;
    }
  | { type: 'journey'; journey: Journey };

/** The trip as a line of places and the journeys between them. */
export function routeStops(w: Whereabouts): RouteItem[] {
  type Stay = Extract<RouteItem, { type: 'stay' }>;
  const stays: Stay[] = [];
  for (const n of w.nights) {
    if (!STAY_LIKE.has(n.kind) || !n.placeId) continue;
    const probable = n.kind === 'probably';
    const last = stays[stays.length - 1];
    if (
      last &&
      last.placeId === n.placeId &&
      last.probable === probable &&
      last.endDate === n.date
    ) {
      last.endDate = addDays(n.date, 1);
    } else {
      stays.push({
        type: 'stay',
        placeId: n.placeId,
        startDate: n.date,
        endDate: addDays(n.date, 1),
        probable,
        sourceId: n.sourceId,
      });
    }
  }
  // Journeys sort before a stay starting the same day (you arrive, then check in).
  const keyed: [string, RouteItem][] = [
    ...stays.map((s): [string, RouteItem] => [`${s.startDate} 2`, s]),
    ...w.journeys.map((j): [string, RouteItem] => [
      `${j.departDate} 1 ${j.departTime ?? ''}`,
      { type: 'journey', journey: j },
    ]),
  ];
  return keyed.sort((a, b) => a[0].localeCompare(b[0])).map(([, item]) => item);
}

// ---------------------------------------------------------------- Check your plan

export type PlanCheck =
  | { key: string; kind: 'noStay'; startDate: string; endDate: string; placeId: string | null }
  | {
      key: string;
      kind: 'arrivalMismatch';
      bookingId: string;
      date: string;
      arrivePlaceId: string;
      stayPlaceId: string;
    }
  | { key: string; kind: 'doubleStay'; date: string; sourceIds: string[] };

/** Gaps and clashes worth a gentle question; nothing when the trip has no bookings or stops. */
export function planChecks(inputs: Inputs, w: Whereabouts = whereabouts(inputs)): PlanCheck[] {
  if (!inputs.bookings.length && !inputs.stops.length) return [];
  const out: PlanCheck[] = [];
  const { stays } = spans(inputs);

  // Nights with nowhere to sleep, grouped into runs.
  let run: Extract<PlanCheck, { kind: 'noStay' }> | null = null;
  for (const n of w.nights) {
    const gap = n.kind === 'probably' || n.kind === 'unknown';
    if (gap && run && run.endDate === n.date) {
      run.endDate = addDays(n.date, 1);
      continue;
    }
    run = null;
    if (!gap) continue;
    run = {
      key: `noStay:${n.date}`,
      kind: 'noStay',
      startDate: n.date,
      endDate: addDays(n.date, 1),
      placeId: n.placeId,
    };
    out.push(run);
  }

  // Arriving in one city with that night's stay in another.
  for (const j of w.journeys) {
    if (j.type === 'travel' || !j.arriveDate || !j.toPlaceId) continue;
    const n = w.nights.find((x) => x.date === j.arriveDate);
    if (!n || (n.kind !== 'stay' && n.kind !== 'set') || !n.placeId || n.placeId === j.toPlaceId)
      continue;
    const a = inputs.places.get(j.toPlaceId);
    const s = inputs.places.get(n.placeId);
    if (a?.kind !== 'city' || s?.kind !== 'city' || a.name === s.name) continue;
    out.push({
      key: `arrivalMismatch:${j.sourceId}`,
      kind: 'arrivalMismatch',
      bookingId: j.sourceId,
      date: j.arriveDate,
      arrivePlaceId: j.toPlaceId,
      stayPlaceId: n.placeId,
    });
  }

  // Two booked stays on one night (a place you set yourself overrides on purpose).
  for (const n of w.nights) {
    const covering = stays.filter((s) => !s.set && s.start <= n.date && n.date < s.end);
    if (covering.length < 2) continue;
    const ids = covering.map((s) => s.sourceId).sort();
    const prev = out.find((c) => c.kind === 'doubleStay' && c.sourceIds.join() === ids.join());
    if (!prev)
      out.push({
        key: `doubleStay:${ids.join('+')}`,
        kind: 'doubleStay',
        date: n.date,
        sourceIds: ids,
      });
  }
  return out;
}
