import { useLocalSearchParams } from 'expo-router';

import { ItineraryView } from '@/components/itinerary-view';
import { Screen } from '@/ui/kit';

export default function ItineraryTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen edges={[]}>
      <ItineraryView tripId={id} />
    </Screen>
  );
}
