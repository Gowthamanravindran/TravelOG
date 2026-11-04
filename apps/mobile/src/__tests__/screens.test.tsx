import {
  addExpense,
  addMember,
  createPoll,
  createTrip,
  myMember,
  saveLocalProfile,
} from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';

import TripsScreen from '@/app/(home)/index';
import { BudgetView } from '@/components/budget-view';
import { PollsView } from '@/components/polls-view';

import { makeDb, withData } from '@/testing/test-utils';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

describe('screens on a real database', () => {
  it('Trips shows the empty state, then a created trip', async () => {
    const db = makeDb();
    saveLocalProfile(db, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
    const view = await render(withData(db, <TripsScreen />));
    expect(screen.getByText('No trips yet')).toBeTruthy();
    expect(screen.getByText('Hi Gowtham 👋')).toBeTruthy();

    createTrip(
      db,
      { title: 'Spiti Road Trip', emoji: '🏔️', timeZone: 'Asia/Kolkata' },
      { displayName: 'Gowtham' },
    );
    // Written directly (not through the app), so open the screen again to read it.
    await view.unmount();
    await render(withData(db, <TripsScreen />));
    fireEvent.press(screen.getByRole('tab', { name: 'Planning' }));
    expect(screen.getByText('Spiti Road Trip')).toBeTruthy();
  });

  it('Budget shows who owes whom', async () => {
    const db = makeDb();
    const trip = createTrip(db, { title: 'Goa', timeZone: 'Asia/Kolkata' }, { displayName: 'You' });
    const me = myMember(db, trip.id)!;
    const riya = addMember(db, trip.id, 'Riya');
    addExpense(db, {
      tripId: trip.id,
      title: 'Villa',
      category: 'stay',
      amountMinor: 1000000,
      currency: 'INR',
      paidByMemberId: me.id,
      splitMethod: 'equal',
      participants: [{ memberId: me.id }, { memberId: riya.id }],
    });
    await render(withData(db, <BudgetView tripId={trip.id} />, 'plan'));
    expect(screen.getByText('You are owed ₹5,000')).toBeTruthy();
    expect(screen.getByText('owes ₹5,000')).toBeTruthy();
    expect(screen.getByText('🏡 Villa')).toBeTruthy();
  });

  it('Polls records a vote when an option is tapped', async () => {
    const db = makeDb();
    const trip = createTrip(
      db,
      { title: 'Spiti', timeZone: 'Asia/Kolkata' },
      { displayName: 'You' },
    );
    createPoll(db, {
      tripId: trip.id,
      type: 'custom',
      question: 'Stay in Kaza?',
      options: [{ label: 'Zostel' }, { label: 'Sakya Abode' }],
    });
    await render(withData(db, <PollsView tripId={trip.id} />, 'plan'));
    fireEvent.press(screen.getByRole('button', { name: 'Zostel, 0 votes' }));
    expect(await screen.findByRole('button', { name: 'Zostel, 1 votes' })).toBeTruthy();
    expect(screen.getByText('1 voted · pick one')).toBeTruthy();
  });
});
