import { ItineraryView } from '@/components/itinerary-view';
import { TripSetupCard } from '@/components/trip-setup';
import { Screen } from '@/ui/kit';
import { useTripId } from '@/lib/use-trip-id';

export default function ItineraryTab() {
  const id = useTripId();
  return (
    <Screen edges={[]}>
      <TripSetupCard tripId={id} />
      <ItineraryView tripId={id} />
    </Screen>
  );
}
