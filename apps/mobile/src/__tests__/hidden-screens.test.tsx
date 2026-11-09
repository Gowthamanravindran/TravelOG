import { createTrip, whereInputs, type Db } from '@travelog/db';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
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
// Counts trip reads; behaves as the real one.
jest.mock('@travelog/db', () => {
  const actual = jest.requireActual('@travelog/db');
  return { ...actual, whereInputs: jest.fn(actual.whereInputs) };
});
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn() }));

/**
 * Plan 49 T2: a save re-reads only the screen in view. Tabs stay mounted, so
 * without freezing, saving on Budget made the hidden Itinerary work out the
 * whole trip again.
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

it('a save on Budget does not make the hidden Itinerary re-read the trip', async () => {
  const { db, trip } = newTrip();
  await renderRouter(routes, { initialUrl: `/trip/${trip.id}/plan`, wrapper: wrapperFor(db) });
  // The itinerary has drawn (after its skeleton).
  expect(await screen.findByTestId('day-strip')).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: 'Budget' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Set budget' }));
  const reads = whereInputs as jest.Mock;
  reads.mockClear();
  await fireEvent.changeText(screen.getByLabelText('Stay'), '5000');
  await fireEvent.press(screen.getByRole('button', { name: 'Save budget' }));
  await act(async () => {});
  expect(reads).not.toHaveBeenCalled();
  // Back on the Itinerary, it catches up.
  await fireEvent.press(screen.getByRole('tab', { name: 'Itinerary' }));
  await waitFor(() => expect(reads).toHaveBeenCalled());
});
