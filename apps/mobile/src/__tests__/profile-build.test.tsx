import { saveLocalProfile } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';

import ProfileScreen from '@/app/(home)/profile';
import { globeStatus } from '@/lib/runtime';
import { makeDb, withData } from '@/testing/test-utils';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
}));
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));
jest.mock('@/lib/runtime', () => ({
  ...jest.requireActual('@/lib/runtime'),
  globeStatus: jest.fn(),
  // The Profile route on its own is the plain page, as drawn where the globe cannot run.
  hasGlobe: () => false,
}));

async function profile() {
  const db = makeDb();
  saveLocalProfile(db, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
  await render(withData(db, <ProfileScreen />));
  // "This app build" is in Settings → About (Plan 74).
  await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
  await fireEvent.press(screen.getByRole('button', { name: /^About/ }));
}

describe('Profile → This app build says whether the globe is in it (Plan 71)', () => {
  it('when it is', async () => {
    (globeStatus as jest.Mock).mockReturnValue({ ok: true, why: null });
    await profile();
    expect(screen.getByText('Globe: included.')).toBeTruthy();
  });

  it('when it is not, with the reason the app gave', async () => {
    (globeStatus as jest.Mock).mockReturnValue({
      ok: false,
      why: "'RNCWebViewModule' could not be found",
    });
    await profile();
    expect(
      screen.getByText(
        "Globe: not in this build, so Trips shows the list. Install the latest build. ('RNCWebViewModule' could not be found)",
      ),
    ).toBeTruthy();
  });
});
