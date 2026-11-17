import { saveLocalProfile } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';

// Where the globe cannot run (Expo Go without the web view, an old build), each tab is a plain
// page with the same content (Plans 72–74). Each route is rendered on its own, as there.
jest.mock('@/lib/runtime', () => ({
  ...jest.requireActual('@/lib/runtime'),
  hasGlobe: () => false,
}));
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));

import ExploreScreen from '@/app/(home)/explore';
import TripsScreen from '@/app/(home)/index';
import ProfileScreen from '@/app/(home)/profile';
import { readVisited } from '@/lib/visited';
import { makeDb, withData } from '@/testing/test-utils';

let mockParams: Record<string, string | undefined> = {};
const mockPush = jest.fn();
const mockSetParams = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
    setParams: mockSetParams,
  }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
}));

function db() {
  const d = makeDb();
  saveLocalProfile(d, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
  return d;
}
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(() => {
  mockParams = {};
  mockPush.mockClear();
  mockSetParams.mockClear();
});

describe('the tabs as plain pages, where the globe cannot run', () => {
  it('Explore: a country’s page has its cities and sample trips, and no globe', async () => {
    mockParams = { country: 'JPN' };
    await render(withData(db(), <ExploreScreen />));
    expect(screen.getByText('Exploring Japan')).toBeTruthy();
    expect(screen.getByLabelText('Search cities in Japan')).toBeTruthy();
    expect(screen.getByText('Curated trips')).toBeTruthy();
    expect(screen.queryByLabelText('Globe')).toBeNull();
    await press('Tokyo');
    await press('All of Explore');
    expect(mockSetParams).toHaveBeenCalledWith({ country: undefined });
  });

  it('Explore: with no country, the search opens one', async () => {
    await render(withData(db(), <ExploreScreen />));
    await fireEvent.changeText(screen.getByLabelText('Search a country'), 'jap');
    await press('Japan');
    expect(mockSetParams).toHaveBeenCalledWith({ country: 'JPN' });
  });

  it('Profile: countries are added by search, and Settings are behind the gear', async () => {
    const d = db();
    await render(withData(d, <ProfileScreen />));
    expect(screen.getByText('0 countries visited')).toBeTruthy();
    expect(screen.queryByText(/on the globe/)).toBeNull();
    await press('Countries you’ve visited, 0');
    await fireEvent.changeText(screen.getByLabelText('Add a country you’ve visited'), 'jap');
    await press('Add Japan');
    expect(readVisited(d)).toEqual(['JP']);
    expect(screen.getByText('1 country visited')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove Japan' })).toBeTruthy();

    await press('Settings');
    for (const row of ['Trip reminders', 'Appearance', 'About'])
      expect(screen.getByRole('button', { name: new RegExp(`^${row}`) })).toBeTruthy();
    await press('Back to Profile');
    expect(screen.getByText('1 country visited')).toBeTruthy();
  });

  it('Trips: the list, and Plan a trip opens the form', async () => {
    await render(withData(db(), <TripsScreen />));
    expect(screen.getByText('No trips yet')).toBeTruthy();
    await press('Plan a trip');
    expect(mockPush).toHaveBeenCalledWith('/new-trip');
  });
});
