import { useLocalSearchParams } from 'expo-router';

import { ItineraryView } from '@/components/itinerary-view';
import { Screen } from '@/ui/kit';

/** Read-only plan in Trip mode; edit via "Edit the plan" in the header. */
export default function LivePlanTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen edges={[]}>
      <ItineraryView tripId={id} />
    </Screen>
  );
}
