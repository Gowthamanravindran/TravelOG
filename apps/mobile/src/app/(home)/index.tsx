import { getLocalProfile } from '@travelog/db';
import { spacing, type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Globe, GLOBE_SPACE } from '@/components/globe';
import { TripsList } from '@/components/trips-list';
import { useQuery, useShown } from '@/data/provider';
import { useCreateFlow } from '@/lib/create-flow';
import { hasGlobe } from '@/lib/runtime';
import { Drawer } from '@/ui/drawer';
import { Between, Button, H1, H2, Screen } from '@/ui/kit';
import { ModeProvider, useTheme } from '@/ui/theme';

/** How much of the screen the drawer takes at rest and raised. */
const LOW = 0.45;
const HIGH = 0.88;
/** The globe runs this far under the drawer's rounded corners. */
const UNDERLAP = 28;

export default function TripsScreen() {
  const router = useRouter();
  const flow = useCreateFlow();
  if (!hasGlobe()) return <TripsListScreen onCreate={() => router.push('/new-trip')} />;
  return <GlobeHome onCreate={flow.start} />;
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

/** The globe on top, the trips in a drawer over its lower part (Plan 66). */
function GlobeHome({ onCreate }: { onCreate: () => void }) {
  const shown = useShown();
  // The window's height is a first guess, so the first frame is already laid out; the real
  // height (less the tab bar) follows from layout.
  const window = useWindowDimensions();
  const [height, setHeight] = useState(window.height);
  const [index, setIndex] = useState(0);
  const progress = useSharedValue(0);
  const heights = [Math.round(height * LOW), Math.round(height * HIGH)];
  const globeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.08 * progress.get() }],
  }));
  const onLayout = (e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height);

  return (
    <View style={[styles.fill, { backgroundColor: GLOBE_SPACE }]} onLayout={onLayout}>
      {shown ? <StatusBar style="light" /> : null}
      {height ? (
        <>
          <Animated.View
            style={[styles.globe, { height: height - heights[0]! + UNDERLAP }, globeStyle]}
          >
            <Globe active={shown && index === 0} countryTapEnabled={false} />
          </Animated.View>
          <ModeProvider mode="home" scheme="dark">
            <Greeting />
          </ModeProvider>
          <Drawer
            heights={heights}
            index={index}
            onIndexChange={setIndex}
            label="trip list"
            progress={progress}
            padBottom={false}
            header={
              <Between>
                <H2>Your trips</H2>
                <Button label="Create a trip" onPress={onCreate} />
              </Between>
            }
          >
            <TripsList onCreate={onCreate} />
          </Drawer>
        </>
      ) : null}
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
