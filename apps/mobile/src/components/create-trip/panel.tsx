import { countryByCode, topCities, type City } from '@travelog/globe';
import { spacing, type } from '@travelog/ui';
import type { Dispatch } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GlobeProps } from '@/components/globe';
import { canGoNext, type DraftAction, type DraftState, type Step } from '@/lib/trip-draft-state';
import { Icon } from '@/ui/icon';
import { Button, ErrorText } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

import { tripSummary } from './step-dates';

/**
 * Which of the drawer's three heights each step rests at: low, middle or high. The dates step
 * rests as low as the countries step, with the globe still in view; the calendar scrolls inside
 * the drawer, and it can be dragged up (the owner's call, Plan 78).
 */
export const STEP_HEIGHT: Record<Step, 0 | 1 | 2> = { countries: 0, dates: 0, cities: 0, days: 1 };

const TITLES: Record<Step, string> = {
  countries: 'Where to?',
  dates: 'When?',
  cities: 'Pick your stops',
  days: 'Split your days',
};

const pin = (c: City) => ({
  id: c.id,
  name: c.name,
  lat: c.lat,
  lng: c.lng,
  countryCode: c.countryCode,
});

/** The picked countries as the globe keys them (ISO alpha-3). */
export function draftIsos(draft: DraftState): string[] {
  return draft.countries.flatMap((code) => countryByCode(code)?.iso ?? []);
}

/**
 * What the globe shows for a draft: picked countries lit on every step; on the cities step,
 * each picked country's best-known cities to tap; picked cities as numbered stops from then
 * on. Countries can only be tapped on the first step.
 */
export function globePropsFor(
  draft: DraftState,
): Pick<GlobeProps, 'visitedCountries' | 'candidates' | 'stops' | 'countryTapEnabled'> {
  const picking = draft.step === 'cities';
  return {
    visitedCountries: draftIsos(draft),
    candidates: picking ? draft.countries.flatMap((code) => topCities(code).map(pin)) : [],
    stops: picking || draft.step === 'days' ? draft.cities.map(pin) : [],
    countryTapEnabled: draft.step === 'countries',
  };
}

/** The step's title with a back arrow; under it, what has been settled so far. */
export function CreateTripHeader({ draft, onBack }: { draft: DraftState; onBack: () => void }) {
  const t = useTheme();
  const names = draft.countries.map((code) => countryByCode(code)?.name ?? code).join(' · ');
  const subtitle =
    draft.step === 'countries'
      ? 'Tap the globe or search'
      : draft.step === 'dates'
        ? names
        : tripSummary(draft.startDate, draft.endDate);
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        hitSlop={8}
        style={[styles.back, { backgroundColor: t.surface2 }]}
      >
        <Icon name="back" size={22} color={t.ink} />
      </Pressable>
      <View style={styles.titles}>
        <Text accessibilityRole="header" style={[type.title, { color: t.ink }]}>
          {TITLES[draft.step]}
        </Text>
        <Text style={[type.caption, { color: t.ink2 }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

/** The step's main button. It appears once the step is done; "Create trip" waits disabled. */
export function CreateTripFooter({
  draft,
  dispatch,
  onCreate,
  error,
}: {
  draft: DraftState;
  dispatch: Dispatch<DraftAction>;
  onCreate: () => void;
  error: string | null;
}) {
  const ready = canGoNext(draft);
  if (draft.step !== 'days' && !ready) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      <ErrorText>{error}</ErrorText>
      {draft.step === 'days' ? (
        <Button label="Create trip" onPress={onCreate} disabled={!ready} />
      ) : (
        <Button
          label={draft.step === 'countries' ? 'Let’s go →' : 'Next →'}
          onPress={() => dispatch({ type: 'next' })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1, gap: 2 },
});
