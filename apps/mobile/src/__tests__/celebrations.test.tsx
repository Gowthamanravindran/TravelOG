import { listTrips, saveLocalProfile } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import NewTripScreen from '@/app/new-trip';
import { makeDb, withData } from '@/testing/test-utils';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: mockReplace,
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
}));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

describe('celebrations (Plan 28)', () => {
  it('creating a trip shows the check-mark burst', async () => {
    const db = makeDb();
    saveLocalProfile(db, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
    const metrics = {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    };
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        {withData(db, <NewTripScreen />)}
      </SafeAreaProvider>,
    );
    await fireEvent.changeText(screen.getByLabelText('Trip name'), 'Goa weekend');
    await fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    expect(listTrips(db)).toHaveLength(1);
    expect(screen.getByLabelText('Trip created')).toBeTruthy();
  });
});
