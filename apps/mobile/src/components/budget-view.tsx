import { formatRate } from '@travelog/core';
import {
  BUDGET_CATEGORIES,
  getTrip,
  listBudgets,
  listExpenses,
  listMembers,
  setBudget,
  tripMoney,
  type BudgetCategory,
} from '@travelog/db';
import { categoryColors } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { amountText, errorMessage, money, parseAmount } from '@/lib/format';
import { CATEGORY_LABELS } from '@/lib/labels';
import {
  Bar,
  Between,
  Body,
  Button,
  Card,
  Divider,
  Empty,
  ErrorText,
  Field,
  H2,
  Row,
  Strong,
  WithIcon,
} from '@/ui/kit';
import { useTheme } from '@/ui/theme';

import { PeopleCard } from './people-card';

export function BudgetView({
  tripId,
  startEditing = false,
}: {
  tripId: string;
  /** Open with the budget editor showing (from "Set a budget" in trip setup). */
  startEditing?: boolean;
}) {
  const t = useTheme();
  const router = useRouter();
  const mutate = useMutate();
  const trip = useQuery((db) => getTrip(db, tripId), [tripId]);
  const members = useQuery((db) => listMembers(db, tripId), [tripId]);
  const budgets = useQuery((db) => listBudgets(db, tripId), [tripId]);
  const m = useQuery((db) => tripMoney(db, tripId), [tripId]);
  const expenses = useQuery((db) => listExpenses(db, tripId), [tripId]);
  // Opening with startEditing shows the editor from the first render (no effect needed).
  const [editing, setEditing] = useState(() => startEditing && !!trip);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    startEditing && trip ? budgetDraft(budgets, trip.currency) : {},
  );
  const [error, setError] = useState<string | null>(null);
  if (!trip) return null;

  const cur = trip.currency;
  const name = (id: string) => members.find((x) => x.id === id)?.displayName ?? 'Former member';
  const me = members.find((x) => x.isMe);
  const perPersonBudget = BUDGET_CATEGORIES.reduce((a, c) => a + budgets[c], 0);
  const groupBudget = perPersonBudget * members.length;
  const myNet = me ? (m.net.get(me.id) ?? 0) : 0;

  const startEdit = () => {
    setDraft(budgetDraft(budgets, cur));
    setEditing(true);
  };

  const saveBudget = () => {
    try {
      mutate((db) => {
        for (const c of BUDGET_CATEGORIES) {
          const v = parseAmount(draft[c] ?? '', cur) ?? 0;
          if (v !== budgets[c]) setBudget(db, tripId, c, v);
        }
      });
      setEditing(false);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <PeopleCard tripId={tripId} />
      <Card>
        <Body muted small>
          Group spent
        </Body>
        <Strong style={{ fontSize: 28 }}>{money(m.spentMinor, cur)}</Strong>
        {groupBudget > 0 ? (
          <>
            <Bar value={m.spentMinor / groupBudget} />
            <Body muted small>
              of {money(groupBudget, cur)} budget ({money(perPersonBudget, cur)} per person ×{' '}
              {members.length})
            </Body>
          </>
        ) : !editing ? (
          <View style={{ gap: 8 }}>
            <Body muted small>
              No budget set yet.
            </Body>
            <Button label="Set budget" icon="budget" small onPress={startEdit} />
          </View>
        ) : null}
        {me ? (
          <Body
            style={{
              color: myNet > 0 ? t.success : myNet < 0 ? t.danger : t.ink2,
              fontWeight: '700',
            }}
          >
            {myNet > 0
              ? `You are owed ${money(myNet, cur)}`
              : myNet < 0
                ? `You owe ${money(-myNet, cur)}`
                : 'You are all square'}
          </Body>
        ) : null}
      </Card>

      <H2
        right={
          !editing ? (
            <Button label="Edit budget" icon="edit" variant="link" onPress={startEdit} />
          ) : null
        }
      >
        By category
      </H2>
      {editing ? (
        <Card>
          <Body muted small>
            Budget per person, in {cur}
          </Body>
          {BUDGET_CATEGORIES.map((c) => (
            <Field
              key={c}
              label={CATEGORY_LABELS[c].label}
              value={draft[c] ?? ''}
              onChangeText={(v) => setDraft({ ...draft, [c]: v })}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          ))}
          <ErrorText>{error}</ErrorText>
          <Row>
            <View style={{ flex: 1 }}>
              <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Save budget" onPress={saveBudget} />
            </View>
          </Row>
        </Card>
      ) : (
        <Card>
          {BUDGET_CATEGORIES.map((c: BudgetCategory) => {
            const budget = budgets[c] * members.length;
            const spent = m.byCategory[c];
            if (!budget && !spent) return null;
            return (
              <View key={c} style={{ gap: 6 }}>
                <Between>
                  <WithIcon icon={CATEGORY_LABELS[c].icon}>
                    <Strong>{CATEGORY_LABELS[c].label}</Strong>
                  </WithIcon>
                  <Body small>
                    {money(spent, cur)}
                    {budget ? ` / ${money(budget, cur)}` : ''}
                  </Body>
                </Between>
                {budget ? (
                  <Bar
                    value={spent / budget}
                    color={categoryColors[c === 'travel' ? 'travel' : c]}
                  />
                ) : null}
              </View>
            );
          })}
          {!m.spentMinor && !perPersonBudget ? (
            <Body muted>Add a budget or your first expense.</Body>
          ) : null}
        </Card>
      )}

      <H2
        right={
          m.transfers.length ? (
            <Button
              label="Settle up"
              variant="link"
              onPress={() => router.push(`/trip/${tripId}/settle`)}
            />
          ) : null
        }
      >
        Balances
      </H2>
      <Card>
        {members.map((x) => {
          const v = m.net.get(x.id) ?? 0;
          return (
            <Between key={x.id}>
              <Body>{x.isMe ? `${x.displayName} (you)` : x.displayName}</Body>
              <Body
                style={{ color: v > 0 ? t.success : v < 0 ? t.danger : t.ink2, fontWeight: '700' }}
              >
                {v > 0 ? `gets ${money(v, cur)}` : v < 0 ? `owes ${money(-v, cur)}` : 'settled'}
              </Body>
            </Between>
          );
        })}
        {members.length < 2 ? (
          <Body muted small>
            Add the people on this trip in People above to split costs.
          </Body>
        ) : null}
      </Card>

      <H2
        right={
          <Button
            label="Add"
            icon="add"
            variant="link"
            onPress={() => router.push(`/trip/${tripId}/expense`)}
          />
        }
      >
        Expenses
      </H2>
      {expenses.length ? (
        <Card style={{ paddingVertical: 4 }}>
          {expenses.map((e, i) => {
            const mine = me ? (e.splits.find((s) => s.memberId === me.id)?.shareMinor ?? 0) : 0;
            const net = me && e.paidByMemberId === me.id ? e.tripAmountMinor - mine : -mine;
            return (
              <View key={e.id}>
                {i > 0 ? <Divider /> : null}
                <View
                  style={{ paddingVertical: 10 }}
                  accessible
                  accessibilityLabel={`${e.title}, ${money(e.tripAmountMinor, cur)}, paid by ${name(e.paidByMemberId)}`}
                >
                  <Between>
                    <View style={{ flex: 1 }}>
                      <WithIcon icon={CATEGORY_LABELS[e.category].icon}>
                        <Strong>{e.title}</Strong>
                      </WithIcon>
                    </View>
                    <Body style={{ color: net >= 0 ? t.success : t.danger, fontWeight: '700' }}>
                      {net >= 0 ? '+' : '−'}
                      {money(Math.abs(net), cur)}
                    </Body>
                  </Between>
                  <Body muted small>
                    {name(e.paidByMemberId)} paid {money(e.amountMinor, e.currency)}
                    {e.currency !== cur
                      ? ` (${money(e.tripAmountMinor, cur)}${e.fxRate ? ` @ ${formatRate(Number(e.fxRate))}` : ''})`
                      : ''}{' '}
                    · split {e.splits.length} ways
                  </Body>
                </View>
              </View>
            );
          })}
        </Card>
      ) : (
        <Empty
          icon="expense"
          title="No expenses yet"
          body="Add the first one — everyone's share is worked out for you."
        />
      )}
    </View>
  );
}

function budgetDraft(
  budgets: Record<BudgetCategory, number>,
  currency: string,
): Record<string, string> {
  return Object.fromEntries(
    BUDGET_CATEGORIES.map((c) => [c, amountText(budgets[c] || null, currency)]),
  );
}
