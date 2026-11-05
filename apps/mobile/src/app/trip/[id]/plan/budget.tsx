import { useLocalSearchParams } from 'expo-router';

import { BudgetView } from '@/components/budget-view';
import { Screen } from '@/ui/kit';
import { useTripId } from '@/lib/use-trip-id';

export default function BudgetTab() {
  const id = useTripId();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  return (
    <Screen edges={[]}>
      <BudgetView tripId={id} startEditing={edit === '1'} />
    </Screen>
  );
}
