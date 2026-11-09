import { getTrip } from '@travelog/db';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BookingsView } from '@/components/bookings-view';
import { DocumentsView } from '@/components/documents-view';
import { useQuery } from '@/data/provider';
import { useTripId } from '@/lib/use-trip-id';
import { Screen, Segmented } from '@/ui/kit';

type View_ = 'all' | 'documents';

/** Bookings (Plan 40): All bookings · Documents. The header's Documents button opens the second. */
export default function BookingsTab() {
  const id = useTripId();
  const { view: param } = useLocalSearchParams<{ view?: string }>();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  const asked: View_ = param === 'documents' ? 'documents' : 'all';
  const [view, setView] = useState<View_>(asked);
  // Follow the header button when this tab is already open.
  const [lastAsked, setLastAsked] = useState(asked);
  if (asked !== lastAsked) {
    setLastAsked(asked);
    setView(asked);
  }
  return (
    <Screen edges={[]}>
      <View style={{ gap: 16 }}>
        <Segmented
          options={[
            { value: 'all', label: 'All bookings' },
            { value: 'documents', label: 'Documents' },
          ]}
          value={view}
          onChange={setView}
        />
        {view === 'all' ? (
          <BookingsView tripId={id} />
        ) : (
          <DocumentsView tripId={id} timeZone={trip?.timeZone ?? 'Asia/Kolkata'} />
        )}
      </View>
    </Screen>
  );
}
