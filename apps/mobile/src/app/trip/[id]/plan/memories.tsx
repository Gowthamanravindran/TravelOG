import { useLocalSearchParams } from 'expo-router';

import { MemoriesView } from '@/components/memories-view';
import { Screen } from '@/ui/kit';

export default function PlanMemoriesTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen edges={[]}>
      <MemoriesView tripId={id} />
    </Screen>
  );
}
