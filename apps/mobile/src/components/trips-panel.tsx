import { createTripWithStops, getLocalProfile } from '@travelog/db';
import { cityById, countryByCode, countryByIso, type City } from '@travelog/globe';
import { spacing, type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useReducer, useState } from 'react';
import { AccessibilityInfo, BackHandler, Keyboard, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CreateTripFooter,
  CreateTripHeader,
  draftIsos,
  globePropsFor,
  STEP_HEIGHT,
} from '@/components/create-trip/panel';
import { StepCities } from '@/components/create-trip/step-cities';
import { StepCountries } from '@/components/create-trip/step-countries';
import { StepDates } from '@/components/create-trip/step-dates';
import { StepDays } from '@/components/create-trip/step-days';
import { useStage, useStageScene, type GlobeScene } from '@/components/globe-stage';
import { TripsList } from '@/components/trips-list';
import { useMutate, useQuery } from '@/data/provider';
import { useCreateFlow } from '@/lib/create-flow';
import { errorMessage } from '@/lib/format';
import { draftToSave } from '@/lib/trip-draft-save';
import { draftReducer, emptyDraft } from '@/lib/trip-draft-state';
import { tripHref } from '@/lib/trip-route';
import { Drawer } from '@/ui/drawer';
import { useKeyboardHidden } from '@/ui/keyboard';
import { Between, Button, H2 } from '@/ui/kit';
import { haptic, Swap, useCelebrate } from '@/ui/motion';
import { ModeProvider, useTheme } from '@/ui/theme';
import { useRef } from 'react';

/** How much of the stage the drawer takes: at rest, part raised (the days step), and raised. */
const LOW = 0.45;
const MIDDLE = 0.62;
const HIGH = 0.88;

/**
 * Trips on the globe stage (Plans 66, 72): the trips in a drawer over the globe's lower part.
 * Creating a trip (Plan 67) happens here too: the globe stays, and the drawer's content steps
 * through countries → dates → cities → days.
 */
export function TripsPanel() {
  const router = useRouter();
  const flow = useCreateFlow();
  const mutate = useMutate();
  const celebrate = useCelebrate();
  const profile = useQuery((db) => getLocalProfile(db));
  const { globe, height, full } = useStage();

  // Looking at trips the drawer rests low or covers the globe; creating a trip it has the
  // three heights its steps need.
  const heights = flow.open
    ? [LOW, MIDDLE, HIGH].map((part) => Math.round(height * part))
    : [Math.round(height * LOW), full];

  const [homeIndex, setHomeIndex] = useState(0);
  const [draft, dispatch] = useReducer(draftReducer, emptyDraft);
  const [searching, setSearching] = useState(false);
  // Where the person dragged the panel to; forgotten when the step changes.
  const [dragged, setDragged] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Searching always raises the panel, so results show above the keyboard.
  const index = flow.open ? (searching ? 2 : (dragged ?? STEP_HEIGHT[draft.step])) : homeIndex;
  // Search ends when the keyboard closes, whether or not the field kept its focus (Android's
  // back gesture closes the keyboard without a blur).
  useKeyboardHidden(useCallback(() => setSearching(false), []));

  // Every opening of the flow starts from nothing; closing it discards the draft.
  useEffect(() => {
    dispatch({ type: 'reset' });
    setSearching(false);
    setError(null);
    if (!flow.open) globe.current?.clearFocus();
  }, [flow.open]);

  // The camera follows the step: the picked countries, then the whole route.
  const isos = draftIsos(draft).join(',');
  useEffect(() => {
    setDragged(null);
    // A step's search field goes away with the step, without telling anyone it lost focus.
    setSearching(false);
    if (!flow.open) return;
    if (draft.step === 'dates' || draft.step === 'cities')
      globe.current?.fitCountries(isos ? isos.split(',') : []);
    if (draft.step === 'days') globe.current?.fitStops();
    // Only a change of step moves the camera; picks made within a step do not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.open, draft.step]);

  // A country that is no longer picked loses its outline and name tag on the globe.
  const countryCount = useRef(0);
  useEffect(() => {
    if (flow.open && draft.countries.length < countryCount.current) globe.current?.clearFocus();
    countryCount.current = draft.countries.length;
  }, [flow.open, draft.countries.length]);

  // Each pick is felt and said aloud: the globe itself cannot be read by a screen reader.
  const before = useRef({ countries: draft.countries, cities: draft.cities });
  useEffect(() => {
    const was = before.current;
    before.current = { countries: draft.countries, cities: draft.cities };
    if (!flow.open) return;
    const say = (text: string) => AccessibilityInfo.announceForAccessibility(text);
    const nameOf = (code: string) => countryByCode(code)?.name ?? code;
    for (const code of draft.countries)
      if (!was.countries.includes(code)) {
        haptic('light');
        say(`${nameOf(code)} added`);
      }
    for (const code of was.countries)
      if (!draft.countries.includes(code) && !draft.dropped.includes(code))
        say(`${nameOf(code)} removed`);
    draft.cities.forEach((city, i) => {
      if (!was.cities.some((c) => c.id === city.id)) {
        haptic('light');
        say(`${city.name} added, stop ${i + 1}`);
      }
    });
    for (const city of was.cities)
      if (!draft.cities.some((c) => c.id === city.id)) say(`${city.name} removed`);
  }, [flow.open, draft.countries, draft.cities, draft.dropped]);

  const back = useCallback(() => {
    if (draft.step === 'countries') flow.close();
    else dispatch({ type: 'back' });
  }, [draft.step, flow]);
  // Android's back button steps back through the flow instead of leaving the app.
  useEffect(() => {
    if (!flow.open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [flow.open, back]);

  const create = () => {
    try {
      const trip = mutate((db) => {
        const save = draftToSave(db, draft, profile ?? {});
        return createTripWithStops(
          db,
          save.input,
          { displayName: profile?.displayName ?? 'Me', upiId: profile?.upiId },
          save.stops,
          save.places,
        );
      });
      // One last look at the whole route, then the celebration.
      globe.current?.fitStops();
      celebrate('Trip created');
      flow.close();
      router.push(tripHref(trip));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const picked = (city: City) => {
    Keyboard.dismiss();
    globe.current?.flyTo(city.lng, city.lat, 4.2);
  };
  const toggleCityById = (id: string) => {
    const city = draft.cities.find((c) => c.id === id) ?? cityById(id);
    if (city) dispatch({ type: 'toggleCity', city });
  };
  const index_ = Math.min(index, heights.length - 1);
  const scene: GlobeScene = flow.open
    ? {
        ...globePropsFor(draft),
        // Tapping a country on the first step outlines and zooms to it as it is picked.
        tapMode: draft.step === 'countries' ? 'focus' : 'report',
        spin: false,
        covered: heights[index_]!,
        onCountryPress: (c) => {
          const code = countryByIso(c.iso)?.countryCode;
          if (!code) return;
          dispatch({ type: 'toggleCountry', code });
        },
        onCandidatePress: (p) => toggleCityById(p.id),
        // A numbered stop comes off when tapped while cities are being picked.
        onPlacePress: (p) => draft.step === 'cities' && toggleCityById(p.id),
      }
    : {
        tapMode: 'report',
        spin: homeIndex === 0,
        covered: heights[0]!,
        // On the home globe a tapped country opens its Explore page (Plans 70, 73).
        onCountryPress: (c) =>
          router.navigate({ pathname: '/explore', params: { country: c.iso } }),
      };
  useStageScene('trips', scene);

  const stepBody =
    draft.step === 'countries' ? (
      <StepCountries
        draft={draft}
        dispatch={dispatch}
        onSearching={setSearching}
        onPickCity={picked}
        onPickCountry={(c) => {
          Keyboard.dismiss();
          globe.current?.focusCountry(c.iso);
        }}
      />
    ) : draft.step === 'dates' ? (
      <StepDates draft={draft} dispatch={dispatch} />
    ) : draft.step === 'cities' ? (
      <StepCities
        draft={draft}
        dispatch={dispatch}
        onSearching={setSearching}
        onPickCity={picked}
        onShowCountry={(code) => {
          const iso = countryByCode(code)?.iso;
          if (iso) globe.current?.focusCountry(iso);
        }}
      />
    ) : (
      <StepDays draft={draft} dispatch={dispatch} />
    );

  const footer =
    flow.open && !searching ? (
      <CreateTripFooter draft={draft} dispatch={dispatch} onCreate={create} error={error} />
    ) : undefined;

  return (
    <>
      {flow.open ? null : (
        <ModeProvider mode="home" scheme="dark">
          <Greeting />
        </ModeProvider>
      )}
      <Drawer
        heights={heights}
        index={index_}
        onIndexChange={flow.open ? setDragged : setHomeIndex}
        label={flow.open ? 'panel' : 'trip list'}
        padBottom={flow.open}
        scroll="always"
        footer={footer}
        header={
          flow.open ? (
            <CreateTripHeader draft={draft} onBack={back} />
          ) : (
            <Between>
              <H2>Your trips</H2>
              <Button label="Create a trip" onPress={flow.start} />
            </Between>
          )
        }
      >
        {!flow.open ? <TripsList onCreate={flow.start} /> : <Swap id={draft.step}>{stepBody}</Swap>}
      </Drawer>
    </>
  );
}

/** Sits on the globe's dark ground, so it takes the theme's dark colours. */
function Greeting() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useQuery((db) => getLocalProfile(db));
  return (
    <View pointerEvents="none" style={[styles.greeting, { top: insets.top + spacing.sm }]}>
      <Text style={[type.label, { color: t.ink2 }]} numberOfLines={1}>
        Hi {profile?.displayName ?? 'there'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { position: 'absolute', left: spacing.lg, right: spacing.lg },
});
