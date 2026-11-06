import { Tabs } from 'expo-router/tabs';

import { TripHeader } from '@/components/trip-header';
import { ModeTabBar, type TabSpec } from '@/ui/tab-bar';
import { ModeProvider } from '@/ui/theme';

const TABS: TabSpec[] = [
  { name: 'index', label: 'Itinerary', icon: 'itinerary' },
  { name: 'budget', label: 'Budget', icon: 'budget' },
  { name: 'bookings', label: 'Bookings', icon: 'bookings' },
  { name: 'polls', label: 'Polls', icon: 'polls' },
  { name: 'memories', label: 'Memories', icon: 'memories' },
];

/** Plan mode (indigo): Itinerary · Budget · Bookings · Polls · Memories. */
export default function PlanLayout() {
  return (
    <ModeProvider mode="plan">
      <Tabs
        screenOptions={{
          // Switching tabs cross-fades; the first tab shows at once (Plan 36).
          animation: 'fade',
          header: () => (
            <ModeProvider mode="plan">
              <TripHeader />
            </ModeProvider>
          ),
        }}
        tabBar={(props) => (
          <ModeProvider mode="plan">
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
