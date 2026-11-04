import { getQuote, rememberRate, savedQuote } from '@/lib/fx';
import { makeDb } from '@/testing/test-utils';

const ok = (body: unknown) =>
  (async () => ({ ok: true, json: async () => body })) as unknown as typeof fetch;
const offline = (async () => {
  throw new Error('network');
}) as unknown as typeof fetch;

describe('exchange rates', () => {
  it('fetches, saves, and falls back to the saved rate offline', async () => {
    const db = makeDb();
    expect(await getQuote(db, 'USD', 'INR', offline)).toBeNull();

    const q = await getQuote(
      db,
      'USD',
      'INR',
      ok({ amount: 1, base: 'USD', date: '2026-11-03', rates: { INR: 83.2 } }),
    );
    expect(q?.rate).toBe(83.2);
    expect(savedQuote(db, 'USD', 'INR')?.date).toBe('2026-11-03');

    // Saved today: no fetch needed even offline.
    expect((await getQuote(db, 'USD', 'INR', offline))?.stale).toBeUndefined();
  });

  it('suggests a typed rate next time, marked as not fresh', async () => {
    const db = makeDb();
    rememberRate(db, 'AED', 'INR', 22.7);
    const q = await getQuote(db, 'AED', 'INR', ok({ message: 'not found' }));
    expect(q).toMatchObject({ rate: 22.7, stale: true });
  });
});
