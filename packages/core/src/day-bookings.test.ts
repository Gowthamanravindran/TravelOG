import { describe, expect, it } from 'vitest';

import { dayBookings } from './day-bookings';
import type { WhereBooking, WherePlace } from './whereabouts';

const place = (id: string, name: string, timeZone: string): WherePlace => ({
  id,
  name,
  kind: 'city',
  timeZone,
});
const places = new Map(
  [
    place('maa', 'Chennai', 'Asia/Kolkata'),
    place('bom', 'Mumbai', 'Asia/Kolkata'),
    place('par', 'Paris', 'Europe/Paris'),
    place('ams', 'Amsterdam', 'Europe/Amsterdam'),
    place('ist', 'Istanbul', 'Europe/Istanbul'),
    place('del', 'Delhi', 'Asia/Kolkata'),
  ].map((p) => [p.id, p]),
);
const trip = {
  startDate: '2024-12-20',
  endDate: '2025-01-06',
  timeZone: 'Asia/Kolkata',
  destinationPlaceId: null,
};
const b = (x: Partial<WhereBooking> & Pick<WhereBooking, 'id' | 'type'>): WhereBooking => ({
  title: '',
  startsAt: null,
  endsAt: null,
  fromPlaceId: null,
  toPlaceId: null,
  placeId: null,
  ...x,
});
// Europe trip (Plan 38 samples), times as UTC.
const bookings = [
  b({
    id: 'ai571',
    type: 'flight',
    startsAt: '2024-12-20T02:30:00Z',
    endsAt: '2024-12-20T04:35:00Z',
    fromPlaceId: 'maa',
    toPlaceId: 'bom',
  }),
  b({
    id: 'ai2023',
    type: 'flight',
    startsAt: '2024-12-20T07:15:00Z',
    endsAt: '2024-12-20T16:55:00Z',
    fromPlaceId: 'bom',
    toPlaceId: 'par',
  }),
  b({
    id: 'hotel',
    type: 'stay',
    startsAt: '2024-12-20T14:00:00Z',
    endsAt: '2024-12-24T10:30:00Z',
    placeId: 'par',
  }),
  b({
    id: 'eurostar',
    type: 'train',
    startsAt: '2024-12-24T11:22:00Z',
    endsAt: '2024-12-24T14:50:00Z',
    fromPlaceId: 'par',
    toPlaceId: 'ams',
  }),
  b({
    id: 'hostel',
    type: 'stay',
    startsAt: '2024-12-24T14:00:00Z',
    endsAt: '2024-12-26T09:30:00Z',
    placeId: 'ams',
  }),
  b({
    id: '6e12',
    type: 'flight',
    startsAt: '2025-01-05T17:15:00Z',
    endsAt: '2025-01-05T23:10:00Z',
    fromPlaceId: 'ist',
    toPlaceId: 'del',
  }),
];
const inputs = { trip, bookings, places };
const brief = (d: ReturnType<typeof dayBookings>) =>
  d.moments.map((m) => `${m.time} ${m.kind} ${m.bookingId}`);

describe('dayBookings (Plan 42)', () => {
  it('a travel day: flights in local times, check-in after you land', () => {
    const d = dayBookings(inputs, '2024-12-20');
    expect(brief(d)).toEqual([
      '08:00 journey ai571',
      '12:45 journey ai2023',
      '17:55 checkin hotel',
    ]);
    expect(d.moments[1]).toMatchObject({
      departTime: '12:45',
      arriveTime: '17:55',
      arriveZoneName: 'Paris',
      minutes: 580,
    });
    expect(d.moments[2]).toMatchObject({ stayTime: '15:00', nights: 4, afterArrival: true });
    expect(d.staying).toBeNull();
  });

  it('a middle day of a stay gets the strip, not a card', () => {
    const d = dayBookings(inputs, '2024-12-22');
    expect(d.moments).toEqual([]);
    expect(d.staying).toEqual({
      bookingId: 'hotel',
      night: 3,
      nights: 4,
      checkoutDate: '2024-12-24',
      checkoutTime: '11:30',
    });
  });

  it('a moving day: check out, train, check in after arriving', () => {
    const d = dayBookings(inputs, '2024-12-24');
    expect(brief(d)).toEqual([
      '11:30 checkout hotel',
      '12:22 journey eurostar',
      '15:50 checkin hostel',
    ]);
    expect(d.staying).toBeNull();
  });

  it('an overnight flight shows leaving one day and arriving the next', () => {
    expect(dayBookings(inputs, '2025-01-05').moments[0]).toMatchObject({
      kind: 'journey',
      departTime: '20:15',
      arriveTime: '04:40',
      arriveDate: '2025-01-06',
    });
    expect(brief(dayBookings(inputs, '2025-01-06'))).toEqual(['04:40 arrive 6e12']);
  });

  it('check-in keeps its own time when you arrive before it opens', () => {
    const early = [
      b({
        id: 'f',
        type: 'flight',
        startsAt: '2024-12-20T05:00:00Z',
        endsAt: '2024-12-20T07:00:00Z',
        fromPlaceId: 'maa',
        toPlaceId: 'par',
      }),
      bookings[2]!,
    ];
    expect(dayBookings({ ...inputs, bookings: early }, '2024-12-20').moments[1]).toMatchObject({
      kind: 'checkin',
      time: '15:00',
      afterArrival: false,
    });
  });
});
