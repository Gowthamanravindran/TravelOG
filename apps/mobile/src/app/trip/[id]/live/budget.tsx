import { useLocalSearchParams } from 'expo-router';

import { BudgetView } from '@/components/budget-view';
import { Screen } from '@/ui/kit';

export default function LiveBudgetTab() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  return (
    <Screen edges={[]}>
      <BudgetView tripId={id} startEditing={edit === '1'} />
    </Screen>
  );
}
