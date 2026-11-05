import { MemoriesView } from '@/components/memories-view';
import { Screen } from '@/ui/kit';
import { useTripId } from '@/lib/use-trip-id';

export default function LiveMemoriesTab() {
  const id = useTripId();
  return (
    <Screen edges={[]}>
      <MemoriesView tripId={id} />
    </Screen>
  );
}
