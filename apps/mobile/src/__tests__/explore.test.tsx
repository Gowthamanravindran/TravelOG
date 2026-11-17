import { saveLocalProfile } from '@travelog/db';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import HomeLayout from '@/app/(home)/_layout';
import { closeCreateFlow } from '@/lib/create-flow';
import { hasGlobe } from '@/lib/runtime';
import { makeDb, withData } from '@/testing/test-utils';

let mockPath = '/explore';
let mockParams: Record<string, string | undefined> = {};
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
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
const webview = () => (global as unknown as { mockWebViews: MockWebView[] }).mockWebViews[0]!;
const fromGlobe = (msg: object) =>
  act(async () => webview().props.onMessage({ nativeEvent: { data: JSON.stringify(msg) } }));
const ready = () => fromGlobe({ type: 'ready', ms: 1, quality: 'high', pixelRatio: 2 });
const calls = (name: string) => webview().injected.filter((js) => js.includes(name));
const last = (name: string) => calls(name).at(-1) ?? '';
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

function db() {
  const d = makeDb();
  saveLocalProfile(d, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
  return d;
}
async function explore(params: Record<string, string | undefined> = {}) {
  mockParams = params;
  const d = db();
  const view = await render(withData(d, <HomeLayout />));
  await ready();
  return { view, again: () => view.rerender(withData(d, <HomeLayout />)) };
}

beforeEach(() => {
  mockPath = '/explore';
  mockParams = {};
  mockNavigate.mockClear();
  mockSetParams.mockClear();
  closeCreateFlow();
});

describe('Explore with no country picked (Plan 73)', () => {
  it('is the plain globe with general content and a country search', async () => {
    await explore();
    expect(screen.getByLabelText('Globe')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Explore' })).toBeTruthy();
    expect(screen.getByText('Ready-made trips are on the way')).toBeTruthy();
    expect(last('setData').includes('"visited":[]')).toBe(true);
    expect(last('setData').includes('"candidates":[]')).toBe(true);
    expect(last('setTapMode').includes('"report"')).toBe(true);
  });

  it('a country is opened by search or by tapping the globe', async () => {
    await explore();
    await fireEvent.changeText(screen.getByLabelText('Search a country'), 'jap');
    await press('Japan');
    expect(mockSetParams).toHaveBeenLastCalledWith({ country: 'JPN' });
    await fromGlobe({ type: 'country', iso: 'FRA', name: 'France', visited: false });
    expect(mockSetParams).toHaveBeenLastCalledWith({ country: 'FRA' });
  });
});

describe('Exploring a country (Plan 73)', () => {
  it('turns the globe to the country and shows its page', async () => {
    await explore({ country: 'JPN' });
    expect(screen.getByText('Exploring Japan')).toBeTruthy();
    expect(last('focusCountry').includes('focusCountry("JPN")')).toBe(true);
    // The country is outlined by the page, not filled like a picked or visited one.
    expect(last('setData').includes('"visited":[]')).toBe(true);
    expect(last('setData').includes('"candidates":[{"id":"1850147","name":"Tokyo"')).toBe(true);
    expect(screen.getByText('Explore by city')).toBeTruthy();
    expect(screen.getByText('Curated trips')).toBeTruthy();
    expect(screen.getAllByText(/Sample/).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Ready-made trips are on the way')).toBeNull();
  });

  it('a city tile flies the globe to that city', async () => {
    await explore({ country: 'JPN' });
    const before = calls('flyTo(').length;
    await press('Osaka');
    expect(calls('flyTo(').length).toBe(before + 1);
    expect(last('flyTo(').includes('flyTo(135.5')).toBe(true);
  });

  it('a tapped city dot on the globe flies there too', async () => {
    await explore({ country: 'JPN' });
    await fromGlobe({ type: 'candidate', id: '1850147', name: 'Tokyo', lat: 35.69, lng: 139.69 });
    expect(last('flyTo(').includes('flyTo(139.6')).toBe(true);
  });

  it('the search covers every city of the country, not only the tiles', async () => {
    await explore({ country: 'JPN' });
    expect(screen.queryByRole('button', { name: 'Nara-shi' })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Search cities in Japan'), 'nara');
    await press('Nara-shi');
    expect(last('flyTo(').includes('flyTo(135.8')).toBe(true);
    // Picking a result clears the search and brings the tiles back.
    expect(screen.getByRole('button', { name: 'Osaka' })).toBeTruthy();
  });

  it('a search with no match says so', async () => {
    await explore({ country: 'JPN' });
    await fireEvent.changeText(screen.getByLabelText('Search cities in Japan'), 'paris');
    expect(screen.getByText('No city in Japan matches “paris”.')).toBeTruthy();
  });

  it('Share your itinerary says it is coming', async () => {
    await explore({ country: 'JPN' });
    expect(screen.queryByText('Coming soon')).toBeNull();
    await press('Share your itinerary');
    expect(screen.getByText('Coming soon')).toBeTruthy();
  });

  it('tapping another country on the globe switches to it', async () => {
    await explore({ country: 'JPN' });
    await fromGlobe({ type: 'country', iso: 'KOR', name: 'South Korea', visited: false });
    expect(mockSetParams).toHaveBeenLastCalledWith({ country: 'KOR' });
  });

  it('All of Explore goes back, and the globe pulls back and loses the outline', async () => {
    const { again } = await explore({ country: 'JPN' });
    await press('All of Explore');
    expect(mockSetParams).toHaveBeenLastCalledWith({ country: undefined });
    const cleared = calls('clearSelection()').length;
    const homes = calls('goHome()').length;
    mockParams = {};
    await again();
    expect(screen.getByRole('header', { name: 'Explore' })).toBeTruthy();
    expect(calls('clearSelection()').length).toBe(cleared + 1);
    expect(calls('goHome()').length).toBe(homes + 1);
    expect(last('setData').includes('"candidates":[]')).toBe(true);
  });

  it('leaving for another tab takes the country’s dots and outline off the globe', async () => {
    const { again } = await explore({ country: 'JPN' });
    const cleared = calls('clearSelection()').length;
    mockPath = '/';
    mockParams = {};
    await again();
    expect(screen.getByText('Your trips')).toBeTruthy();
    expect(last('setData').includes('"candidates":[]')).toBe(true);
    expect(calls('clearSelection()').length).toBeGreaterThan(cleared);
  });

  it('a place with no cities listed still gets its page', async () => {
    await explore({ country: 'ATA' });
    expect(screen.getByText('Exploring Antarctica')).toBeTruthy();
    expect(screen.getByText('No cities listed here yet.')).toBeTruthy();
  });

  it('an unknown country code is Explore with no country', async () => {
    await explore({ country: 'ZZZ' });
    expect(screen.getByRole('header', { name: 'Explore' })).toBeTruthy();
    expect(calls('focusCountry(')).toHaveLength(0);
  });
});
