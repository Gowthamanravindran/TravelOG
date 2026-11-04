import { getLocalProfile } from '@travelog/db';
import { Redirect, useRouter } from 'expo-router';
import { Tabs } from 'expo-router/tabs';

import { useQuery } from '@/data/provider';
import { ModeTabBar } from '@/ui/tab-bar';
import { ModeProvider } from '@/ui/theme';

const TABS = [
  { name: 'index', label: 'Trips', icon: '🧳' },
  { name: 'feed', label: 'Feed', icon: '📰' },
  { name: 'explore', label: 'Explore', icon: '🧭' },
  { name: 'profile', label: 'Profile', icon: '🙂' },
];

export default function HomeLayout() {
  const router = useRouter();
  const profile = useQuery((db) => getLocalProfile(db));
  if (!profile) return <Redirect href="/welcome" />;

  return (
    <ModeProvider mode="home">
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => (
          <ModeProvider mode="home">
            <ModeTabBar
              {...props}
              tabs={TABS}
              center={{ label: 'New trip', onPress: () => router.push('/new-trip') }}
            />
          </ModeProvider>
        )}
      >
        {TABS.map((t) => (
          <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
        ))}
      </Tabs>
    </ModeProvider>
  );
}
