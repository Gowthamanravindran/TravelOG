import { getTrip } from '@travelog/db';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DocumentsView } from '@/components/documents-view';
import { useQuery } from '@/data/provider';
import { Between, Button, H1, Screen } from '@/ui/kit';
import { ModeProvider } from '@/ui/theme';

/**
 * Documents as a page (Plan 40), for Trip mode, which has no Bookings tab: the
 * tickets you need at a gate or station, opening without signal.
 */
export default function DocumentsPage() {
  // Opened from Trip mode's header, it keeps Trip mode's dark look.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return (
    <ModeProvider mode={mode === 'trip' ? 'trip' : 'plan'}>
      <Documents />
    </ModeProvider>
  );
}

function Documents() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  if (!trip) return null;
  return (
    <Screen edges={['top', 'bottom']}>
      <Between>
        <H1 eyebrow={trip.title}>Documents</H1>
        <Button label="Done" variant="link" onPress={() => router.back()} />
      </Between>
      <DocumentsView tripId={id} timeZone={trip.timeZone} />
    </Screen>
  );
}
