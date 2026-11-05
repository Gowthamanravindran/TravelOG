import { PollsView } from '@/components/polls-view';
import { Screen } from '@/ui/kit';
import { useTripId } from '@/lib/use-trip-id';

export default function PollsTab() {
  const id = useTripId();
  return (
    <Screen edges={[]}>
      <PollsView tripId={id} />
    </Screen>
  );
}
