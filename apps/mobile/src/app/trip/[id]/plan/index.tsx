import { useLocalSearchParams } from 'expo-router';

import { ItineraryView } from '@/components/itinerary-view';
import { TripSetupCard } from '@/components/trip-setup';
import { Screen } from '@/ui/kit';

export default function ItineraryTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen edges={[]}>
      <TripSetupCard tripId={id} />
      <ItineraryView tripId={id} />
    </Screen>
  );
}
