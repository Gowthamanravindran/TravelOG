import { Tabs } from 'expo-router/tabs';

import { TripHeader } from '@/components/trip-header';
import { ModeTabBar } from '@/ui/tab-bar';
import { ModeProvider } from '@/ui/theme';

const TABS = [
  { name: 'index', label: 'Itinerary', icon: '🗓️' },
  { name: 'budget', label: 'Budget', icon: '💰' },
  { name: 'bookings', label: 'Bookings', icon: '🎫' },
  { name: 'polls', label: 'Polls', icon: '🗳️' },
  { name: 'memories', label: 'Memories', icon: '📸' },
];

/** Plan mode (indigo): Itinerary · Budget · Bookings · Polls · Memories. */
export default function PlanLayout() {
  return (
    <ModeProvider mode="plan">
      <Tabs
        screenOptions={{
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
