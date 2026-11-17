import { getLocalProfile } from '@travelog/db';
import { Redirect, useRouter } from 'expo-router';
import { Tabs } from 'expo-router/tabs';

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

export default function HomeLayout() {
  const router = useRouter();
  const profile = useQuery((db) => getLocalProfile(db));
  const flow = useCreateFlow();
  if (!profile) return <Redirect href="/welcome" />;
  // On the globe, a trip is created on the Trips tab itself; without it, in the old form (Plan 66).
  const newTrip = () => {
    if (!hasGlobe()) return router.push('/new-trip');
    router.navigate('/');
    flow.start();
  };

  return (
    <ModeProvider mode="home">
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) =>
          // The create flow uses the whole screen; the bar comes back when it closes.
          flow.open ? null : (
            <ModeProvider mode="home">
              <ModeTabBar {...props} tabs={TABS} center={{ label: 'New trip', onPress: newTrip }} />
            </ModeProvider>
          )
        }
      >
        {TABS.map((t) => (
          <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
        ))}
        {/* Saved places is out of the plan (Plan 68): its screen stays in the code but has no tab. */}
        <Tabs.Screen name="saved" options={{ href: null }} />
      </Tabs>
    </ModeProvider>
  );
}
