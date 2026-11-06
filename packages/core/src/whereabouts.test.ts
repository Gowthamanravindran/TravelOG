import { describe, expect, it } from 'vitest';

import {
  planChecks,
  routeStops,
  whereabouts,
  type WhereBooking,
  type WherePlace,
  type WhereStop,
  type WhereTrip,
} from './whereabouts';

const place = (id: string, name: string, timeZone = 'Asia/Kolkata'): WherePlace => ({
  id,
  name,
  kind: 'city',
  timeZone,
});
const places = new Map(
  [
    place('blr', 'Bengaluru'),
    place('goa', 'Panaji'),
    place('gok', 'Gokarna'),
    place('del', 'Delhi'),
    place('tyo', 'Tokyo', 'Asia/Tokyo'),
  ].map((p) => [p.id, p]),
);
const trip: WhereTrip = {
  startDate: '2026-07-12',
  endDate: '2026-07-17',
  timeZone: 'Asia/Kolkata',
  destinationPlaceId: 'goa',
};

let n = 0;
const booking = (b: Partial<WhereBooking> & Pick<WhereBooking, 'type'>): WhereBooking => ({
  id: `b${++n}`,
  title: '',
  startsAt: null,
  endsAt: null,
  fromPlaceId: null,
  toPlaceId: null,
  placeId: null,
  ...b,
});
// India is UTC+5:30: 06:45 IST is 01:15Z.
const ist = (date: string, time: string) =>
  new Date(Date.parse(`${date}T${time}:00Z`) - 330 * 60000).toISOString();

const flightIn = booking({
  type: 'flight',
  title: 'BLR → GOI',
  startsAt: ist('2026-07-12', '06:45'),
  endsAt: ist('2026-07-12', '08:00'),
  fromPlaceId: 'blr',
  toPlaceId: 'goa',
});
const hotel = booking({
  type: 'stay',
  title: 'Sea Breeze',
  startsAt: ist('2026-07-12', '14:00'),
  endsAt: ist('2026-07-15', '11:00'),
  placeId: 'goa',
});
const bus = booking({
  type: 'bus',
  startsAt: ist('2026-07-15', '10:00'),
  endsAt: ist('2026-07-15', '14:00'),
  fromPlaceId: 'goa',
  toPlaceId: 'gok',
});
const flightHome = booking({
  type: 'flight',
  startsAt: ist('2026-07-17', '18:00'),
  endsAt: ist('2026-07-17', '19:15'),
  fromPlaceId: 'goa',
  toPlaceId: 'blr',
});
const base = { trip, places, stops: [] as WhereStop[] };

describe('whereabouts (Plan 35)', () => {
  it('a stay covers its nights; after it, you are probably where you last arrived', () => {
    const w = whereabouts({ ...base, bookings: [flightIn, hotel, bus, flightHome] });
    expect(w.nights.map((x) => [x.date, x.kind, x.placeId])).toEqual([
      ['2026-07-12', 'stay', 'goa'],
      ['2026-07-13', 'stay', 'goa'],
      ['2026-07-14', 'stay', 'goa'],
      ['2026-07-15', 'probably', 'gok'],
      ['2026-07-16', 'probably', 'gok'],
    ]);
    // The last day ends where the flight home lands.
    expect(w.days.at(-1)).toMatchObject({ date: '2026-07-17', placeId: 'blr' });
    expect(w.days[0]!.journeys.map((j) => j.sourceId)).toEqual([flightIn.id]);
    expect(w.journeys[0]).toMatchObject({ departTime: '06:45', arriveTime: '08:00', minutes: 75 });
  });

  it('an overnight train is a night in transit, not a gap', () => {
    const train = booking({
      type: 'train',
      startsAt: ist('2026-07-15', '18:05'),
      endsAt: ist('2026-07-16', '06:30'),
      fromPlaceId: 'goa',
      toPlaceId: 'del',
    });
    const w = whereabouts({ ...base, bookings: [hotel, train] });
    expect(w.nights.find((x) => x.date === '2026-07-15')).toMatchObject({
      kind: 'transit',
      placeId: 'goa',
      toPlaceId: 'del',
    });
    expect(w.nights.find((x) => x.date === '2026-07-16')).toMatchObject({
      kind: 'probably',
      placeId: 'del',
    });
    expect(planChecks({ ...base, bookings: [hotel, train] }).map((c) => c.key)).toEqual([
      'noStay:2026-07-16',
    ]);
  });

  it('a day spent entirely on the way is in transit all day', () => {
    const long = booking({
      type: 'train',
      startsAt: ist('2026-07-12', '22:00'),
      endsAt: ist('2026-07-14', '05:00'),
      fromPlaceId: 'blr',
      toPlaceId: 'del',
    });
    const w = whereabouts({ ...base, bookings: [long] });
    expect(w.days.map((d) => [d.date, d.inTransitAllDay])).toEqual([
      ['2026-07-12', false],
      ['2026-07-13', true],
      ['2026-07-14', false],
      ['2026-07-15', false],
      ['2026-07-16', false],
      ['2026-07-17', false],
    ]);
    expect(w.journeys[0]!.minutes).toBe(31 * 60);
  });

  it('a road trip added by hand counts as travel on those nights', () => {
    const drive: WhereStop = {
      id: 's1',
      kind: 'travel',
      placeId: 'blr',
      toPlaceId: 'del',
      startDate: '2026-07-12',
      endDate: '2026-07-14',
      label: 'Road trip',
    };
    const w = whereabouts({ ...base, bookings: [], stops: [drive] });
    expect(w.nights.slice(0, 3).map((x) => [x.kind, x.toPlaceId])).toEqual([
      ['transit', 'del'],
      ['transit', 'del'],
      ['probably', null],
    ]);
    expect(w.nights[2]!.placeId).toBe('del');
    expect(w.days[1]!.inTransitAllDay).toBe(true);
  });

  it('a place you set wins over bookings and clears the gap', () => {
    const friends: WhereStop = {
      id: 's2',
      kind: 'stay',
      placeId: 'gok',
      toPlaceId: null,
      startDate: '2026-07-14',
      endDate: '2026-07-17',
      label: "Aunt's house",
    };
    const inputs = { ...base, bookings: [flightIn, hotel, bus], stops: [friends] };
    const w = whereabouts(inputs);
    expect(w.nights.map((x) => x.kind)).toEqual(['stay', 'stay', 'set', 'set', 'set']);
    expect(w.nights[2]).toMatchObject({ placeId: 'gok', sourceId: 's2' });
    expect(planChecks(inputs)).toEqual([]);
  });

  it('shows arrival times in the arrival city', () => {
    const toTokyo = booking({
      type: 'flight',
      startsAt: '2026-07-12T18:30:00.000Z', // 00:00 IST on the 13th
      endsAt: '2026-07-12T23:30:00.000Z', // 08:30 in Tokyo on the 13th
      fromPlaceId: 'blr',
      toPlaceId: 'tyo',
    });
    const [j] = whereabouts({ ...base, bookings: [toTokyo] }).journeys;
    expect(j).toMatchObject({
      departDate: '2026-07-13',
      departTime: '00:00',
      arriveDate: '2026-07-13',
      arriveTime: '08:30',
    });
  });

  it('uses the bookings’ dates when the trip has none', () => {
    const w = whereabouts({
      ...base,
      trip: { ...trip, startDate: null, endDate: null },
      bookings: [flightIn, hotel],
    });
    expect(w.nights.map((x) => x.date)).toEqual(['2026-07-12', '2026-07-13', '2026-07-14']);
  });
});

describe('routeStops', () => {
  it('lines up places and the journeys between them', () => {
    const items = routeStops(
      whereabouts({ ...base, bookings: [flightIn, hotel, bus, flightHome] }),
    );
    expect(
      items.map((i) =>
        i.type === 'stay'
          ? `${i.placeId}${i.probable ? '?' : ''} ${i.startDate.slice(8)}–${i.endDate.slice(8)}`
          : `${i.journey.type} → ${i.journey.toPlaceId}`,
      ),
    ).toEqual(['flight → goa', 'goa 12–15', 'bus → gok', 'gok? 15–17', 'flight → blr']);
  });
});

describe('planChecks', () => {
  it('says nothing for a trip with no bookings or places', () => {
    expect(planChecks({ ...base, bookings: [] })).toEqual([]);
  });

  it('groups nights with no stay into one question', () => {
    const checks = planChecks({ ...base, bookings: [flightIn, hotel, bus, flightHome] });
    expect(checks).toEqual([
      {
        key: 'noStay:2026-07-15',
        kind: 'noStay',
        startDate: '2026-07-15',
        endDate: '2026-07-17',
        placeId: 'gok',
      },
    ]);
  });

  it('asks when you land in one city and sleep in another', () => {
    const farHotel = { ...hotel, id: 'far', placeId: 'gok' };
    const checks = planChecks({ ...base, bookings: [flightIn, farHotel] });
    expect(checks.find((c) => c.kind === 'arrivalMismatch')).toMatchObject({
      bookingId: flightIn.id,
      arrivePlaceId: 'goa',
      stayPlaceId: 'gok',
    });
  });

  it('flags two stays on the same night once', () => {
    const second = { ...hotel, id: 'dup' };
    const checks = planChecks({ ...base, bookings: [hotel, second] });
    expect(checks.filter((c) => c.kind === 'doubleStay')).toEqual([
      {
        key: `doubleStay:${[hotel.id, 'dup'].sort().join('+')}`,
        kind: 'doubleStay',
        date: '2026-07-12',
        sourceIds: [hotel.id, 'dup'].sort(),
      },
    ]);
  });
});
