import { saveLocalProfile } from '@travelog/db';
import { defaultTheme } from '@travelog/globe';
import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeLayout from '@/app/(home)/_layout';
import TripsScreen from '@/app/(home)/index';
import { closeCreateFlow, createFlowOpen } from '@/lib/create-flow';
import { hasGlobe } from '@/lib/runtime';
import { makeDb, withData } from '@/testing/test-utils';

let mockPath = '/';
let mockParams: Record<string, string | undefined> = {};
const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    replace: jest.fn(),
    navigate: mockNavigate,
    setParams: mockSetParams,
  }),
  usePathname: () => mockPath,
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
  Redirect: () => null,
}));
// The tab navigator is replaced by something that only draws the layout's own tab bar; the
// globe stage and its panels are drawn by the layout itself.
jest.mock('expo-router/tabs', () => {
  const Tabs = ({ tabBar }: { tabBar: (p: unknown) => React.ReactNode }) =>
    tabBar({
      state: { index: 0, routes: [{ name: 'index', key: 'index' }] },
      navigateToTab: jest.fn(),
    });
  Tabs.Screen = () => null;
  return { Tabs };
});
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));
jest.mock('@/lib/runtime', () => ({
  ...jest.requireActual('@/lib/runtime'),
  hasGlobe: jest.fn(() => false),
}));
const mockHasGlobe = hasGlobe as jest.Mock;

function db() {
  const d = makeDb();
  saveLocalProfile(d, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
  return d;
}

beforeEach(() => {
  mockPath = '/';
  mockParams = {};
  mockPush.mockClear();
  mockNavigate.mockClear();
  mockHasGlobe.mockReturnValue(false);
  closeCreateFlow();
});

describe('Trips tab where the web view is not in the installed app', () => {
  it('shows the list as before and creates through the old form', async () => {
    await render(withData(db(), <TripsScreen />));
    expect(screen.getByText('Your trips')).toBeTruthy();
    expect(screen.queryByLabelText('Globe')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Plan a trip' }));
    expect(mockPush).toHaveBeenCalledWith('/new-trip');
    expect(createFlowOpen()).toBe(false);
  });

  it('the tab bar’s New trip button opens the old form too', async () => {
    await render(withData(db(), <HomeLayout />));
    await fireEvent.press(screen.getByRole('button', { name: 'New trip' }));
    expect(mockPush).toHaveBeenCalledWith('/new-trip');
  });
});

describe('the home tab bar (Plan 68)', () => {
  it('has Trips, Feed, Explore and Profile, and no Saved tab', async () => {
    await render(withData(db(), <HomeLayout />));
    for (const label of ['Trips', 'Feed', 'Explore', 'Profile'])
      expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByText('Saved')).toBeNull();
  });
});

describe('Trips tab with the globe', () => {
  beforeEach(() => mockHasGlobe.mockReturnValue(true));

  it('shows the globe, the drawer with the trip list, and Create a trip starts the flow', async () => {
    await render(withData(db(), <HomeLayout />));
    expect(screen.getByLabelText('Globe')).toBeTruthy();
    expect(screen.getByText('Your trips')).toBeTruthy();
    expect(screen.getByText('No trips yet')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Create a trip' }));
    expect(createFlowOpen()).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('the tab bar’s New trip starts the flow, and the bar hides while it is open', async () => {
    await render(withData(db(), <HomeLayout />));
    expect(screen.getByTestId('tab-bar')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'New trip' }));
    expect(createFlowOpen()).toBe(true);
    expect(screen.queryByTestId('tab-bar')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('globe look', () => {
  it('keeps its own colours and satellite imagery in every app theme', async () => {
    mockHasGlobe.mockReturnValue(true);
    await render(withData(db(), <HomeLayout />));
    const html = (global as unknown as { mockWebViews: { props: { source: { html: string } } }[] })
      .mockWebViews[0]!.props.source.html;
    expect(html.includes(defaultTheme.ocean)).toBe(true);
    expect(html.includes('nasa-bluemarble')).toBe(true);
  });
});

// Last, because the throwing stand-in for the web view stays registered for this file.
describe('loading the Trips tab', () => {
  it('never touches the web view package', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native-webview', () => {
        throw new Error('RNCWebViewModule could not be found');
      });
      expect(() => require('@/app/(home)/index')).not.toThrow();
      expect(() => require('@/components/globe')).not.toThrow();
    });
  });
});
