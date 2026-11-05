import { BookingsView } from '@/components/bookings-view';
import { Screen } from '@/ui/kit';
import { useTripId } from '@/lib/use-trip-id';

export default function BookingsTab() {
  const id = useTripId();
  return (
    <Screen edges={[]}>
      <BookingsView tripId={id} />
    </Screen>
  );
}
