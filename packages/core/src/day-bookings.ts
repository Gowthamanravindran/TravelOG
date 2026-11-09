import { addDays, localDateIn, localTimeIn } from './dates';
import type { WhereBooking, WherePlace, WhereTrip } from './whereabouts';

/**
 * What's booked on one day of the trip (Plan 42), to show among the itinerary's
 * stops: journeys leaving (or arriving after an overnight trip), check-ins and
 * check-outs, events, and a strip for the nights in the middle of a stay.
 * Times are local to each place.
 */

export type MomentKind = 'journey' | 'arrive' | 'checkin' | 'checkout' | 'event';

export interface DayMoment {
  kind: MomentKind;
  bookingId: string;
  /** 'HH:MM' where it sits in the day; null when the booking has no time. */
  time: string | null;
  /** Journeys: departure and arrival, local to each end. */
  departTime?: string | null;
  arriveTime?: string | null;
  /** The arrival is on a later day ("04:40 (Mon)"). */
  arriveDate?: string | null;
  minutes?: number | null;
  /** Arrival shown in a different time zone from departure: that place's name. */
  arriveZoneName?: string | null;
  /** Stays: when check-in opens or check-out closes. */
  stayTime?: string | null;
  nights?: number;
  /** Check-in is placed after you arrive that day. */
  afterArrival?: boolean;
}

export interface StayingStrip {
  bookingId: string;
  night: number;
  nights: number;
  checkoutDate: string;
  checkoutTime: string | null;
}

export interface DayBookings {
  moments: DayMoment[];
  staying: StayingStrip | null;
}

const JOURNEYS = new Set(['flight', 'train', 'bus']);

const nightsBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** The day's bookings, in time order (untimed last), and the stay you're in the middle of. */
export function dayBookings(
  inputs: {
    trip: WhereTrip;
    bookings: readonly WhereBooking[];
    places: ReadonlyMap<string, WherePlace>;
  },
  date: string,
): DayBookings {
  const { trip, bookings, places } = inputs;
  const zone = (id: string | null) => (id && places.get(id)?.timeZone) || trip.timeZone;
  const local = (iso: string | null, tz: string) =>
    iso ? { date: localDateIn(tz, new Date(iso)), time: localTimeIn(tz, new Date(iso)) } : null;

  const moments: DayMoment[] = [];
  let staying: StayingStrip | null = null;
  // The latest arrival today, so a check-in isn't shown before you get there.
  let lastArrival: string | null = null;

  for (const b of bookings) {
    if (!JOURNEYS.has(b.type)) continue;
    const fromTz = zone(b.fromPlaceId);
    const toTz = zone(b.toPlaceId);
    const dep = local(b.startsAt, fromTz);
    const arr = local(b.endsAt, toTz);
    if (!dep) continue;
    const minutes =
      b.startsAt && b.endsAt
        ? Math.round((Date.parse(b.endsAt) - Date.parse(b.startsAt)) / 60000)
        : null;
    const zoneName =
      fromTz !== toTz && b.toPlaceId ? (places.get(b.toPlaceId)?.name ?? null) : null;
    if (dep.date === date)
      moments.push({
        kind: 'journey',
        bookingId: b.id,
        time: dep.time,
        departTime: dep.time,
        arriveTime: arr?.time ?? null,
        arriveDate: arr && arr.date !== dep.date ? arr.date : null,
        minutes,
        arriveZoneName: zoneName,
      });
    else if (arr && arr.date === date && dep.date < date)
      moments.push({
        kind: 'arrive',
        bookingId: b.id,
        time: arr.time,
        departTime: dep.time,
        arriveTime: arr.time,
        minutes,
        arriveZoneName: zoneName,
      });
    if (arr?.date === date && (!lastArrival || arr.time > lastArrival)) lastArrival = arr.time;
  }

  for (const b of bookings) {
    if (JOURNEYS.has(b.type)) continue;
    const tz = zone(b.placeId);
    const start = local(b.startsAt, tz);
    if (!start) continue;
    if (b.type !== 'stay') {
      if (start.date === date) moments.push({ kind: 'event', bookingId: b.id, time: start.time });
      continue;
    }
    const end = local(b.endsAt, tz);
    const outDate = end && end.date > start.date ? end.date : addDays(start.date, 1);
    const nights = nightsBetween(start.date, outDate);
    if (start.date === date) {
      const after = !!lastArrival && lastArrival > start.time;
      moments.push({
        kind: 'checkin',
        bookingId: b.id,
        time: after ? lastArrival : start.time,
        stayTime: start.time,
        nights,
        afterArrival: after,
      });
    } else if (outDate === date) {
      moments.push({
        kind: 'checkout',
        bookingId: b.id,
        time: end?.time ?? null,
        stayTime: end?.time ?? null,
      });
    } else if (start.date < date && date < outDate && !staying) {
      staying = {
        bookingId: b.id,
        night: nightsBetween(start.date, date) + 1,
        nights,
        checkoutDate: outDate,
        checkoutTime: end?.time ?? null,
      };
    }
  }

  // Check-outs come before journeys and check-ins at the same time.
  const rank: Record<MomentKind, number> = {
    checkout: 0,
    arrive: 1,
    journey: 2,
    event: 3,
    checkin: 4,
  };
  moments.sort(
    (a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || rank[a.kind] - rank[b.kind],
  );
  return { moments, staying };
}
