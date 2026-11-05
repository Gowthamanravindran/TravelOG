import { addDays, localDateIn } from '@travelog/core';
import { addItem, createTrip, ensureMainVariant, listCheckIns } from '@travelog/db';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TodayTab from '@/app/trip/[id]/live/index';
import { makeDb, withData } from '@/testing/test-utils';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
}));
const mockRequest = jest.fn();
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => mockRequest(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

describe('Today check-ins', () => {
  it("checks in at a stop without asking for location, and shows it on the day's timeline", async () => {
    const db = makeDb();
    const tz = 'Asia/Kolkata';
    const today = localDateIn(tz);
    const trip = createTrip(
      db,
      { title: 'Goa', startDate: today, endDate: addDays(today, 2), timeZone: tz },
      { displayName: 'You' },
    );
    const plan = ensureMainVariant(db, trip.id, today);
    addItem(db, plan.id, { type: 'place', title: 'Untimed beach walk' });
    mockParams = { id: trip.id };

    await render(withData(db, <TodayTab />, 'trip'));
    await fireEvent.press(screen.getByRole('button', { name: "I'm here" }));

    await waitFor(() => expect(screen.getByText(/Checked in at/)).toBeTruthy());
    expect(screen.getByText("Today's timeline")).toBeTruthy();
    expect(listCheckIns(db, trip.id, today)[0]).toMatchObject({
      title: 'Untimed beach walk',
      lat: null,
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
