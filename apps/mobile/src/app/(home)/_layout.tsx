import { getLocalProfile } from '@travelog/db';
import { Redirect, usePathname, useRouter } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { GlobeStage, isTabPath, stageTabFor } from '@/components/globe-stage';
import { useQuery } from '@/data/provider';
import { useCreateFlow } from '@/lib/create-flow';
import { hasGlobe } from '@/lib/runtime';
import { ModeTabBar, type TabSpec } from '@/ui/tab-bar';
import { ModeProvider } from '@/ui/theme';

const TABS: TabSpec[] = [
  { name: 'index', label: 'Trips', icon: 'trips' },
  { name: 'feed', label: 'Feed', icon: 'feed' },
  { name: 'explore', label: 'Explore', icon: 'explore' },
  { name: 'profile', label: 'Profile', icon: 'profile' },
];

/**
 * Hands the navigator's tab state up to the layout and draws nothing. The layout draws the bar
 * itself, after the globe stage, so the bar's raised New trip button sits on top of the globe
 * (Plan 76). Of two overlapping views the later one is drawn on top, and inside the navigator
 * the bar came before the stage.
 */
function ReportTabs({
  bar,
  onChange,
}: {
  bar: BottomTabBarProps;
  onChange: (bar: BottomTabBarProps) => void;
}) {
  // Only a change of tab or of the tabs themselves is handed up: handing up every render
  // would draw the layout again, which draws the navigator again, round and round.
  const key = `${bar.state.index}:${bar.state.routes.map((r) => r.key).join(',')}`;
  useEffect(() => {
    onChange(bar);
    // `key` stands for `bar`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, onChange]);
  return null;
}

export default function HomeLayout() {
  const router = useRouter();
  const profile = useQuery((db) => getLocalProfile(db));
  const flow = useCreateFlow();
  const pathname = usePathname();
  // A screen pushed over the tabs (a trip, Licences) hides the stage but keeps the tab's page
  // on it, so coming back finds it as it was (Plan 75).
  const onTabs = isTabPath(pathname);
  const stageTab = useRef(stageTabFor(pathname));
  if (onTabs) stageTab.current = stageTabFor(pathname);
  const [barHeight, setBarHeight] = useState(0);
  const [bar, setBar] = useState<BottomTabBarProps | null>(null);
  if (!profile) return <Redirect href="/welcome" />;
  // On the globe, a trip is created on the Trips tab itself; without it, in the old form (Plan 66).
  const newTrip = () => {
    if (!hasGlobe()) return router.push('/new-trip');
    router.navigate('/');
    flow.start();
  };

  return (
    <ModeProvider mode="home">
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{ headerShown: false }}
          tabBar={(props) => <ReportTabs bar={props} onChange={setBar} />}
        >
          {TABS.map((t) => (
            <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
          ))}
          {/* Saved places is out of the plan (Plan 68): its screen stays in the code but has no tab. */}
          <Tabs.Screen name="saved" options={{ href: null }} />
        </Tabs>
        {/* One globe for Trips, Explore and Profile, drawn over the tab scenes (Plan 72). */}
        {hasGlobe() ? (
          <GlobeStage tab={stageTab.current} hidden={!onTabs} bottom={flow.open ? 0 : barHeight} />
        ) : null}
        {/* The bar, drawn last so it is on top. The create flow uses the whole screen; the bar
            comes back when it closes. */}
        {bar && !flow.open ? (
          <View onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}>
            <ModeProvider mode="home">
              <ModeTabBar {...bar} tabs={TABS} center={{ label: 'New trip', onPress: newTrip }} />
            </ModeProvider>
          </View>
        ) : null}
      </View>
    </ModeProvider>
  );
}
