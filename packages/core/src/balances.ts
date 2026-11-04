export interface ExpenseForBalance {
  paidByMemberId: string;
  /** Amount in the trip currency. */
  amountMinor: number;
  splits: readonly { memberId: string; shareMinor: number }[];
}

export interface SettlementForBalance {
  fromMemberId: string;
  toMemberId: string;
  amountMinor: number;
}

/**
 * Net position per member in the trip currency: positive = others owe them,
 * negative = they owe others. Always sums to zero.
 */
export function netBalances(
  memberIds: readonly string[],
  expenses: readonly ExpenseForBalance[],
  settlements: readonly SettlementForBalance[] = [],
): Map<string, number> {
  const net = new Map<string, number>(memberIds.map((id) => [id, 0]));
  const add = (id: string, v: number) => net.set(id, (net.get(id) ?? 0) + v);
  for (const e of expenses) {
    add(e.paidByMemberId, e.amountMinor);
    for (const s of e.splits) add(s.memberId, -s.shareMinor);
  }
  for (const s of settlements) {
    add(s.fromMemberId, s.amountMinor);
    add(s.toMemberId, -s.amountMinor);
  }
  return net;
}

export interface Transfer {
  fromMemberId: string;
  toMemberId: string;
  amountMinor: number;
}

/**
 * Turns net balances into a short list of payments that settles everyone
 * (largest debtor pays largest creditor first). Uses at most n − 1 payments.
 * Ties are broken by member id so every device shows the same list.
 */
export function settleUp(net: ReadonlyMap<string, number>): Transfer[] {
  const byAmount = (a: [string, number], b: [string, number]) =>
    Math.abs(b[1]) - Math.abs(a[1]) || a[0].localeCompare(b[0]);
  const debtors = [...net]
    .filter(([, v]) => v < 0)
    .sort(byAmount)
    .map(([id, v]) => ({ id, left: -v }));
  const creditors = [...net]
    .filter(([, v]) => v > 0)
    .sort(byAmount)
    .map(([id, v]) => ({ id, left: v }));

  const transfers: Transfer[] = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d]!;
    const creditor = creditors[c]!;
    const amount = Math.min(debtor.left, creditor.left);
    if (amount > 0)
      transfers.push({ fromMemberId: debtor.id, toMemberId: creditor.id, amountMinor: amount });
    debtor.left -= amount;
    creditor.left -= amount;
    if (debtor.left === 0) d += 1;
    if (creditor.left === 0) c += 1;
  }
  return transfers;
}
