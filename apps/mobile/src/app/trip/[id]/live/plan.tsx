import { ItineraryView } from '@/components/itinerary-view';
import { Screen } from '@/ui/kit';
import { useTripId } from '@/lib/use-trip-id';

/** Read-only plan in Trip mode; edit via "Edit the plan" in the header. */
export default function LivePlanTab() {
  const id = useTripId();
  return (
    <Screen edges={[]}>
      <ItineraryView tripId={id} />
    </Screen>
  );
}
