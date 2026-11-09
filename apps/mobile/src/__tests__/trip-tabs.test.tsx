import { addDays, localDateIn } from '@travelog/core';
import { createTrip } from '@travelog/db';
import { render, screen } from '@testing-library/react-native';
import type { ComponentType } from 'react';

import LiveExpenses from '@/app/trip/[id]/live/expenses';
import LiveToday from '@/app/trip/[id]/live/index';
import LiveMemories from '@/app/trip/[id]/live/memories';
import LiveNearby from '@/app/trip/[id]/live/nearby';
import LivePlan from '@/app/trip/[id]/live/plan';
import PlanBookings from '@/app/trip/[id]/plan/bookings';
import PlanBudget from '@/app/trip/[id]/plan/budget';
import PlanItinerary from '@/app/trip/[id]/plan/index';
import PlanMemories from '@/app/trip/[id]/plan/memories';
import PlanPolls from '@/app/trip/[id]/plan/polls';
import { makeDb, withData } from '@/testing/test-utils';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
  useFocusEffect: (fn: () => void) => require('react').useEffect(fn, [fn]),
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn() }));

const TABS: [string, ComponentType, 'plan' | 'trip'][] = [
  ['Itinerary', PlanItinerary, 'plan'],
  ['Budget', PlanBudget, 'plan'],
  ['Bookings', PlanBookings, 'plan'],
  ['Polls', PlanPolls, 'plan'],
  ['Memories', PlanMemories, 'plan'],
  ['Today', LiveToday, 'trip'],
  ['Trip plan', LivePlan, 'trip'],
  ['Nearby', LiveNearby, 'trip'],
  ['Trip expenses', LiveExpenses, 'trip'],
  ['Trip memories', LiveMemories, 'trip'],
];

// Every trip tab must draw something (a crash in one tab left the others blank on a phone).
describe.each(TABS)('%s tab', (_name, Tab, mode) => {
  it.each<Record<string, string>>([{}, { edit: '1' }])('renders with params %j', async (extra) => {
    const db = makeDb();
    const today = localDateIn('Asia/Kolkata');
    const trip = createTrip(
      db,
      { title: 'Europe', startDate: today, endDate: addDays(today, 3), timeZone: 'Asia/Kolkata' },
      { displayName: 'You' },
    );
    mockParams = { id: trip.id, ...extra };
    const view = await render(withData(db, <Tab />, mode));
    expect(view.toJSON()).not.toBeNull();
    expect(screen.root).toBeTruthy();
  });
});
