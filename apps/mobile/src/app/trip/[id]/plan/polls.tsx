import { useLocalSearchParams } from 'expo-router';

import { PollsView } from '@/components/polls-view';
import { Screen } from '@/ui/kit';

export default function PollsTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen edges={[]}>
      <PollsView tripId={id} />
    </Screen>
  );
}
