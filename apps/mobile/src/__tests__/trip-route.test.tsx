import { createTrip, saveLocalProfile } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';

import TripsScreen from '@/app/(home)/index';
import { tripHref } from '@/lib/trip-route';
import { makeDb, withData } from '@/testing/test-utils';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
}));
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));

const now = new Date('2026-07-14T06:00:00Z');
const trip = (startDate: string | null, endDate: string | null) => ({
  id: 't1',
  startDate,
  endDate,
  timeZone: 'Asia/Kolkata',
  archivedAt: null,
});

describe('opening a trip (Plan 36)', () => {
  it('lands on the right screen for where the trip is', () => {
    expect(tripHref(trip('2026-08-01', '2026-08-05'), now)).toBe('/trip/t1/plan');
    expect(tripHref(trip(null, null), now)).toBe('/trip/t1/plan');
    expect(tripHref(trip('2026-07-12', '2026-07-16'), now)).toBe('/trip/t1/live');
    expect(tripHref(trip('2026-06-01', '2026-06-05'), now)).toBe('/trip/t1/plan/memories');
  });

  it('the Trips list goes straight to the trip, not through an empty page', async () => {
    const db = makeDb();
    saveLocalProfile(db, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
    const t = createTrip(
      db,
      { title: 'Spiti', timeZone: 'Asia/Kolkata', startDate: '2099-08-01', endDate: '2099-08-05' },
      { displayName: 'Gowtham' },
    );
    await render(withData(db, <TripsScreen />));
    await fireEvent.press(screen.getByText('Spiti'));
    expect(mockPush).toHaveBeenCalledWith(`/trip/${t.id}/plan`);
  });
});
