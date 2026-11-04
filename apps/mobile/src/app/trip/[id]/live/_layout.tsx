import { Tabs } from 'expo-router/tabs';

import { TripHeader } from '@/components/trip-header';
import { ModeTabBar } from '@/ui/tab-bar';
import { ModeProvider } from '@/ui/theme';

const TABS = [
  { name: 'index', label: 'Today', icon: '☀️' },
  { name: 'plan', label: 'Plan', icon: '🗺️' },
  { name: 'nearby', label: 'Nearby', icon: '📍' },
  { name: 'budget', label: 'Budget', icon: '💰' },
];

/** Trip mode (always dark, teal): Today · Plan · Nearby · Budget. */
export default function LiveLayout() {
  return (
    <ModeProvider mode="trip">
      <Tabs
        screenOptions={{
          header: () => (
            <ModeProvider mode="trip">
              <TripHeader />
            </ModeProvider>
          ),
        }}
        tabBar={(props) => (
          <ModeProvider mode="trip">
            <ModeTabBar {...props} tabs={TABS} />
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
