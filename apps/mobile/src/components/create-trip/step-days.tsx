import { splitStatus, stopDays, tripLengthDays } from '@travelog/core';
import { countryByCode } from '@travelog/globe';
import { font, spacing, type } from '@travelog/ui';
import { useState, type Dispatch } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@/data/provider';
import { draftAutoName, draftStops } from '@/lib/trip-draft-save';
import type { DraftAction, DraftState } from '@/lib/trip-draft-state';
import { Icon } from '@/ui/icon';
import { Body, Field } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

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
      <View>
        {draft.cities.map((city, i) => {
          const n = stops[i]!.days;
          const late = !!draft.endDate && days[i]!.last > draft.endDate;
          return (
            <View key={city.id} style={[styles.stop, { borderBottomColor: t.line }]}>
              <View style={[styles.number, { backgroundColor: t.accent }]}>
                <Text style={[type.caption, { color: t.onAccent, ...font('text', 600) }]}>
                  {i + 1}
                </Text>
              </View>
              <View style={styles.stopText}>
                <Text style={[type.body, { color: t.ink, ...font('text', 600) }]} numberOfLines={1}>
                  {city.name}
                </Text>
                <Text style={[type.caption, { color: late ? t.danger : t.ink2 }]}>
                  {datesText(days[i]!.first, days[i]!.last)}
                </Text>
              </View>
              <Stepper
                label={`One day less in ${city.name}`}
                icon="remove"
                disabled={n <= 1}
                onPress={() => dispatch({ type: 'setDays', cityId: city.id, days: n - 1 })}
              />
              <Text
                style={[type.headline, styles.count, { color: late ? t.danger : t.ink }]}
                accessibilityLabel={`${plural(n, 'day')} in ${city.name}`}
              >
                {n}
              </Text>
              <Stepper
                label={`One day more in ${city.name}`}
                icon="add"
                onPress={() => dispatch({ type: 'setDays', cityId: city.id, days: n + 1 })}
              />
            </View>
          );
        })}
      </View>
      {draft.dropped.map((code) => (
        <Body key={code} small muted>
          No stops in {countryByCode(code)?.name ?? code}, so it’s left out
        </Body>
      ))}
    </View>
  );
}

function Stepper({
  label,
  icon,
  disabled,
  onPress,
}: {
  label: string;
  icon: 'add' | 'remove';
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.stepper, { borderColor: t.line, opacity: disabled ? 0.4 : 1 }]}
    >
      <Icon name={icon} size={20} color={t.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  stop: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stopText: { flex: 1, gap: 1 },
  number: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { minWidth: 24, textAlign: 'center' },
  stepper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
