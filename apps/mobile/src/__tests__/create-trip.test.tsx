import { monthOf, shiftMonth, localDateIn, type Place } from '@travelog/core';
import { listStops, listTrips, saveLocalProfile, savePlaces } from '@travelog/db';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';

import HomeLayout from '@/app/(home)/_layout';
import { closeCreateFlow, createFlowOpen } from '@/lib/create-flow';
import { hasGlobe } from '@/lib/runtime';
import { tripHref } from '@/lib/trip-route';
import { makeDb, withData } from '@/testing/test-utils';
import { prettyDay } from '@/ui/range-calendar';

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
  hasGlobe: jest.fn(() => true),
}));
(hasGlobe as jest.Mock).mockReturnValue(true);

type MockWebView = {
  injected: string[];
  props: {
    onMessage: (e: { nativeEvent: { data: string } }) => void;
    onContentProcessDidTerminate: () => void;
  };
};
const webview = () => (global as unknown as { mockWebViews: MockWebView[] }).mockWebViews[0]!;
/** A message from the map page, as the web view delivers it. */
const fromGlobe = (msg: object) =>
  act(async () => webview().props.onMessage({ nativeEvent: { data: JSON.stringify(msg) } }));

const country = (code: string, name: string, currency: string, timeZone: string): Place => ({
  id: `ctry:${code}`,
  kind: 'country',
  name,
  countryCode: code,
  countryName: name,
  region: null,
  continent: 'Asia',
  lat: 0,
  lng: 0,
  timeZone,
  currency,
  population: 1,
  boost: 0,
  aliases: [],
  source: 'geonames',
});

function db() {
  const d = makeDb();
  saveLocalProfile(d, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
  savePlaces(d, [
    country('JP', 'Japan', 'JPY', 'Asia/Tokyo'),
    country('KR', 'South Korea', 'KRW', 'Asia/Seoul'),
  ]);
  return d;
}

// The calendar opens on today's month; the trip is the 12th to the 18th of next month.
const next = shiftMonth(monthOf(localDateIn('Asia/Kolkata')), 1);
const day = (d: number) =>
  `${next.year}-${String(next.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const search = (label: string, text: string) =>
  fireEvent.changeText(screen.getByLabelText(label), text);

async function toDatesStep() {
  await press('Create a trip');
  await search('Search a country or city', 'tok');
  await press('Add Tokyo, Japan');
  await press('Let’s go →');
}
async function toCitiesStep() {
  await toDatesStep();
  await press('Next month');
  await press(prettyDay(day(12)));
  await press(prettyDay(day(18)));
  await press('Next →');
}

beforeEach(() => {
  mockPath = '/';
  mockParams = {};
  mockPush.mockClear();
  mockNavigate.mockClear();
  closeCreateFlow();
});

describe('creating a trip on the globe, by search and buttons alone (Plan 67)', () => {
  it('goes countries → dates → cities → days and saves the trip with its stops', async () => {
    const d = db();
    await render(withData(d, <HomeLayout />));
    await press('Create a trip');
    expect(screen.getByText('Where to?')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Let’s go →' })).toBeNull();

    // Typing a city adds it and its country straight away.
    await search('Search a country or city', 'tok');
    await press('Add Tokyo, Japan');
    expect(screen.getByRole('button', { name: 'Remove Japan' })).toBeTruthy();
    await press('Let’s go →');

    expect(screen.getByText('When?')).toBeTruthy();
    expect(screen.getByText('Tap the first day')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next →' })).toBeNull();
    await press('Next month');
    await press(prettyDay(day(12)));
    expect(screen.getByText('Now tap the last day')).toBeTruthy();
    await press(prettyDay(day(18)));
    expect(screen.getByText(/· 7 days$/)).toBeTruthy();
    await press('Next →');

    expect(screen.getByText('Pick your stops')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove Tokyo' })).toBeTruthy();
    await search('Search a city', 'seo');
    await press('Add Seoul, South Korea');
    expect(screen.getByRole('button', { name: 'Remove Seoul' })).toBeTruthy();
    await press('Next →');

    expect(screen.getByLabelText('Trip name').props.value).toBe('Exploring Asia');
    expect(screen.getByText('2 of 7 days')).toBeTruthy();
    expect(screen.getByText('5 days left to place')).toBeTruthy();
    const create = () => screen.getByRole('button', { name: 'Create trip' });
    expect(create().props.accessibilityState).toMatchObject({ disabled: true });

    await press('One day more in Tokyo');
    await press('One day more in Tokyo');
    await press('One day more in Seoul');
    await press('One day more in Seoul');
    await press('One day more in Seoul');
    expect(screen.getByText('7 of 7 days')).toBeTruthy();
    expect(screen.getByText('All days placed')).toBeTruthy();
    expect(create().props.accessibilityState).toMatchObject({ disabled: false });

    await press('One day more in Seoul');
    expect(screen.getByText('1 day too many')).toBeTruthy();
    expect(create().props.accessibilityState).toMatchObject({ disabled: true });
    await press('One day less in Seoul');

    await press('Create trip');
    const [trip] = listTrips(d);
    expect(trip).toMatchObject({
      title: 'Exploring Asia',
      startDate: day(12),
      endDate: day(18),
      destination: 'Tokyo, Seoul',
      currency: 'JPY',
      timeZone: 'Asia/Tokyo',
    });
    expect(listStops(d, trip!.id).map((s) => [s.placeId, s.startDate, s.endDate])).toEqual([
      ['gn:1850147', day(12), day(15)],
      ['gn:1835848', day(15), day(18)],
    ]);
    expect(mockPush).toHaveBeenCalledWith(tripHref(trip!));
    expect(createFlowOpen()).toBe(false);
  });

  it('a typed trip name is kept, and can be cleared while typing', async () => {
    const d = db();
    await render(withData(d, <HomeLayout />));
    await toCitiesStep();
    await press('Next →');
    const name = () => screen.getByLabelText('Trip name');
    expect(name().props.value).toBe('Tokyo trip');
    await fireEvent(name(), 'focus');
    await fireEvent.changeText(name(), '');
    expect(name().props.value).toBe('');
    await fireEvent.changeText(name(), 'Cherry blossoms');
    await fireEvent(name(), 'blur');
    for (let i = 0; i < 6; i++) await press('One day more in Tokyo');
    await press('Create trip');
    expect(listTrips(d)[0]!.title).toBe('Cherry blossoms');
  });

  it('a country with no city is left out, and said so', async () => {
    await render(withData(db(), <HomeLayout />));
    await press('Create a trip');
    await search('Search a country or city', 'tok');
    await press('Add Tokyo, Japan');
    await search('Search a country or city', 'south k');
    await press('Add South Korea');
    await press('Let’s go →');
    await press('Next month');
    await press(prettyDay(day(12)));
    await press(prettyDay(day(18)));
    await press('Next →');
    await press('Next →');
    expect(screen.getByText('No stops in South Korea, so it’s left out')).toBeTruthy();
    expect(screen.getByLabelText('Trip name').props.value).toBe('Tokyo trip');
  });

  it('Back steps back through the flow and then closes it, discarding the draft', async () => {
    await render(withData(db(), <HomeLayout />));
    await toDatesStep();
    await press('Back');
    expect(screen.getByText('Where to?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove Japan' })).toBeTruthy();
    await press('Back');
    expect(createFlowOpen()).toBe(false);
    expect(screen.getByText('Your trips')).toBeTruthy();
    await press('Create a trip');
    expect(screen.queryByRole('button', { name: 'Remove Japan' })).toBeNull();
  });
});

describe('search and the panel', () => {
  it('stepping back while a search field has focus does not hide the next step’s button', async () => {
    await render(withData(db(), <HomeLayout />));
    await toCitiesStep();
    await fireEvent(screen.getByLabelText('Search a city'), 'focus');
    expect(screen.queryByRole('button', { name: 'Next →' })).toBeNull();
    await press('Back');
    expect(screen.getByText('When?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next →' })).toBeTruthy();
  });

  it('closing the keyboard brings the main button back', async () => {
    await render(withData(db(), <HomeLayout />));
    await toCitiesStep();
    await fireEvent(screen.getByLabelText('Search a city'), 'focus');
    expect(screen.queryByRole('button', { name: 'Next →' })).toBeNull();
    await act(async () => {
      DeviceEventEmitter.emit('keyboardDidHide', {});
    });
    expect(screen.getByRole('button', { name: 'Next →' })).toBeTruthy();
  });

  it('searching raises the panel even after it was dragged down', async () => {
    await render(withData(db(), <HomeLayout />));
    await press('Create a trip');
    await press('Expand panel');
    await press('Collapse panel');
    await fireEvent(screen.getByLabelText('Search a country or city'), 'focus');
    expect(screen.getByRole('button', { name: 'Collapse panel' })).toBeTruthy();
  });

  it('more stops than days says what to do, since the days can never match', async () => {
    await render(withData(db(), <HomeLayout />));
    await toDatesStep();
    await press('Next month');
    await press(prettyDay(day(12)));
    await press(prettyDay(day(13)));
    await press('Next →');
    for (const [q, label] of [
      ['kyo', 'Add Kyoto, Japan'],
      ['osa', 'Add Osaka, Japan'],
    ] as const) {
      await search('Search a city', q);
      await press(label);
    }
    await press('Next →');
    expect(screen.getByText('1 day too many')).toBeTruthy();
    expect(
      screen.getByText('More stops than days. Remove a stop, or go back and add days.'),
    ).toBeTruthy();
  });
});

describe('tapping a country on the home globe (Plan 70)', () => {
  it('opens Explore for that country', async () => {
    await render(withData(db(), <HomeLayout />));
    await fromGlobe({ type: 'ready', ms: 1, quality: 'high', pixelRatio: 2 });
    expect(webview().injected.some((js) => js.includes('setCountryTap(true)'))).toBe(true);
    await fromGlobe({ type: 'country', iso: 'JPN', name: 'Japan', visited: false });
    expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/explore', params: { country: 'JPN' } });
  });

  it('while creating a trip a tap picks the country and does not leave the screen', async () => {
    await render(withData(db(), <HomeLayout />));
    await press('Create a trip');
    await fromGlobe({ type: 'ready', ms: 1, quality: 'high', pixelRatio: 2 });
    await fromGlobe({ type: 'country', iso: 'JPN', name: 'Japan', visited: false });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Remove Japan' })).toBeTruthy();
  });
});

describe('the globe during the flow', () => {
  it('a tapped country is picked, and tapped again is removed', async () => {
    await render(withData(db(), <HomeLayout />));
    await press('Create a trip');
    await fromGlobe({ type: 'ready', ms: 1, quality: 'high', pixelRatio: 2 });
    await fromGlobe({ type: 'country', iso: 'JPN', name: 'Japan', visited: false });
    expect(screen.getByRole('button', { name: 'Remove Japan' })).toBeTruthy();
    expect(webview().injected.some((js) => js.includes('"visited":["JPN"]'))).toBe(true);
    await fromGlobe({ type: 'country', iso: 'JPN', name: 'Japan', visited: true });
    expect(screen.queryByRole('button', { name: 'Remove Japan' })).toBeNull();
  });

  it('shows a country’s best-known cities to tap, and a tapped one becomes a stop', async () => {
    await render(withData(db(), <HomeLayout />));
    await press('Create a trip');
    await fromGlobe({ type: 'ready', ms: 1, quality: 'high', pixelRatio: 2 });
    await fromGlobe({ type: 'country', iso: 'JPN', name: 'Japan', visited: false });
    await press('Let’s go →');
    await press('Next month');
    await press(prettyDay(day(12)));
    await press(prettyDay(day(18)));
    await press('Next →');
    const last = () =>
      webview()
        .injected.filter((js) => js.includes('setData'))
        .at(-1)!;
    expect(last().includes('"candidates":[{"id":"1850147","name":"Tokyo"')).toBe(true);
    expect(webview().injected.some((js) => js.includes('setCountryTap(false)'))).toBe(true);

    // The page reports tile-rounded coordinates; the city is matched by id.
    await fromGlobe({
      type: 'candidate',
      id: '1850147',
      name: 'Tokyo',
      lat: 35.6907,
      lng: 139.6911,
    });
    expect(screen.getByRole('button', { name: 'Remove Tokyo' })).toBeTruthy();
    expect(last().includes('"stops":[{"id":"1850147","name":"Tokyo","lat":35.69')).toBe(true);
    // Tapping the numbered stop takes it off again.
    await fromGlobe({ type: 'place', id: '1850147', name: 'Tokyo', lat: 35.6907, lng: 139.6911 });
    expect(screen.queryByRole('button', { name: 'Remove Tokyo' })).toBeNull();
  });

  it('with several countries, a country chip on the cities step moves the globe to it', async () => {
    await render(withData(db(), <HomeLayout />));
    await press('Create a trip');
    await fromGlobe({ type: 'ready', ms: 1, quality: 'high', pixelRatio: 2 });
    await fromGlobe({ type: 'country', iso: 'JPN', name: 'Japan', visited: false });
    await fromGlobe({ type: 'country', iso: 'KOR', name: 'South Korea', visited: false });
    await press('Let’s go →');
    await press('Next month');
    await press(prettyDay(day(12)));
    await press(prettyDay(day(18)));
    await press('Next →');
    expect(webview().injected.some((js) => js.includes('fitCountries(["JPN","KOR"])'))).toBe(true);
    await press('South Korea');
    expect(webview().injected.at(-1)!.includes('focusCountry("KOR")')).toBe(true);
  });

  it('removing a picked country by its chip clears its outline on the globe', async () => {
    await render(withData(db(), <HomeLayout />));
    await press('Create a trip');
    await fromGlobe({ type: 'ready', ms: 1, quality: 'high', pixelRatio: 2 });
    await fromGlobe({ type: 'country', iso: 'JPN', name: 'Japan', visited: false });
    const cleared = () => webview().injected.filter((js) => js.includes('clearSelection()')).length;
    const before = cleared();
    await press('Remove Japan');
    expect(cleared()).toBe(before + 1);
  });

  it('losing the globe mid-flow loses nothing that was picked', async () => {
    await render(withData(db(), <HomeLayout />));
    await toCitiesStep();
    await act(async () => webview().props.onContentProcessDidTerminate());
    expect(screen.getByText('Pick your stops')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove Tokyo' })).toBeTruthy();
    await fromGlobe({ type: 'error', fatal: true, message: 'Map could not start' });
    await search('Search a city', 'kyo');
    await press('Add Kyoto, Japan');
    await press('Next →');
    expect(screen.getByLabelText('Trip name').props.value).toBe('Japan Trip');
  });
});
