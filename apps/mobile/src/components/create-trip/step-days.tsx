import { splitStatus, stopDays, tripLengthDays } from '@travelog/core';
import { countryByCode } from '@travelog/globe';
import { font, spacing, type } from '@travelog/ui';
import { useEffect, useRef, useState, type Dispatch } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@/data/provider';
import { draftAutoName, draftStops } from '@/lib/trip-draft-save';
import type { DraftAction, DraftState } from '@/lib/trip-draft-state';
import { Icon } from '@/ui/icon';
import { Body, Field } from '@/ui/kit';
import { ReorderList } from '@/ui/reorder-list';
import { haptic, Shake, Swap } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

import { IconButton, StopNumber } from './parts';
import { datesText } from './step-dates';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "All days placed", "2 days left to place" or "2 days too many". */
export function splitText(left: number): string {
  if (left === 0) return 'All days placed';
  return left > 0 ? `${plural(left, 'day')} left to place` : `${plural(-left, 'day')} too many`;
}

/**
 * Step 4: the trip's name, and how many days go to each stop. The total has to match the
 * trip's length exactly; going over shows in red, in words as well as colour.
 */
export function StepDays({
  draft,
  dispatch,
}: {
  draft: DraftState;
  dispatch: Dispatch<DraftAction>;
}) {
  const t = useTheme();
  const auto = useQuery(
    (db) => draftAutoName(db, draft),
    [draft.cities, draft.days, draft.startDate],
  );
  // While the field has focus it shows exactly what is typed, even nothing; otherwise the
  // typed name, or the automatic one.
  const [typing, setTyping] = useState<string | null>(null);
  const stops = draftStops(draft);
  const total = tripLengthDays(draft.startDate, draft.endDate);
  const { placed, left, state } = splitStatus(stops, total);
  const days = stopDays(stops, draft.startDate);
  const over = state === 'over';

  // One tap when the days come to match, one warning (and a shake) each time they go over.
  const [overs, setOvers] = useState(0);
  const was = useRef(state);
  useEffect(() => {
    if (state !== was.current) {
      if (state === 'exact') haptic('success');
      if (state === 'over') {
        haptic('warning');
        setOvers((n) => n + 1);
      }
    }
    was.current = state;
  }, [state]);
  const setDays = (cityId: string, n: number) => {
    haptic('select');
    dispatch({ type: 'setDays', cityId, days: n });
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Field
        label="Trip name"
        value={typing ?? draft.name ?? auto}
        onFocus={() => setTyping(draft.name ?? auto)}
        onChangeText={(name) => {
          setTyping(name);
          dispatch({ type: 'setName', name });
        }}
        onBlur={() => setTyping(null)}
        maxLength={80}
      />
      <Shake count={overs}>
        <View style={styles.between}>
          <Text style={[type.headline, { color: over ? t.danger : t.ink }]}>
            {placed} of {total} days
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={[type.label, { color: over ? t.danger : t.ink2 }]}
          >
            {splitText(left)}
          </Text>
        </View>
      </Shake>
      {/* The visit order; drag a stop by its handle to change it (Plan 86). */}
      <ReorderList
        items={draft.cities.map((city) => ({ key: city.id, name: city.name, city }))}
        onMove={(from, to) => dispatch({ type: 'moveCity', from, to })}
        renderRow={({ city }, i) => {
          const late = !!draft.endDate && days[i]!.last > draft.endDate;
          return (
            <>
              <StopNumber n={i + 1} />
              <View style={styles.stopText}>
                <Text style={[type.body, { color: t.ink, ...font('text', 600) }]} numberOfLines={1}>
                  {city.name}
                </Text>
                <Text style={[type.caption, { color: late ? t.danger : t.ink2 }]}>
                  {datesText(days[i]!.first, days[i]!.last)}
                </Text>
              </View>
            </>
          );
        }}
        renderEnd={({ city }, i) => {
          const n = stops[i]!.days;
          const late = !!draft.endDate && days[i]!.last > draft.endDate;
          return (
            <View style={styles.days}>
              <IconButton
                label={`One day less in ${city.name}`}
                icon="remove"
                disabled={n <= 1}
                onPress={() => setDays(city.id, n - 1)}
              />
              {/* The count rolls in each time it changes. */}
              <Swap id={String(n)}>
                <Text
                  style={[type.headline, styles.count, { color: late ? t.danger : t.ink }]}
                  accessibilityLabel={`${plural(n, 'day')} in ${city.name}`}
                >
                  {n}
                </Text>
              </Swap>
              <IconButton
                label={`One day more in ${city.name}`}
                icon="add"
                onPress={() => setDays(city.id, n + 1)}
              />
            </View>
          );
        }}
      />
      {/* Every stop needs a day, so with more stops than days the total can never match. */}
      {stops.length > total ? (
        <Body small style={{ color: t.danger }}>
          More stops than days. Remove a stop, or go back and add days.
        </Body>
      ) : null}
      {draft.dropped.map((code) => (
        <Body key={code} small muted>
          No stops in {countryByCode(code)?.name ?? code}, so it’s left out
        </Body>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  stopText: { flex: 1, gap: 1 },
  days: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  count: { minWidth: 24, textAlign: 'center' },
});
