import { listMembers } from '@travelog/db';
import { Tabs } from 'expo-router/tabs';

import { TripHeader } from '@/components/trip-header';
import { useQuery } from '@/data/provider';
import { useTripId } from '@/lib/use-trip-id';
import { ModeTabBar, type TabSpec } from '@/ui/tab-bar';
import { ModeProvider } from '@/ui/theme';

const TABS: TabSpec[] = [
  { name: 'index', label: 'Itinerary', icon: 'itinerary' },
  { name: 'budget', label: 'Budget', icon: 'budget' },
  { name: 'bookings', label: 'Bookings', icon: 'bookings' },
  { name: 'polls', label: 'Polls', icon: 'polls' },
  { name: 'memories', label: 'Memories', icon: 'memories' },
];

/**
 * Plan mode: Itinerary · Budget · Bookings · Polls · Memories. Polls only show
 * once someone else is on the trip; there's no one to vote with alone.
 */
export default function PlanLayout() {
  const id = useTripId();
  const group = useQuery((db) => listMembers(db, id).length > 1, [id]);
  const tabs = group ? TABS : TABS.filter((t) => t.name !== 'polls');
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
            <ModeTabBar {...props} tabs={tabs} />
          </ModeProvider>
        )}
      >
        {TABS.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{ title: t.label, href: t.name === 'polls' && !group ? null : undefined }}
          />
        ))}
      </Tabs>
    </ModeProvider>
  );
}
