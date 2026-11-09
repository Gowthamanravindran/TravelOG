import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { ItineraryView } from '@/components/itinerary-view';
import { TripSetupCard } from '@/components/trip-setup';
import { Screen } from '@/ui/kit';
import { useTripId } from '@/lib/use-trip-id';

export default function ItineraryTab() {
  const id = useTripId();
  // Counts each time this tab comes into view, so the day strip re-centres (Plan 44).
  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(useCallback(() => setFocusKey((k) => k + 1), []));
  return (
    <Screen edges={[]}>
      <TripSetupCard tripId={id} />
      <ItineraryView tripId={id} focusKey={focusKey} />
    </Screen>
  );
}
