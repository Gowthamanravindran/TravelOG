import { BudgetView } from '@/components/budget-view';
import { Screen } from '@/ui/kit';
import { useTripId } from '@/lib/use-trip-id';

/** Trip mode's money tab (Plan 47): record spending; the budget is set in Plan mode. */
export default function LiveExpensesTab() {
  const id = useTripId();
  return (
    <Screen edges={[]}>
      <BudgetView tripId={id} />
    </Screen>
  );
}
