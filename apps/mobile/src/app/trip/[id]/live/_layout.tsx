import { Tabs } from 'expo-router/tabs';

import { TripHeader } from '@/components/trip-header';
import { ModeTabBar, type TabSpec } from '@/ui/tab-bar';
import { ModeProvider } from '@/ui/theme';

const TABS: TabSpec[] = [
  { name: 'index', label: 'Today', icon: 'today' },
  { name: 'plan', label: 'Plan', icon: 'plan' },
  { name: 'nearby', label: 'Nearby', icon: 'nearby' },
  { name: 'budget', label: 'Budget', icon: 'budget' },
  { name: 'memories', label: 'Memories', icon: 'memories' },
];

/** Trip mode (always dark, teal): Today · Plan · Nearby · Budget · Memories. */
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
