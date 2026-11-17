import { createTripWithStops, getLocalProfile } from '@travelog/db';
import { cityById, countryByCode, countryByIso, type City } from '@travelog/globe';
import { spacing, type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
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
import { Globe, GLOBE_SPACE, type GlobeHandle, type GlobeProps } from '@/components/globe';
import { TripsList } from '@/components/trips-list';
import { useMutate, useQuery, useShown } from '@/data/provider';
import { useCreateFlow } from '@/lib/create-flow';
import { errorMessage } from '@/lib/format';
import { hasGlobe } from '@/lib/runtime';
import { draftToSave } from '@/lib/trip-draft-save';
import { draftReducer, emptyDraft } from '@/lib/trip-draft-state';
import { tripHref } from '@/lib/trip-route';
import { Drawer } from '@/ui/drawer';
import { Between, Button, H1, H2, Screen } from '@/ui/kit';
import { useCelebrate } from '@/ui/motion';
import { ModeProvider, useTheme } from '@/ui/theme';

/** How much of the screen the drawer takes: at rest, part raised (the days step), and raised. */
const LOW = 0.45;
const MIDDLE = 0.62;
const HIGH = 0.88;
/** The globe runs this far under the drawer's rounded corners. */
const UNDERLAP = 28;

export default function TripsScreen() {
  const router = useRouter();
  if (!hasGlobe()) return <TripsListScreen onCreate={() => router.push('/new-trip')} />;
  return <GlobeHome />;
}

/** The Trips tab as it was before the globe: used where the web view is not in the app. */
function TripsListScreen({ onCreate }: { onCreate: () => void }) {
  const t = useTheme();
  const profile = useQuery((db) => getLocalProfile(db));
  return (
    <Screen>
      <View
        style={
          t.band
            ? {
                backgroundColor: t.band,
                marginHorizontal: -spacing.lg,
                marginTop: -spacing.lg,
                padding: spacing.lg,
                borderBottomLeftRadius: 26,
                borderBottomRightRadius: 26,
              }
            : undefined
        }
      >
        <H1 eyebrow={`Hi ${profile?.displayName ?? 'there'}`}>Your trips</H1>
      </View>
      <TripsList onCreate={onCreate} />
    </Screen>
  );
}

/**
 * The globe on top, the trips in a drawer over its lower part (Plan 66). Creating a trip
 * (Plan 67) happens here too: the globe stays, and the drawer's content steps through
 * countries → dates → cities → days.
 */
function GlobeHome() {
  const router = useRouter();
  const flow = useCreateFlow();
  const shown = useShown();
  const mutate = useMutate();
  const celebrate = useCelebrate();
  const profile = useQuery((db) => getLocalProfile(db));
  const globe = useRef<GlobeHandle>(null);

  // The window's height is a first guess, so the first frame is already laid out; the real
  // height (less the tab bar) follows from layout.
  const window = useWindowDimensions();
  const [height, setHeight] = useState(window.height);
  const heights = [LOW, MIDDLE, HIGH].map((part) => Math.round(height * part));
  const progress = useSharedValue(0);
  const globeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.08 * progress.get() }],
  }));

  const [homeIndex, setHomeIndex] = useState(0);
  const [draft, dispatch] = useReducer(draftReducer, emptyDraft);
  const [searching, setSearching] = useState(false);
  // Where the person dragged the panel to; forgotten when the step changes.
  const [dragged, setDragged] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const index = flow.open ? (dragged ?? (searching ? 2 : STEP_HEIGHT[draft.step])) : homeIndex;

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
  const globeProps: Partial<GlobeProps> = flow.open
    ? {
        ...globePropsFor(draft),
        onCountryPress: (c) => {
          const code = countryByIso(c.iso)?.countryCode;
          if (!code) return;
          dispatch({ type: 'toggleCountry', code });
        },
        onCandidatePress: (p) => toggleCityById(p.id),
        // A numbered stop comes off when tapped while cities are being picked.
        onPlacePress: (p) => draft.step === 'cities' && toggleCityById(p.id),
      }
    : { countryTapEnabled: false };

  const footer =
    flow.open && !searching ? (
      <CreateTripFooter draft={draft} dispatch={dispatch} onCreate={create} error={error} />
    ) : undefined;

  return (
    <View
      style={[styles.fill, { backgroundColor: GLOBE_SPACE }]}
      onLayout={(e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height)}
    >
      {shown ? <StatusBar style="light" /> : null}
      <Animated.View
        style={[styles.globe, { height: height - heights[0]! + UNDERLAP }, globeStyle]}
      >
        <Globe
          ref={globe}
          active={shown && !flow.open && homeIndex === 0}
          bottomInset={heights[index]! - heights[0]! + UNDERLAP}
          {...globeProps}
        />
      </Animated.View>
      {flow.open ? null : (
        <ModeProvider mode="home" scheme="dark">
          <Greeting />
        </ModeProvider>
      )}
      <Drawer
        heights={heights}
        index={index}
        onIndexChange={flow.open ? setDragged : setHomeIndex}
        label={flow.open ? 'panel' : 'trip list'}
        progress={progress}
        padBottom={flow.open}
        scroll={flow.open ? 'always' : 'raised'}
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
        {!flow.open ? (
          <TripsList onCreate={flow.start} />
        ) : draft.step === 'countries' ? (
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
        )}
      </Drawer>
    </View>
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
  fill: { flex: 1 },
  globe: { position: 'absolute', top: 0, left: 0, right: 0 },
  greeting: { position: 'absolute', left: spacing.lg, right: spacing.lg },
});
