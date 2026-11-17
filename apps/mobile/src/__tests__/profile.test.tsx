import { saveLocalProfile } from '@travelog/db';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import HomeLayout from '@/app/(home)/_layout';
import { closeCreateFlow } from '@/lib/create-flow';
import { hasGlobe } from '@/lib/runtime';
import { addVisited, readVisited } from '@/lib/visited';
import { makeDb, withData } from '@/testing/test-utils';

let mockPath = '/profile';
let mockParams: Record<string, string | undefined> = {};
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
    setParams: jest.fn(),
  }),
  usePathname: () => mockPath,
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
  Redirect: () => null,
}));
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
  hasGlobe: jest.fn(() => true),
}));
(hasGlobe as jest.Mock).mockReturnValue(true);
const announce = jest
  .spyOn(AccessibilityInfo, 'announceForAccessibility')
  .mockImplementation(() => {});

type MockWebView = {
  injected: string[];
  props: { onMessage: (e: { nativeEvent: { data: string } }) => void };
};
const webview = () => (global as unknown as { mockWebViews: MockWebView[] }).mockWebViews[0]!;
const fromGlobe = (msg: object) =>
  act(async () => webview().props.onMessage({ nativeEvent: { data: JSON.stringify(msg) } }));
const ready = () => fromGlobe({ type: 'ready', ms: 1, quality: 'high', pixelRatio: 2 });
const calls = (name: string) => webview().injected.filter((js) => js.includes(name));
const last = (name: string) => calls(name).at(-1) ?? '';
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const tapJapan = () => fromGlobe({ type: 'country', iso: 'JPN', name: 'Japan', visited: false });

function db(visited: string[] = []) {
  const d = makeDb();
  saveLocalProfile(d, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
  visited.forEach((code) => addVisited(d, code));
  return d;
}
async function profile(d = db()) {
  const view = await render(withData(d, <HomeLayout />));
  await ready();
  return { d, again: () => view.rerender(withData(d, <HomeLayout />)) };
}

beforeEach(() => {
  mockPath = '/profile';
  mockParams = {};
  mockPush.mockClear();
  announce.mockClear();
  closeCreateFlow();
});

describe('Profile on the globe: countries visited (Plan 74)', () => {
  it('starts with none, and says how to mark one', async () => {
    await profile();
    expect(screen.getByLabelText('Globe')).toBeTruthy();
    expect(screen.getByText('Gowtham')).toBeTruthy();
    expect(screen.getByText('0 countries visited')).toBeTruthy();
    expect(screen.getByText('Tap a country on the globe to mark it.')).toBeTruthy();
    expect(last('setData').includes('"visited":[]')).toBe(true);
  });

  it('tapping a country on the globe marks it; tapping it again unmarks it', async () => {
    const { d } = await profile();
    await tapJapan();
    expect(screen.getByText('1 country visited')).toBeTruthy();
    expect(screen.getByText('Japan')).toBeTruthy();
    expect(readVisited(d)).toEqual(['JP']);
    expect(last('setData').includes('"visited":["JPN"]')).toBe(true);
    expect(announce).toHaveBeenLastCalledWith('Japan marked as visited');

    await tapJapan();
    expect(screen.getByText('0 countries visited')).toBeTruthy();
    expect(readVisited(d)).toEqual([]);
    expect(last('setData').includes('"visited":[]')).toBe(true);
    expect(announce).toHaveBeenLastCalledWith('Japan removed');
  });

  it('a tap only marks: the globe is in report mode and is not asked to zoom or outline', async () => {
    await profile();
    expect(last('setTapMode').includes('"report"')).toBe(true);
    const focused = calls('focusCountry(').length;
    await tapJapan();
    expect(calls('focusCountry(').length).toBe(focused);
  });

  it('shows three countries and the total; opening the section shows them all and adds more', async () => {
    const { d } = await profile(db(['IN', 'JP', 'FR', 'TH', 'AU']));
    expect(screen.getByText('5 countries visited')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Countries you’ve visited, 5' })).toBeTruthy();
    for (const name of ['India', 'Japan', 'France']) expect(screen.getByText(name)).toBeTruthy();
    expect(screen.queryByText('Thailand')).toBeNull();

    await press('+2 more');
    expect(screen.getByRole('button', { name: 'Remove Thailand' })).toBeTruthy();
    expect(
      screen.getByText('Tap a country on the globe to mark it, or tap it again to unmark it.'),
    ).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Add a country you’ve visited'), 'egy');
    await press('Add Egypt');
    expect(readVisited(d)).toEqual(['IN', 'JP', 'FR', 'TH', 'AU', 'EG']);
    expect(screen.getByRole('button', { name: 'Countries you’ve visited, 6' })).toBeTruthy();

    await press('Remove Thailand');
    expect(readVisited(d)).toEqual(['IN', 'JP', 'FR', 'AU', 'EG']);
  });

  it('the marks are for Profile only: on another tab the globe is plain again', async () => {
    const { again } = await profile(db(['IN', 'JP']));
    expect(last('setData').includes('"visited":["IND","JPN"]')).toBe(true);
    mockPath = '/';
    await again();
    expect(last('setData').includes('"visited":[]')).toBe(true);
    mockPath = '/explore';
    await again();
    expect(last('setData').includes('"visited":[]')).toBe(true);
    mockPath = '/profile';
    await again();
    expect(last('setData').includes('"visited":["IND","JPN"]')).toBe(true);
  });

  it('a place the globe has no country code for is not marked', async () => {
    const { d } = await profile();
    await fromGlobe({ type: 'country', iso: 'XXX', name: 'Nowhere', visited: false });
    expect(readVisited(d)).toEqual([]);
    expect(screen.getByText('0 countries visited')).toBeTruthy();
  });
});

describe('Profile → Settings, behind the gear (Plan 74)', () => {
  it('keeps the person on Profile and the settings one tap away', async () => {
    await profile();
    expect(screen.getByText(/Home currency INR/)).toBeTruthy();
    expect(screen.queryByText('Trip reminders')).toBeNull();
    await press('Settings');
    for (const row of ['Trip reminders', 'Appearance', 'About'])
      expect(screen.getByRole('button', { name: new RegExp(`^${row}`) })).toBeTruthy();
    expect(screen.queryByText(/Home currency INR/)).toBeNull();
    await press('Back to Profile');
    expect(screen.getByText(/Home currency INR/)).toBeTruthy();
  });

  it('Appearance shows the current choice and opens to the pickers', async () => {
    await profile();
    await press('Settings');
    expect(screen.getByText('Black & white · Match phone')).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Theme Sunset' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /^Appearance/ }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Theme Sunset' }));
    expect(screen.getByText('Sunset · Match phone')).toBeTruthy();
  });

  it('About holds licences, this app build, account and the version', async () => {
    await profile();
    await press('Settings');
    expect(screen.getByText('Licences, this app build, account and version')).toBeTruthy();
    expect(screen.queryByText('This app build')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /^About/ }));
    for (const text of ['This app build', 'Account and sync', 'Globe: included.'])
      expect(screen.getByText(text)).toBeTruthy();
    await press('Licences and credits');
    expect(mockPush).toHaveBeenCalledWith('/licenses');
  });

  it('leaving the Profile tab closes Settings', async () => {
    const { again } = await profile();
    await press('Settings');
    mockPath = '/';
    await again();
    mockPath = '/profile';
    await again();
    expect(screen.getByText(/Home currency INR/)).toBeTruthy();
  });
});
