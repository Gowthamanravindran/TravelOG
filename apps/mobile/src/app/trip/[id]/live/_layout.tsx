import { Tabs } from 'expo-router/tabs';

import { TripHeader } from '@/components/trip-header';
import { ModeTabBar, type TabSpec } from '@/ui/tab-bar';
import { ModeProvider } from '@/ui/theme';

const TABS: TabSpec[] = [
  { name: 'index', label: 'Today', icon: 'today' },
  { name: 'plan', label: 'Plan', icon: 'plan' },
  { name: 'nearby', label: 'Nearby', icon: 'nearby' },
  { name: 'expenses', label: 'Expenses', icon: 'expense' },
  { name: 'memories', label: 'Memories', icon: 'memories' },
];

/** Trip mode (always dark, teal): Today · Plan · Nearby · Expenses · Memories. */
export default function LiveLayout() {
  return (
    <ModeProvider mode="trip">
      <Tabs
        screenOptions={{
          // Switching tabs cross-fades; the first tab shows at once (Plan 36).
          animation: 'fade',
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
