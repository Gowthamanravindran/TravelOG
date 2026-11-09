import { donutArcs } from '@travelog/core';
import {
  BUDGET_CATEGORIES,
  getTrip,
  listBudgets,
  listMembers,
  tripMoney,
  type BudgetCategory,
} from '@travelog/db';
import { font, type } from '@travelog/ui';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useQuery } from '@/data/provider';
import { money } from '@/lib/format';
import { CATEGORY_LABELS } from '@/lib/labels';
import { Bar, Body, Card, Segmented } from '@/ui/kit';
import { MOTION, useMotionOk } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * Where the money went (Plan 47): a donut by category, or by person for a group
 * (each person's share of the costs), with the total in the middle and a legend.
 * In Plan mode a category's budget shows in its legend row.
 */
type ChartView = 'category' | 'person';

const SIZE = 168;
const STROKE = 22;
/** People take the category colours in this order. */
const PERSON_COLOURS: BudgetCategory[] = [
  'travel',
  'stay',
  'food',
  'activities',
  'shopping',
  'misc',
];

interface Slice {
  key: string;
  label: string;
  value: number;
  colour: string;
  budget?: number;
}

export function SpendChart({
  tripId,
  group,
  showBudget,
}: {
  tripId: string;
  /** More than one person: offers "By person". */
  group: boolean;
  /** Plan mode: each category's budget alongside what's spent. */
  showBudget: boolean;
}) {
  const t = useTheme();
  const ok = useMotionOk();
  const [view, setView] = useState<ChartView>('category');
  const m = useQuery((db) => tripMoney(db, tripId), [tripId]);
  const members = useQuery((db) => listMembers(db, tripId), [tripId]);
  const budgets = useQuery((db) => listBudgets(db, tripId), [tripId]);
  const cur = useQuery((db) => getTrip(db, tripId)?.currency ?? 'INR', [tripId]);
  const shown: ChartView = group ? view : 'category';

  const slices: Slice[] =
    shown === 'category'
      ? BUDGET_CATEGORIES.map((c) => ({
          key: c,
          label: CATEGORY_LABELS[c].label,
          value: m.byCategory[c],
          colour: t.categories[c],
          budget: budgets[c] * members.length,
        }))
      : members.map((p, i) => ({
          key: p.id,
          label: p.isMe ? `${p.displayName} (you)` : p.displayName,
          value: m.shareByMember.get(p.id) ?? 0,
          colour: t.categories[PERSON_COLOURS[i % PERSON_COLOURS.length]!],
        }));
  const sorted = [...slices].sort((a, b) => b.value - a.value);
  const arcs = donutArcs(sorted.map((s) => ({ key: s.key, value: s.value })));
  const colourOf = new Map(sorted.map((s) => [s.key, s.colour]));
  const total = m.spentMinor;
  const legend = sorted.filter(
    (s) => s.value > 0 || (showBudget && shown === 'category' && s.budget),
  );
  const pct = (v: number) => (total ? `${Math.round((v / total) * 100)}%` : '');
  const summary = total
    ? `Spending by ${shown}: ${sorted
        .filter((s) => s.value > 0)
        .map((s) => `${s.label} ${money(s.value, cur)}, ${pct(s.value)}`)
        .join('; ')}`
    : 'No spending yet';

  return (
    <Card>
      {group ? (
        <Segmented
          options={[
            { value: 'category', label: 'By category' },
            { value: 'person', label: 'By person' },
          ]}
          value={view}
          onChange={setView}
        />
      ) : null}
      <Animated.View
        key={shown}
        entering={ok ? FadeIn.duration(MOTION.fast) : undefined}
        style={{ gap: 14 }}
      >
        <View
          style={styles.donut}
          accessible
          accessibilityRole="image"
          accessibilityLabel={summary}
          testID="spend-donut"
        >
          <Ring colour={t.surface2} start={0} sweep={360} />
          {arcs.map((a) => (
            <Ring key={a.key} colour={colourOf.get(a.key)!} start={a.start} sweep={a.sweep} />
          ))}
          <View style={styles.centre} pointerEvents="none">
            <Text style={[type.headline, { color: t.ink, ...font('display', 700) }]}>
              {money(total, cur)}
            </Text>
            <Text style={[type.caption, { color: t.ink2 }]}>
              {total ? 'spent' : 'No spending yet'}
            </Text>
          </View>
        </View>
        <View style={{ gap: 10 }}>
          {legend.map((s) => (
            <View key={s.key} style={{ gap: 4 }}>
              <View style={styles.row}>
                <View style={[styles.dot, { backgroundColor: s.colour }]} />
                <Text style={[type.body, { color: t.ink, flex: 1 }]} numberOfLines={1}>
                  {s.label}
                </Text>
                <Text style={[type.body, { color: t.ink, ...font('text', 600) }]}>
                  {money(s.value, cur)}
                  {showBudget && s.budget ? ` / ${money(s.budget, cur)}` : ''}
                </Text>
                <Text style={[type.caption, styles.pct, { color: t.ink2 }]}>{pct(s.value)}</Text>
              </View>
              {showBudget && s.budget ? <Bar value={s.value / s.budget} color={s.colour} /> : null}
            </View>
          ))}
          {!legend.length ? (
            <Body muted small>
              Add your first expense to see where the money goes.
            </Body>
          ) : null}
        </View>
      </Animated.View>
    </Card>
  );
}

/**
 * One arc of the ring, drawn with plain views so it works in every build (Plan 48):
 * a half-ring rotated by the sweep and clipped to the right half covers 0…sweep,
 * then the whole piece turns to its start. Sweeps over 180° are two pieces.
 */
function Ring({ colour, start, sweep }: { colour: string; start: number; sweep: number }) {
  if (sweep > 180)
    return (
      <>
        <Ring colour={colour} start={start} sweep={180} />
        <Ring colour={colour} start={start + 180} sweep={sweep - 180} />
      </>
    );
  return (
    <View style={[styles.layer, { transform: [{ rotate: `${start}deg` }] }]} pointerEvents="none">
      <View style={styles.rightHalf}>
        <View style={[styles.rotor, { transform: [{ rotate: `${sweep}deg` }] }]}>
          <View style={styles.leftHalf}>
            <View style={[styles.ring, { borderColor: colour }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE },
  rightHalf: {
    position: 'absolute',
    top: 0,
    left: SIZE / 2,
    width: SIZE / 2,
    height: SIZE,
    overflow: 'hidden',
  },
  rotor: { position: 'absolute', top: 0, left: -SIZE / 2, width: SIZE, height: SIZE },
  leftHalf: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIZE / 2,
    height: SIZE,
    overflow: 'hidden',
  },
  ring: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: STROKE },
  donut: { alignSelf: 'center', width: SIZE, height: SIZE },
  centre: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pct: { width: 36, textAlign: 'right' },
});
