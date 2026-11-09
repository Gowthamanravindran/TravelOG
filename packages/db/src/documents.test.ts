import { describe, expect, it } from 'vitest';

import { addAttachment, addBooking, createTrip, deleteBooking, listTripAttachments } from './index';
import { testDb } from './test-db';

describe('trip documents (Plan 40)', () => {
  it('lists trip documents first, then each booking’s files in booking order', () => {
    const db = testDb();
    const { id: tripId } = createTrip(
      db,
      { title: 'Europe', timeZone: 'Europe/Paris' },
      { displayName: 'Gowtham' },
    );
    const later = addBooking(db, {
      tripId,
      type: 'train',
      title: 'Paris → Amsterdam',
      startsAt: '2024-12-24T11:22:00.000Z',
    });
    const first = addBooking(db, {
      tripId,
      type: 'stay',
      title: 'Paris stay',
      startsAt: '2024-12-20T14:00:00.000Z',
    });
    const file = (bookingId: string | null, name: string) =>
      addAttachment(db, { tripId, bookingId, name, localUri: `file:///${name}` });
    file(later.id, 'eurostar.pdf');
    file(first.id, 'hotel.pdf');
    file(null, 'passport.jpg');
    expect(listTripAttachments(db, tripId).map((d) => [d.name, d.booking?.title ?? null])).toEqual([
      ['passport.jpg', null],
      ['hotel.pdf', 'Paris stay'],
      ['eurostar.pdf', 'Paris → Amsterdam'],
    ]);
    // A deleted booking takes its files with it.
    deleteBooking(db, later.id);
    expect(listTripAttachments(db, tripId).map((d) => d.name)).toEqual([
      'passport.jpg',
      'hotel.pdf',
    ]);
  });
});
