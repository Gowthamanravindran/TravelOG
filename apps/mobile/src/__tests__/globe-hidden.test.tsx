import { saveLocalProfile } from '@travelog/db';
import { act, render } from '@testing-library/react-native';

import HomeLayout from '@/app/(home)/_layout';
import { globeProblem } from '@/lib/runtime';
import { makeDb, withData } from '@/testing/test-utils';

// While a trip (or anything else) is open over the tabs, the globe is out of sight: it must
// not reload or count a slow start then, which made coming back slow and the globe redraw
// every time (Plan 89).

let mockPath = '/';
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
    setParams: jest.fn(),
  }),
  usePathname: () => mockPath,
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
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
  hasGlobe: () => true,
}));
// The clock runs forward here; the star flight's frames are not what is being tested.
jest.mock('@/ui/motion', () => ({
  ...jest.requireActual('@/ui/motion'),
  useMotionOk: () => false,
}));

type MockWebView = {
  injected: string[];
  props: { onMessage: (e: { nativeEvent: { data: string } }) => void };
};
const views = () => (global as unknown as { mockWebViews: MockWebView[] }).mockWebViews;
const page = () => views()[0]!;
const send = (msg: object) =>
  act(async () => page().props.onMessage({ nativeEvent: { data: JSON.stringify(msg) } }));
const ready = () => send({ type: 'ready', ms: 1, quality: 'high', pixelRatio: 2 });
const last = (name: string) =>
  page()
    .injected.filter((js) => js.includes(name))
    .at(-1) ?? '';
const wait = (ms: number) => act(async () => jest.advanceTimersByTime(ms));

let db: ReturnType<typeof makeDb>;
const tree = () => withData(db, <HomeLayout />);
beforeEach(() => {
  jest.useFakeTimers();
  db = makeDb();
  saveLocalProfile(db, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
  mockPath = '/';
});
afterEach(() => jest.useRealTimers());

describe('the globe while a trip is open over it (Plan 89)', () => {
  it('is told it is hidden, and shown again on coming back', async () => {
    const view = await render(tree());
    await ready();
    mockPath = '/trip/abc';
    await view.rerender(tree());
    expect(last('setVisible(')).toContain('setVisible(false)');
    mockPath = '/';
    await view.rerender(tree());
    expect(last('setVisible(')).toContain('setVisible(true)');
  });

  it('a crash reported while hidden waits until the globe is in sight again', async () => {
    const view = await render(tree());
    await ready();
    const first = page();
    mockPath = '/trip/abc';
    await view.rerender(tree());
    await send({ type: 'crash', reason: 'webglcontextlost' });
    await wait(10_000);
    expect(page()).toBe(first);
    mockPath = '/';
    await view.rerender(tree());
    expect(page()).not.toBe(first);
  });

  it('a slow start does not count while hidden; it does once in sight', async () => {
    mockPath = '/trip/abc';
    const view = await render(tree());
    const first = page();
    await wait(20_000);
    expect(page()).toBe(first);
    expect(globeProblem()).toBeNull();
    mockPath = '/';
    await view.rerender(tree());
    await wait(7_000);
    expect(page()).not.toBe(first);
  });
});
