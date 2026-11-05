import { MemoriesView } from '@/components/memories-view';
import { useTripId } from '@/lib/use-trip-id';

export default function LiveMemoriesTab() {
  const id = useTripId();
  return (
    // Memories scrolls itself, so its selection bar can float over the photos.
    <MemoriesView tripId={id} />
  );
}
