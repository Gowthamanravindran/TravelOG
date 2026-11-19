import { createTrip, listTrips } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';

import EditTrip from '@/app/trip/[id]/edit';
import { TripHeader } from '@/components/trip-header';
import { makeDb, withData } from '@/testing/test-utils';

// Going back to Trips from a trip goes back to the Trips screen already there, and does not
// open a second one on top. Expo Router's navigate pushes a new screen for a route further back
// in the history, so each "Back to trips" (and each deleted trip) started another home screen
// and another globe (Plan 90).

const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockDismissTo = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    replace: jest.fn(),
    navigate: mockNavigate,
    dismissTo: mockDismissTo,
  }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
}));

function setup() {
  const db = makeDb();
  const trip = createTrip(
    db,
    { title: 'Goa', emoji: 'beach', timeZone: 'Asia/Kolkata', currency: 'INR' },
    { displayName: 'Gowtham' },
  );
  mockParams = { id: trip.id };
  return { db, tripId: trip.id };
}
beforeEach(() => {
  mockPush.mockReset();
  mockNavigate.mockReset();
  mockDismissTo.mockReset();
});

describe('back to Trips (Plan 90)', () => {
  it.each([
    ['plan', 'Back to trips'],
    ['trip', 'Exit trip mode'],
  ] as const)('the header’s back button in %s mode goes back, not forward', async (mode, name) => {
    const { db } = setup();
    await render(withData(db, <TripHeader />, mode));
    await fireEvent.press(screen.getByRole('button', { name }));
    expect(mockDismissTo).toHaveBeenCalledWith('/');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('deleting a trip goes back to the Trips screen already there', async () => {
    const { db } = setup();
    await render(withData(db, <EditTrip />, 'plan'));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete trip' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete for good' }));
    expect(listTrips(db)).toHaveLength(0);
    expect(mockDismissTo).toHaveBeenCalledWith('/');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
