import { addExpense, addMember, createTrip, myMember, setBudget } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { BudgetView } from '@/components/budget-view';
import { makeDb, withData } from '@/testing/test-utils';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
}));

/** Plan 47: Trip mode's Expenses, solo trips, and the spending chart. */
function trip(group: boolean) {
  const db = makeDb();
  const t = createTrip(db, { title: 'Goa', timeZone: 'Asia/Kolkata' }, { displayName: 'Gowtham' });
  const me = myMember(db, t.id)!;
  const riya = group ? addMember(db, t.id, 'Riya', null) : null;
  const everyone = [{ memberId: me.id }, ...(riya ? [{ memberId: riya.id }] : [])];
  addExpense(db, {
    tripId: t.id,
    title: 'Villa',
    category: 'stay',
    amountMinor: 900000,
    currency: 'INR',
    paidByMemberId: me.id,
    splitMethod: 'equal',
    participants: everyone,
  });
  addExpense(db, {
    tripId: t.id,
    title: 'Fish thali',
    category: 'food',
    amountMinor: 100000,
    currency: 'INR',
    paidByMemberId: riya?.id ?? me.id,
    splitMethod: 'equal',
    participants: everyone,
  });
  return { db, id: t.id };
}

describe('Expenses (Plan 47)', () => {
  it('Trip mode records spending; the budget is set in Plan mode only', async () => {
    const { db, id } = trip(true);
    setBudget(db, id, 'stay', 600000);
    await render(withData(db, <BudgetView tripId={id} />, 'trip'));
    expect(screen.getByRole('button', { name: 'Add expense' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /budget/i })).toBeNull();
    // A budget set while planning still shows, read-only.
    expect(screen.getByText(/of ₹12,000 budget/)).toBeTruthy();
  });

  it('Plan mode can set the budget', async () => {
    const { db, id } = trip(true);
    await render(withData(db, <BudgetView tripId={id} />, 'plan'));
    await fireEvent.press(screen.getByRole('button', { name: 'Set budget' }));
    await fireEvent.changeText(screen.getByLabelText('Stay'), '5000');
    await fireEvent.press(screen.getByRole('button', { name: 'Save budget' }));
    // Per person × 2 people, shown beside what's spent on stays.
    expect(screen.getByText('₹9,000 / ₹10,000')).toBeTruthy();
  });

  it('a solo trip has no split, balances or settling up', async () => {
    const { db, id } = trip(false);
    await render(withData(db, <BudgetView tripId={id} />, 'trip'));
    expect(screen.queryByText('Balances')).toBeNull();
    expect(screen.queryByText(/You owe|You are owed|all square/)).toBeNull();
    expect(screen.queryByText('By person')).toBeNull();
    expect(screen.queryByText(/split \d ways/)).toBeNull();
    expect(screen.getAllByText('₹9,000').length).toBeGreaterThan(0);
    // People can still be added, which turns on the group parts.
    await fireEvent.press(screen.getByRole('button', { name: 'Add people' }));
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Riya');
    // The person form's Add comes before the expense list's.
    await fireEvent.press(screen.getAllByRole('button', { name: 'Add' })[0]!);
    expect(screen.getByText('Balances')).toBeTruthy();
    expect(screen.getByText('By person')).toBeTruthy();
  });

  it('the chart switches between categories and people', async () => {
    const { db, id } = trip(true);
    await render(withData(db, <BudgetView tripId={id} />, 'trip'));
    const donut = () => screen.getByTestId('spend-donut').props.accessibilityLabel as string;
    expect(donut()).toBe('Spending by category: Stay ₹9,000, 90%; Food ₹1,000, 10%');
    expect(screen.getByText('₹10,000')).toBeTruthy();
    await fireEvent.press(screen.getByText('By person'));
    // Each person's share of the costs, from the splits.
    expect(donut()).toBe('Spending by person: Gowtham (you) ₹5,000, 50%; Riya ₹5,000, 50%');
    expect(screen.getAllByText('Riya').length).toBeGreaterThan(1);
  });
});
