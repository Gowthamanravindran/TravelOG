import { describe, expect, it } from 'vitest';

import { planReminders, type ReminderInput } from './reminders';

const trip = { id: 't1', title: 'Goa', timeZone: 'Asia/Kolkata' };
const now = new Date('2026-12-01T00:00:00Z');

function input(partial: Partial<ReminderInput>): ReminderInput {
  return { trips: [trip], bookings: [], items: [], polls: [], ...partial };
}

describe('planReminders', () => {
  it('reminds 3 h before a flight and 1 h before a stay', () => {
    const r = planReminders(
      input({
        bookings: [
          {
            id: 'b1',
            tripId: 't1',
            type: 'flight',
            title: '6E 123',
            startsAt: '2026-12-05T06:00:00Z',
          },
          {
            id: 'b2',
            tripId: 't1',
            type: 'stay',
            title: 'Hotel',
            startsAt: '2026-12-05T08:30:00Z',
          },
        ],
      }),
      now,
    );
    expect(r.map((x) => [x.key, x.at])).toEqual([
      ['booking:b1', '2026-12-05T03:00:00.000Z'],
      ['booking:b2', '2026-12-05T07:30:00.000Z'],
    ]);
    expect(r[0]?.body).toContain('11:30');
  });

  it('turns a local item time into UTC using the trip time zone', () => {
    const r = planReminders(
      input({
        items: [
          { id: 'i1', tripId: 't1', title: 'Fort', dayDate: '2026-12-05', startTime: '10:00' },
          { id: 'i2', tripId: 't1', title: 'Untimed', dayDate: '2026-12-05', startTime: null },
        ],
      }),
      now,
    );
    // 10:00 IST = 04:30 UTC, minus 30 min
    expect(r).toHaveLength(1);
    expect(r[0]?.at).toBe('2026-12-05T04:00:00.000Z');
  });

  it('skips locked polls, past times and unknown trips; respects the limit', () => {
    const r = planReminders(
      input({
        polls: [
          {
            id: 'p1',
            tripId: 't1',
            question: 'Where?',
            deadline: '2026-12-02T10:00:00Z',
            locked: false,
          },
          {
            id: 'p2',
            tripId: 't1',
            question: 'Done',
            deadline: '2026-12-02T10:00:00Z',
            locked: true,
          },
          {
            id: 'p3',
            tripId: 'x',
            question: 'Other',
            deadline: '2026-12-02T10:00:00Z',
            locked: false,
          },
          {
            id: 'p4',
            tripId: 't1',
            question: 'Past',
            deadline: '2026-12-01T00:30:00Z',
            locked: false,
          },
          {
            id: 'p5',
            tripId: 't1',
            question: 'Later',
            deadline: '2026-12-03T10:00:00Z',
            locked: false,
          },
        ],
      }),
      now,
      1,
    );
    expect(r.map((x) => x.key)).toEqual(['poll:p1']);
  });
});
