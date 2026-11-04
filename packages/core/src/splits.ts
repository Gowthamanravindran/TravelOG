import { splitByShares, splitEqually } from './money';

export type SplitMethod = 'equal' | 'shares' | 'exact' | 'percent';

export interface SplitInput {
  memberId: string;
  /**
   * shares: number of shares (e.g. 2 = pays double)
   * percent: basis points (2500 = 25 %); all must add up to 10000
   * exact: amount in minor units; all must add up to the total
   * equal: ignored
   */
  weight?: number;
}

export interface SplitResult {
  memberId: string;
  shareMinor: number;
  weight: number | null;
}

/**
 * Works out each member's share of `totalMinor`. Shares always add up exactly to
 * the total. Members are processed in the order given, so pass them in a stable
 * order (e.g. by member id) to get identical results on every device.
 */
export function computeSplits(
  method: SplitMethod,
  totalMinor: number,
  members: readonly SplitInput[],
): SplitResult[] {
  if (members.length === 0)
    throw new RangeError('an expense needs at least one person to split with');
  const ids = members.map((m) => m.memberId);
  if (new Set(ids).size !== ids.length) throw new RangeError('each person can appear only once');

  switch (method) {
    case 'equal': {
      const parts = splitEqually(totalMinor, members.length);
      return members.map((m, i) => ({
        memberId: m.memberId,
        shareMinor: parts[i] ?? 0,
        weight: null,
      }));
    }
    case 'shares': {
      const weights = members.map((m) => requireWeight(m, 'shares'));
      const parts = splitByShares(totalMinor, weights);
      return members.map((m, i) => ({
        memberId: m.memberId,
        shareMinor: parts[i] ?? 0,
        weight: weights[i] ?? 0,
      }));
    }
    case 'percent': {
      const weights = members.map((m) => requireWeight(m, 'percent'));
      const sum = weights.reduce((a, b) => a + b, 0);
      if (sum !== 10000)
        throw new RangeError(`percentages must add up to 100 %, got ${sum / 100} %`);
      const parts = splitByShares(totalMinor, weights);
      return members.map((m, i) => ({
        memberId: m.memberId,
        shareMinor: parts[i] ?? 0,
        weight: weights[i] ?? 0,
      }));
    }
    case 'exact': {
      const amounts = members.map((m) => requireWeight(m, 'exact'));
      const sum = amounts.reduce((a, b) => a + b, 0);
      if (sum !== totalMinor) {
        throw new RangeError(`exact amounts must add up to the total (${sum} vs ${totalMinor})`);
      }
      return members.map((m, i) => ({
        memberId: m.memberId,
        shareMinor: amounts[i] ?? 0,
        weight: amounts[i] ?? 0,
      }));
    }
  }
}

function requireWeight(m: SplitInput, method: SplitMethod): number {
  if (m.weight === undefined || !Number.isSafeInteger(m.weight) || m.weight < 0) {
    throw new RangeError(`${method} split needs a whole, non-negative value for every person`);
  }
  return m.weight;
}
