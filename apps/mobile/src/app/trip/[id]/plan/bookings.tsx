import { useLocalSearchParams } from 'expo-router';

import { BookingsView } from '@/components/bookings-view';
import { Screen } from '@/ui/kit';

export default function BookingsTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen edges={[]}>
      <BookingsView tripId={id} />
    </Screen>
  );
}
