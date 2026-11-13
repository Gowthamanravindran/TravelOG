import { font, type } from '@travelog/ui';
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
  IconTile,
  Row,
  Strong,
  WithIcon,
} from '@/ui/kit';
import { Appear, CountUp } from '@/ui/motion';
import { useMode, useTheme } from '@/ui/theme';

import { PeopleCard } from './people-card';
import { SpendChart } from './spend-chart';

export function BudgetView({
  tripId,
  startEditing = false,
}: {
  tripId: string;
  /** Open with the budget editor showing (from "Set a budget" in trip setup). */
  startEditing?: boolean;
}) {
  const t = useTheme();
  const mode = useMode();
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
  // Splitting, balances and settling up need someone to split with (Plan 47).
  const group = members.length > 1;
  // The budget is set while planning; Trip mode only records spending.
  const planning = mode === 'plan';

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
      <Card>
        <Row style={{ gap: 12 }}>
          <IconTile icon="budget" size={44} />
          <View style={{ flex: 1 }}>
            <Body muted small>
              {planning && group ? 'Group spent' : 'Spent'}
            </Body>
            <CountUp
              value={m.spentMinor}
              format={(n) => money(n, cur)}
              style={[type.headline, { color: t.ink, fontSize: 28, lineHeight: 34 }]}
            />
          </View>
        </Row>
        {groupBudget > 0 ? (
          <>
            <Bar value={m.spentMinor / groupBudget} />
            <Body muted small>
              of {money(groupBudget, cur)} budget
              {group ? ` (${money(perPersonBudget, cur)} per person × ${members.length})` : ''}
            </Body>
          </>
        ) : planning ? (
          <Body muted small>
            No budget set yet.
          </Body>
        ) : null}
        {me && group ? (
          <Body
            style={{
              color: myNet > 0 ? t.success : myNet < 0 ? t.danger : t.ink2,
              ...font('text', 600),
            }}
          >
            {myNet > 0
              ? `You are owed ${money(myNet, cur)}`
              : myNet < 0
                ? `You owe ${money(-myNet, cur)}`
                : 'You are all square'}
          </Body>
        ) : null}
        <Row>
          <View style={{ flex: 1 }}>
            <Button
              label="Add expense"
              icon="add"
              onPress={() =>
                router.push(`/trip/${tripId}/expense${mode === 'trip' ? '?mode=trip' : ''}`)
              }
            />
          </View>
          {planning && !editing ? (
            <View style={{ flex: 1 }}>
              <Button
                label={groupBudget > 0 ? 'Edit budget' : 'Set budget'}
                icon="budget"
                variant="secondary"
                onPress={startEdit}
              />
            </View>
          ) : null}
        </Row>
      </Card>

      {group ? <PeopleCard tripId={tripId} /> : <SoloPeople tripId={tripId} />}

      {planning && editing ? (
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
              <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Save budget" onPress={saveBudget} />
            </View>
          </Row>
        </Card>
      ) : null}

      <SpendChart tripId={tripId} group={group} showBudget={planning} />

      {group ? (
        <>
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
                    style={{
                      color: v > 0 ? t.success : v < 0 ? t.danger : t.ink2,
                      ...font('text', 600),
                    }}
                  >
                    {v > 0 ? `gets ${money(v, cur)}` : v < 0 ? `owes ${money(-v, cur)}` : 'settled'}
                  </Body>
                </Between>
              );
            })}
          </Card>
        </>
      ) : null}

      <H2
        right={
          <Button
            label="Add"
            icon="add"
            variant="link"
            onPress={() =>
              router.push(`/trip/${tripId}/expense${mode === 'trip' ? '?mode=trip' : ''}`)
            }
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
              <Appear key={e.id} index={i}>
                <View>
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
                      {group ? (
                        <Body
                          style={{ color: net >= 0 ? t.success : t.danger, ...font('text', 600) }}
                        >
                          {net >= 0 ? '+' : '−'}
                          {money(Math.abs(net), cur)}
                        </Body>
                      ) : (
                        <Body style={{ color: t.ink, ...font('text', 600) }}>
                          {money(e.tripAmountMinor, cur)}
                        </Body>
                      )}
                    </Between>
                    <Body muted small>
                      {group
                        ? `${name(e.paidByMemberId)} paid `
                        : `${CATEGORY_LABELS[e.category].label} · `}
                      {money(e.amountMinor, e.currency)}
                      {e.currency !== cur
                        ? ` (${money(e.tripAmountMinor, cur)}${e.fxRate ? ` @ ${formatRate(Number(e.fxRate))}` : ''})`
                        : ''}
                      {group ? ` · split ${e.splits.length} ways` : ''}
                    </Body>
                  </View>
                </View>
              </Appear>
            );
          })}
        </Card>
      ) : (
        <Empty
          icon="expense"
          art="money"
          artFamily="mango"
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

/** A solo trip: one line instead of the People card, which opens when tapped (Plan 47). */
function SoloPeople({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  if (open) return <PeopleCard tripId={tripId} startOpen />;
  return (
    <Row style={{ gap: 4, flexWrap: 'wrap' }}>
      <Body muted small>
        Travelling with others?
      </Body>
      <Button label="Add people" icon="personAdd" variant="link" onPress={() => setOpen(true)} />
    </Row>
  );
}
