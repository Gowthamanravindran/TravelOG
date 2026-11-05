import { createTrip, listMembers } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { BudgetView } from '@/components/budget-view';
import { TripSetupCard } from '@/components/trip-setup';
import { makeDb, withData } from '@/testing/test-utils';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

function newTrip() {
  const db = makeDb();
  const trip = createTrip(
    db,
    { title: 'Goa', startDate: '2026-12-12', endDate: '2026-12-14', timeZone: 'Asia/Kolkata' },
    { displayName: 'You' },
  );
  return { db, trip };
}

describe('Set up your trip', () => {
  it('adds people inline, links to budget, bookings and the first day, and can be hidden', async () => {
    const { db, trip } = newTrip();
    await render(withData(db, <TripSetupCard tripId={trip.id} />, 'plan'));
    expect(screen.getByText('0 of 4 done')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Add people' }));
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Riya');
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(listMembers(db, trip.id).map((m) => m.displayName)).toEqual(['You', 'Riya']);
    expect(screen.getByText('1 of 4 done')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add people, done' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Set a budget' }));
    expect(mockPush).toHaveBeenLastCalledWith(`/trip/${trip.id}/plan/budget?edit=1`);
    await fireEvent.press(screen.getByRole('button', { name: 'Add bookings' }));
    expect(mockPush).toHaveBeenLastCalledWith(`/trip/${trip.id}/booking`);
    await fireEvent.press(screen.getByRole('button', { name: 'Plan the first day' }));
    expect(mockPush).toHaveBeenLastCalledWith(expect.stringMatching(/\/item\?variantId=/));

    await fireEvent.press(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByText('Set up your trip')).toBeNull();
  });
});

describe('Budget tab', () => {
  it('offers Set budget and people, in Trip mode too', async () => {
    const { db, trip } = newTrip();
    await render(withData(db, <BudgetView tripId={trip.id} />, 'trip'));
    expect(screen.getByText('People · 1')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Set budget' }));
    expect(screen.getByRole('button', { name: 'Save budget' })).toBeTruthy();
  });

  it('opens straight into editing from trip setup', async () => {
    const { db, trip } = newTrip();
    await render(withData(db, <BudgetView tripId={trip.id} startEditing />, 'plan'));
    expect(screen.getByRole('button', { name: 'Save budget' })).toBeTruthy();
  });
});
