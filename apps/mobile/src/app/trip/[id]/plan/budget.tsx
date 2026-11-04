import { useLocalSearchParams } from 'expo-router';

import { BudgetView } from '@/components/budget-view';
import { Screen } from '@/ui/kit';

export default function BudgetTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen edges={[]}>
      <BudgetView tripId={id} />
    </Screen>
  );
}
