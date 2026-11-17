import { saveLocalProfile } from '@travelog/db';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import HomeLayout from '@/app/(home)/_layout';
import { stageTabFor } from '@/components/globe-stage';
import { closeCreateFlow, createFlowOpen } from '@/lib/create-flow';
import { hasGlobe } from '@/lib/runtime';
import { makeDb, withData } from '@/testing/test-utils';

let mockPath = '/';
let mockParams: Record<string, string | undefined> = {};
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: mockNavigate,
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

type MockWebView = {
  injected: string[];
  props: { onMessage: (e: { nativeEvent: { data: string } }) => void };
};
const webviews = () => (global as unknown as { mockWebViews: MockWebView[] }).mockWebViews;
const webview = () => webviews()[0]!;
const fromGlobe = (msg: object) =>
  act(async () => webview().props.onMessage({ nativeEvent: { data: JSON.stringify(msg) } }));
const ready = () => fromGlobe({ type: 'ready', ms: 1, quality: 'high', pixelRatio: 2 });
const lastCall = (name: string) =>
  webview()
    .injected.filter((js) => js.includes(name))
    .at(-1);

function db() {
  const d = makeDb();
  saveLocalProfile(d, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
  return d;
}

beforeEach(() => {
  mockPath = '/';
  mockParams = {};
  mockNavigate.mockClear();
  closeCreateFlow();
});

describe('which tabs draw on the globe (Plan 72)', () => {
  it('Trips, Explore and Profile do; anything else does not', () => {
    expect(stageTabFor('/')).toBe('trips');
    expect(stageTabFor('/explore')).toBe('explore');
    expect(stageTabFor('/profile')).toBe('profile');
    expect(stageTabFor('/feed')).toBeNull();
    expect(stageTabFor('/trip/abc/plan')).toBeNull();
  });
});

describe('the globe stage', () => {
  it('on Trips: the globe, the trip list, and a tapped country opens its Explore page', async () => {
    await render(withData(db(), <HomeLayout />));
    expect(screen.getByLabelText('Globe')).toBeTruthy();
    expect(screen.getByText('Your trips')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create a trip' })).toBeTruthy();
    await ready();
    expect(lastCall('setTapMode')!.includes('"report"')).toBe(true);
    await fromGlobe({ type: 'country', iso: 'JPN', name: 'Japan', visited: false });
    expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/explore', params: { country: 'JPN' } });
  });

  it('clips what it draws, so a drawer below its resting height never covers the tab bar', async () => {
    // A drawer is as tall as its highest stop and slides down to rest; the part pushed below the
    // stage must be cut off there. Unclipped, it hung over the tab bar and hid it (Plan 76).
    await render(withData(db(), <HomeLayout />));
    expect(StyleSheet.flatten(screen.getByTestId('globe-stage').props.style).overflow).toBe(
      'hidden',
    );
  });

  it('on Feed the stage is hidden and does not take touches', async () => {
    mockPath = '/feed';
    await render(withData(db(), <HomeLayout />));
    expect(screen.queryByText('Your trips')).toBeNull();
    expect(
      screen.getByTestId('globe-stage', { includeHiddenElements: true }).props.pointerEvents,
    ).toBe('none');
  });

  it('changing tabs keeps the same globe: it is never loaded again', async () => {
    const d = db();
    const view = await render(withData(d, <HomeLayout />));
    const first = webview();
    for (const path of ['/explore', '/feed', '/profile', '/']) {
      mockPath = path;
      await view.rerender(withData(d, <HomeLayout />));
      expect(webviews()).toHaveLength(1);
      expect(webview()).toBe(first);
    }
  });

  it('New trip from another tab goes to Trips and starts the flow; a tap then picks the country', async () => {
    const d = db();
    mockPath = '/profile';
    const view = await render(withData(d, <HomeLayout />));
    await ready();
    await fireEvent.press(screen.getByRole('button', { name: 'New trip' }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(createFlowOpen()).toBe(true);
    mockPath = '/';
    mockNavigate.mockClear();
    await view.rerender(withData(d, <HomeLayout />));
    expect(screen.getByText('Where to?')).toBeTruthy();
    expect(lastCall('setTapMode')!.includes('"focus"')).toBe(true);
    await fromGlobe({ type: 'country', iso: 'JPN', name: 'Japan', visited: false });
    expect(screen.getByRole('button', { name: 'Remove Japan' })).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
