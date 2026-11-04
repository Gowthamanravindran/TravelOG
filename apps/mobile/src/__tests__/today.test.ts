import { minutesUntil, statusAt } from '@/lib/today';

const items = [
  { id: 'breakfast', startTime: '08:30', durationMin: 60 },
  { id: 'fort', startTime: '10:00', durationMin: 90 },
  { id: 'kayak', startTime: '16:00', durationMin: 120 },
  { id: 'dinner', startTime: '19:30', durationMin: null },
  { id: 'souvenirs', startTime: null, durationMin: null },
];

describe('statusAt', () => {
  it('marks done, now, next and later stops', () => {
    expect(statusAt(items, '10:30').map((x) => x.status)).toEqual([
      'done',
      'now',
      'next',
      'later',
      'untimed',
    ]);
  });

  it('picks the next stop in a gap', () => {
    expect(statusAt(items, '13:00').map((x) => x.status)).toEqual([
      'done',
      'done',
      'next',
      'later',
      'untimed',
    ]);
  });

  it('treats a stop without duration as an hour long', () => {
    expect(statusAt(items, '20:00')[3]?.status).toBe('now');
    expect(statusAt(items, '20:31')[3]?.status).toBe('done');
  });

  it('counts down', () => {
    expect(minutesUntil('16:00', '15:35')).toBe(25);
  });
});
