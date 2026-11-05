import {
  addExpense,
  BUDGET_CATEGORIES,
  getTrip,
  listMembers,
  type BudgetCategory,
  type SplitMethod,
} from '@travelog/db';
import { convertMinor, formatRate, parseRate } from '@travelog/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useDb, useMutate, useQuery } from '@/data/provider';
import { CURRENCIES, errorMessage, money, parseAmount, shortDate } from '@/lib/format';
import { getQuote, rememberRate, type SavedQuote } from '@/lib/fx';
import { CATEGORY_LABELS, SPLIT_LABELS } from '@/lib/labels';
import {
  Between,
  Body,
  Button,
  Chip,
  ChipRow,
  ErrorText,
  Field,
  H1,
  Row,
  Screen,
  Segmented,
} from '@/ui/kit';
import { useCelebrate } from '@/ui/motion';
import { ModeProvider } from '@/ui/theme';

export default function ExpenseEditor() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: 'trip' }>();
  return (
    <ModeProvider mode={mode === 'trip' ? 'trip' : 'plan'}>
      <ExpenseForm tripId={id} />
    </ModeProvider>
  );
}

function ExpenseForm({ tripId }: { tripId: string }) {
  const router = useRouter();
  const mutate = useMutate();
  const celebrate = useCelebrate();
  const trip = useQuery((db) => getTrip(db, tripId), [tripId]);
  const members = useQuery((db) => listMembers(db, tripId), [tripId]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(trip?.currency ?? 'INR');
  const [rateText, setRateText] = useState('');
  const [rateEdited, setRateEdited] = useState(false);
  const [quote, setQuote] = useState<SavedQuote | null | 'loading'>(null);
  const db = useDb();
  const [category, setCategory] = useState<BudgetCategory>('food');
  const [paidBy, setPaidBy] = useState(members.find((m) => m.isMe)?.id ?? members[0]?.id ?? '');
  const [method, setMethod] = useState<SplitMethod>('equal');
  const [included, setIncluded] = useState<Set<string>>(new Set(members.map((m) => m.id)));
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const tripCurrency = trip?.currency ?? 'INR';
  const foreign = currency !== tripCurrency;

  // Suggest today's rate when a foreign currency is picked (works offline with the last saved rate).
  useEffect(() => {
    if (!foreign) return;
    let live = true;
    setQuote('loading');
    getQuote(db, currency, tripCurrency).then((q) => {
      if (!live) return;
      setQuote(q);
      if (q) setRateText((current) => (rateEdited && current ? current : formatRate(q.rate)));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, currency, tripCurrency, foreign]);

  if (!trip) return null;

  const total = parseAmount(amount, currency);
  const rate = foreign ? parseRate(rateText) : 1;
  const converted = total && rate ? convertMinor(total, currency, trip.currency, rate) : null;
  const people = members.filter((m) => included.has(m.id));

  const weightFor = (memberId: string): number | undefined => {
    const raw = weights[memberId] ?? '';
    if (method === 'shares') return raw ? Math.round(Number(raw)) : 1;
    if (method === 'percent') return raw ? Math.round(Number(raw) * 100) : undefined;
    if (method === 'exact') return parseAmount(raw, currency) ?? undefined;
    return undefined;
  };

  const save = () => {
    try {
      if (!total) throw new Error('enter how much it cost');
      if (!people.length) throw new Error('pick at least one person to split with');
      if (foreign && (!rate || !converted))
        throw new Error(`enter the rate: how many ${trip.currency} for 1 ${currency}`);
      if (foreign && rate && (quote === null || quote === 'loading' || quote.rate !== rate))
        rememberRate(db, currency, trip.currency, rate);
      mutate((db) =>
        addExpense(db, {
          tripId,
          title,
          category,
          amountMinor: total,
          currency,
          tripAmountMinor: converted ?? total,
          fxRate: foreign && rate ? String(rate) : null,
          paidByMemberId: paidBy,
          splitMethod: method,
          participants: people.map((p) => ({ memberId: p.id, weight: weightFor(p.id) })),
        }),
      );
      celebrate('Expense added');
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const toggle = (memberId: string) => {
    const next = new Set(included);
    if (next.has(memberId)) next.delete(memberId);
    else next.add(memberId);
    setIncluded(next);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Between>
        <H1>Add expense</H1>
        <Button label="Cancel" variant="link" onPress={() => router.back()} />
      </Between>
      <Field
        label="What for"
        value={title}
        onChangeText={setTitle}
        placeholder="Beach shack lunch"
      />
      <Field
        label={`Amount (${currency})`}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0"
      />
      <ChipRow>
        {[trip.currency, ...CURRENCIES.filter((c) => c !== trip.currency)].map((c) => (
          <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />
        ))}
      </ChipRow>
      {foreign ? (
        <>
          <Field
            label={`1 ${currency} = ? ${trip.currency}`}
            value={rateText}
            onChangeText={(v) => {
              setRateText(v);
              setRateEdited(true);
            }}
            keyboardType="decimal-pad"
            placeholder={quote === 'loading' ? 'Finding today’s rate…' : 'Rate'}
            hint={rateHint(quote)}
          />
          {converted ? (
            <Body muted small>
              = {money(converted, trip.currency, true)} in the trip budget
            </Body>
          ) : null}
        </>
      ) : null}
      <Body muted small>
        Category
      </Body>
      <ChipRow>
        {BUDGET_CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={CATEGORY_LABELS[c].label}
            icon={CATEGORY_LABELS[c].icon}
            selected={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </ChipRow>
      <Body muted small>
        Paid by
      </Body>
      <ChipRow>
        {members.map((m) => (
          <Chip
            key={m.id}
            label={m.isMe ? 'You' : m.displayName}
            selected={paidBy === m.id}
            onPress={() => setPaidBy(m.id)}
          />
        ))}
      </ChipRow>
      <Body muted small>
        Split
      </Body>
      <Segmented<SplitMethod>
        value={method}
        onChange={setMethod}
        options={(['equal', 'shares', 'exact', 'percent'] as const).map((v) => ({
          value: v,
          label: SPLIT_LABELS[v],
        }))}
      />
      {members.map((m) => {
        const on = included.has(m.id);
        const share =
          method === 'equal' && on && total ? Math.floor(total / Math.max(people.length, 1)) : null;
        return (
          <Row key={m.id}>
            <View style={{ flex: 1 }}>
              <Chip
                label={m.isMe ? 'You' : m.displayName}
                icon={on ? 'check' : 'circle'}
                selected={on}
                onPress={() => toggle(m.id)}
              />
            </View>
            {on && method !== 'equal' ? (
              <View style={{ width: 120 }}>
                <Field
                  label={method === 'shares' ? 'Shares' : method === 'percent' ? '%' : currency}
                  value={weights[m.id] ?? ''}
                  onChangeText={(v) => setWeights({ ...weights, [m.id]: v })}
                  keyboardType="decimal-pad"
                  placeholder={method === 'shares' ? '1' : '0'}
                />
              </View>
            ) : share != null ? (
              <Body muted small>
                ≈ {money(share, currency)}
              </Body>
            ) : null}
          </Row>
        );
      })}
      <ErrorText>{error}</ErrorText>
      <Button label="Save expense" onPress={save} disabled={!title.trim() || !amount} />
    </Screen>
  );
}

function rateHint(quote: SavedQuote | null | 'loading'): string {
  if (quote === 'loading') return 'Looking up the rate…';
  if (!quote) return 'No rate found offline. Type the rate from your bank or card app.';
  const day = shortDate(quote.date);
  return quote.stale
    ? `Last saved rate (${day}); you're offline. Change it if your bank charged more.`
    : `Reference rate of ${day}. Change it to match what your bank charged.`;
}
