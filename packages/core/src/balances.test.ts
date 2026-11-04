import { describe, expect, it } from 'vitest';
import { netBalances, settleUp } from './balances';
import { computeSplits } from './splits';

const members = ['you', 'riya', 'arjun', 'meera'];
const equal = (amount: number) =>
  computeSplits(
    'equal',
    amount,
    members.map((memberId) => ({ memberId })),
  );

describe('netBalances and settleUp', () => {
  // The Goa example from the prototype.
  const expenses = [
    { paidByMemberId: 'arjun', amountMinor: 284000, splits: equal(284000) },
    { paidByMemberId: 'you', amountMinor: 160000, splits: equal(160000) },
    { paidByMemberId: 'riya', amountMinor: 40000, splits: equal(40000) },
    { paidByMemberId: 'you', amountMinor: 2200000, splits: equal(2200000) },
    { paidByMemberId: 'meera', amountMinor: 620000, splits: equal(620000) },
  ];

  it('nets to zero', () => {
    const net = netBalances(members, expenses);
    expect([...net.values()].reduce((a, b) => a + b, 0)).toBe(0);
    expect(net.get('you')).toBe(2360000 - 826000);
  });

  it('settles everyone in at most n − 1 payments', () => {
    const net = netBalances(members, expenses);
    const transfers = settleUp(net);
    expect(transfers.length).toBeLessThanOrEqual(members.length - 1);
    const after = new Map(net);
    for (const t of transfers) {
      after.set(t.fromMemberId, (after.get(t.fromMemberId) ?? 0) + t.amountMinor);
      after.set(t.toMemberId, (after.get(t.toMemberId) ?? 0) - t.amountMinor);
    }
    expect([...after.values()].every((v) => v === 0)).toBe(true);
    expect(transfers.every((t) => t.toMemberId === 'you')).toBe(true);
  });

  it('counts settlements already paid', () => {
    const net = netBalances(
      ['a', 'b'],
      [
        {
          paidByMemberId: 'a',
          amountMinor: 1000,
          splits: [
            { memberId: 'a', shareMinor: 500 },
            { memberId: 'b', shareMinor: 500 },
          ],
        },
      ],
      [{ fromMemberId: 'b', toMemberId: 'a', amountMinor: 500 }],
    );
    expect(settleUp(net)).toEqual([]);
  });

  it('gives the same answer every time for ties', () => {
    const net = new Map([
      ['b', -100],
      ['a', -100],
      ['c', 200],
    ]);
    expect(settleUp(net)).toEqual([
      { fromMemberId: 'a', toMemberId: 'c', amountMinor: 100 },
      { fromMemberId: 'b', toMemberId: 'c', amountMinor: 100 },
    ]);
  });
});
