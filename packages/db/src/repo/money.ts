import { and, eq, inArray } from 'drizzle-orm';
import {
  computeSplits,
  netBalances,
  settleUp,
  type SplitInput,
  type Transfer,
} from '@travelog/core';

import { deleteRow, getRow, insertRow, liveRows, now, tx, updateRow, type Db } from '../db';
import {
  budgets,
  expenseSplits,
  expenses,
  settlements,
  type BudgetCategory,
  type SplitMethod,
} from '../schema';
import { listMembers } from './trips';

export type Expense = typeof expenses.$inferSelect;
export type Settlement = typeof settlements.$inferSelect;

// Budgets --------------------------------------------------------------------

export function setBudget(
  db: Db,
  tripId: string,
  category: BudgetCategory,
  amountMinor: number,
): void {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0)
    throw new RangeError('budget must be a positive amount');
  tx(db, (db) => {
    // One row per (trip, category), kept forever and updated in place so every change syncs.
    const row = db
      .select()
      .from(budgets)
      .where(and(eq(budgets.tripId, tripId), eq(budgets.category, category)))
      .get();
    if (!row) {
      insertRow(db, 'budgets', { tripId, category, amountMinor });
      return;
    }
    if (row.deletedAt)
      db.update(budgets).set({ deletedAt: null }).where(eq(budgets.id, row.id)).run();
    updateRow(db, 'budgets', row.id, { amountMinor });
  });
}

export function listBudgets(db: Db, tripId: string): Record<BudgetCategory, number> {
  const out = { stay: 0, travel: 0, food: 0, activities: 0, shopping: 0, misc: 0 };
  for (const b of liveRows(db, 'budgets', eq(budgets.tripId, tripId)))
    out[b.category] = b.amountMinor;
  return out;
}

// Expenses -------------------------------------------------------------------

export interface ExpenseInput {
  tripId: string;
  title: string;
  category: BudgetCategory;
  amountMinor: number;
  currency: string;
  /** Amount in the trip currency when `currency` differs; defaults to amountMinor. */
  tripAmountMinor?: number;
  /** Rate used for tripAmountMinor, e.g. "83.2"; stored for display. */
  fxRate?: string | null;
  paidByMemberId: string;
  splitMethod: SplitMethod;
  /** Who shares the cost (and their weights for shares / percent / exact). */
  participants: SplitInput[];
  spentAt?: string;
  bookingId?: string | null;
  notes?: string | null;
}

export function addExpense(db: Db, input: ExpenseInput): Expense {
  if (!input.title.trim()) throw new RangeError('what was it for?');
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new RangeError('amount must be more than zero');
  }
  const tripAmount = input.tripAmountMinor ?? input.amountMinor;
  // Exact amounts are entered in the currency paid; convert them proportionally.
  const participants =
    input.splitMethod === 'exact' && tripAmount !== input.amountMinor
      ? scaleExact(input.participants, input.amountMinor, tripAmount)
      : input.participants;
  const ordered = [...participants].sort((a, b) => a.memberId.localeCompare(b.memberId));
  const splits = computeSplits(input.splitMethod, tripAmount, ordered);

  return tx(db, (db) => {
    const expense = insertRow(db, 'expenses', {
      tripId: input.tripId,
      title: input.title.trim().slice(0, 80),
      category: input.category,
      amountMinor: input.amountMinor,
      currency: input.currency,
      tripAmountMinor: tripAmount,
      fxRate: input.fxRate ?? null,
      paidByMemberId: input.paidByMemberId,
      splitMethod: input.splitMethod,
      spentAt: input.spentAt ?? now().toISOString(),
      bookingId: input.bookingId ?? null,
      notes: input.notes ?? null,
    });
    for (const s of splits) {
      insertRow(db, 'expense_splits', {
        expenseId: expense.id,
        memberId: s.memberId,
        shareMinor: s.shareMinor,
        weight: s.weight,
      });
    }
    return expense;
  });
}

function scaleExact(parts: SplitInput[], from: number, to: number): SplitInput[] {
  const scaled = parts.map((p) => ({ ...p, weight: Math.floor(((p.weight ?? 0) * to) / from) }));
  let diff = to - scaled.reduce((a, p) => a + (p.weight ?? 0), 0);
  for (const p of scaled) {
    if (diff === 0) break;
    p.weight = (p.weight ?? 0) + 1;
    diff -= 1;
  }
  return scaled;
}

export interface ExpenseWithSplits extends Expense {
  splits: { memberId: string; shareMinor: number; weight: number | null }[];
}

export function listExpenses(db: Db, tripId: string): ExpenseWithSplits[] {
  const list = liveRows(db, 'expenses', eq(expenses.tripId, tripId)).sort((a, b) =>
    b.spentAt.localeCompare(a.spentAt),
  );
  if (!list.length) return [];
  const splits = liveRows(
    db,
    'expense_splits',
    inArray(
      expenseSplits.expenseId,
      list.map((e) => e.id),
    ),
  );
  return list.map((e) => ({
    ...e,
    splits: splits
      .filter((s) => s.expenseId === e.id)
      .map((s) => ({ memberId: s.memberId, shareMinor: s.shareMinor, weight: s.weight })),
  }));
}

export function deleteExpense(db: Db, id: string): void {
  tx(db, (db) => {
    for (const s of liveRows(db, 'expense_splits', eq(expenseSplits.expenseId, id))) {
      deleteRow(db, 'expense_splits', s.id);
    }
    deleteRow(db, 'expenses', id);
  });
}

// Balances and settling up ------------------------------------------------------

export function recordSettlement(
  db: Db,
  input: {
    tripId: string;
    fromMemberId: string;
    toMemberId: string;
    amountMinor: number;
    method: 'upi' | 'cash' | 'other';
  },
): Settlement {
  if (input.fromMemberId === input.toMemberId) throw new RangeError('pick two different people');
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new RangeError('amount must be more than zero');
  }
  return insertRow(db, 'settlements', { ...input, settledAt: now().toISOString() });
}

export function listSettlements(db: Db, tripId: string): Settlement[] {
  return liveRows(db, 'settlements', eq(settlements.tripId, tripId));
}

export interface TripMoney {
  /** Total spent by the group in the trip currency. */
  spentMinor: number;
  byCategory: Record<BudgetCategory, number>;
  /** Positive = owed to them; negative = they owe. */
  net: Map<string, number>;
  transfers: Transfer[];
  /** What each member's own share of spending has been. */
  shareByMember: Map<string, number>;
}

export function tripMoney(db: Db, tripId: string): TripMoney {
  const memberIds = listMembers(db, tripId).map((m) => m.id);
  const list = listExpenses(db, tripId);
  const net = netBalances(
    memberIds,
    list.map((e) => ({
      paidByMemberId: e.paidByMemberId,
      amountMinor: e.tripAmountMinor,
      splits: e.splits,
    })),
    listSettlements(db, tripId),
  );
  const byCategory = { stay: 0, travel: 0, food: 0, activities: 0, shopping: 0, misc: 0 };
  const shareByMember = new Map<string, number>(memberIds.map((id) => [id, 0]));
  let spentMinor = 0;
  for (const e of list) {
    spentMinor += e.tripAmountMinor;
    byCategory[e.category] += e.tripAmountMinor;
    for (const s of e.splits)
      shareByMember.set(s.memberId, (shareByMember.get(s.memberId) ?? 0) + s.shareMinor);
  }
  return { spentMinor, byCategory, net, transfers: settleUp(net), shareByMember };
}

export function getExpense(db: Db, id: string): Expense | undefined {
  return getRow(db, 'expenses', id);
}
