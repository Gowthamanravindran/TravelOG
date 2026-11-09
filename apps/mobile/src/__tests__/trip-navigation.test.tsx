import { addMember, createTrip, type Db } from '@travelog/db';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import LiveLayout from '@/app/trip/[id]/live/_layout';
import LiveExpenses from '@/app/trip/[id]/live/expenses';
import LiveToday from '@/app/trip/[id]/live/index';
import LiveMemories from '@/app/trip/[id]/live/memories';
import LiveNearby from '@/app/trip/[id]/live/nearby';
import LivePlan from '@/app/trip/[id]/live/plan';
import TripLayout from '@/app/trip/[id]/_layout';
import PlanLayout from '@/app/trip/[id]/plan/_layout';
import PlanBookings from '@/app/trip/[id]/plan/bookings';
import PlanBudget from '@/app/trip/[id]/plan/budget';
import PlanItinerary from '@/app/trip/[id]/plan/index';
import PlanMemories from '@/app/trip/[id]/plan/memories';
import PlanPolls from '@/app/trip/[id]/plan/polls';
import { DataProvider } from '@/data/provider';
import { makeDb } from '@/testing/test-utils';

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn() }));

/**
 * Real Expo Router navigation (Plan 21): tabs opened after the first one must
 * still know which trip they belong to. Screen tests that mock the router can't
 * see this; this one taps the tabs like a person would.
 */
const routes = {
  'trip/[id]/_layout': TripLayout,
  'trip/[id]/plan/_layout': PlanLayout,
  'trip/[id]/plan/index': PlanItinerary,
  'trip/[id]/plan/budget': PlanBudget,
  'trip/[id]/plan/bookings': PlanBookings,
  'trip/[id]/plan/polls': PlanPolls,
  'trip/[id]/plan/memories': PlanMemories,
  'trip/[id]/live/_layout': LiveLayout,
  'trip/[id]/live/index': LiveToday,
  'trip/[id]/live/plan': LivePlan,
  'trip/[id]/live/nearby': LiveNearby,
  'trip/[id]/live/expenses': LiveExpenses,
  'trip/[id]/live/memories': LiveMemories,
};

function wrapperFor(db: Db) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <DataProvider db={db}>{children}</DataProvider>
      </GestureHandlerRootView>
    );
  };
}

function newTrip() {
  const db = makeDb();
  const trip = createTrip(
    db,
    { title: 'Europe', startDate: '2026-11-15', endDate: '2026-12-15', timeZone: 'Asia/Kolkata' },
    { displayName: 'You' },
  );
  return { db, trip };
}

describe('trip tabs with the real router', () => {
  it('Plan mode: Budget, Bookings, Polls and Memories show their content and buttons', async () => {
    const { db, trip } = newTrip();
    // Polls show once someone else is on the trip.
    addMember(db, trip.id, 'Priya');
    await renderRouter(routes, { initialUrl: `/trip/${trip.id}/plan`, wrapper: wrapperFor(db) });
    expect(await screen.findByText('Set up your trip')).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Budget' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add expense' })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Set budget' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Bookings' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add booking' })).toBeTruthy());

    await fireEvent.press(screen.getByRole('tab', { name: 'Polls' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'New poll' })).toBeTruthy());

    await fireEvent.press(screen.getByRole('tab', { name: 'Memories' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add photos' })).toBeTruthy());
  });

  it('a trip with one person has no Polls tab; adding someone brings it back (Plan 41)', async () => {
    const { db, trip } = newTrip();
    const view = await renderRouter(routes, {
      initialUrl: `/trip/${trip.id}/plan`,
      wrapper: wrapperFor(db),
    });
    expect(await screen.findByRole('tab', { name: 'Budget' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Polls' })).toBeNull();
    await view.unmount();

    addMember(db, trip.id, 'Priya');
    await renderRouter(routes, { initialUrl: `/trip/${trip.id}/plan`, wrapper: wrapperFor(db) });
    expect(await screen.findByRole('tab', { name: 'Polls' })).toBeTruthy();
  });

  it('Trip mode: Expenses and Memories show their content', async () => {
    const { db, trip } = newTrip();
    await renderRouter(routes, { initialUrl: `/trip/${trip.id}/live`, wrapper: wrapperFor(db) });
    await fireEvent.press(await screen.findByRole('tab', { name: 'Expenses' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add expense' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('tab', { name: 'Memories' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add photos' })).toBeTruthy());
  });
});
