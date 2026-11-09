import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { ItineraryView } from '@/components/itinerary-view';
import { Screen } from '@/ui/kit';
import { useTripId } from '@/lib/use-trip-id';

/** Read-only plan in Trip mode; edit via "Edit the plan" in the header. */
export default function LivePlanTab() {
  const id = useTripId();
  // Counts each time this tab comes into view, so the day strip re-centres (Plan 44).
  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(useCallback(() => setFocusKey((k) => k + 1), []));
  return (
    <Screen edges={[]}>
      <ItineraryView tripId={id} focusKey={focusKey} />
    </Screen>
  );
}
