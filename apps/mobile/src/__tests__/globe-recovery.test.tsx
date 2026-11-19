import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { Globe } from '@/components/globe';
import { globeProblem } from '@/lib/runtime';

// The map page can fail to start (no drawing context, the page going silent). The globe then
// tries again by itself, and remembers what went wrong so Settings → About can say (Plan 77).

// These tests run the clock forward by up to a minute; with motion on, every frame of the
// streaming stars would be stepped through. The stars' own tests are in star-warp.test.tsx.
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
const fatal = (message = 'Map could not start: no WebGL') =>
  send({ type: 'error', fatal: true, message });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('the globe recovers from a failed start (Plan 77)', () => {
  it('a failed start loads the page again instead of staying empty', async () => {
    await render(<Globe />);
    const first = page();
    await fatal();
    await act(async () => jest.advanceTimersByTime(1500));
    expect(views()).toHaveLength(1);
    expect(page()).not.toBe(first);
    await ready();
    expect(screen.getByLabelText('Globe')).toBeTruthy();
  });

  it('gives up after three failed starts in a row, and says why', async () => {
    await render(<Globe />);
    for (let i = 0; i < 2; i++) {
      await fatal('Map could not start: no WebGL');
      await act(async () => jest.advanceTimersByTime(1500));
      expect(views()).toHaveLength(1);
    }
    await fatal('Map could not start: no WebGL');
    await act(async () => jest.advanceTimersByTime(1500));
    expect(views()).toHaveLength(0);
    expect(globeProblem()).toMatch(/no WebGL/);
  });

  it('a page that goes 5 s without any progress is loaded again, naming the step it stalled at', async () => {
    await render(<Globe />);
    const first = page();
    await send({ type: 'progress', step: 'map', ms: 900 });
    await act(async () => jest.advanceTimersByTime(4_900));
    expect(page()).toBe(first);
    await act(async () => jest.advanceTimersByTime(1_200)); // 5 s silent, then the 1 s retry wait
    await act(async () => jest.advanceTimersByTime(1_000));
    expect(page()).not.toBe(first);
    expect(globeProblem()).toMatch(/no progress for 5 s after “map”/);
  });

  it('a slow start that keeps making progress is left to finish', async () => {
    await render(<Globe />);
    const first = page();
    for (const step of ['page', 'data', 'library', 'map', 'loaded']) {
      await act(async () => jest.advanceTimersByTime(4_000));
      await send({ type: 'progress', step, ms: 1 });
    }
    await act(async () => jest.advanceTimersByTime(4_000));
    await ready();
    expect(page()).toBe(first);
  });

  it('a page that never sends anything is loaded again after 5 s', async () => {
    await render(<Globe />);
    const first = page();
    await act(async () => jest.advanceTimersByTime(7_000));
    expect(page()).not.toBe(first);
    expect(globeProblem()).toMatch(/no progress for 5 s after “start”/);
  });

  it('while it loads, a starry sky shows; the words only if it takes a while (Plan 80)', async () => {
    await render(<Globe />);
    expect(screen.getByTestId('star-warp')).toBeTruthy();
    expect(screen.queryByText('Loading the globe…')).toBeNull();
    await send({ type: 'progress', step: 'map', ms: 1 });
    await act(async () => jest.advanceTimersByTime(3_100));
    expect(screen.getByText('Loading the globe…')).toBeTruthy();
  });

  it('when ready, the globe is told to arrive after everything else it is sent', async () => {
    await render(<Globe bottomInset={300} />);
    await ready();
    const js = page().injected;
    const arrive = js.findIndex((c) => c.includes('window.globe.arrive('));
    expect(arrive).toBeGreaterThan(-1);
    expect(arrive).toBeGreaterThan(js.findIndex((c) => c.includes('setInset(300)')));
    expect(arrive).toBe(js.length - 1);
  });

  it('the sky fades away once the globe is there, and comes back if it has to load again', async () => {
    await render(<Globe />);
    await ready();
    await act(async () => jest.advanceTimersByTime(800));
    expect(screen.queryByTestId('star-warp')).toBeNull();
    await fatal();
    await act(async () => jest.advanceTimersByTime(1500));
    expect(screen.getByTestId('star-warp')).toBeTruthy();
  });

  it('after giving up it says so and offers to try again', async () => {
    await render(<Globe />);
    for (let i = 0; i < 3; i++) {
      await fatal();
      await act(async () => jest.advanceTimersByTime(1500));
    }
    expect(views()).toHaveLength(0);
    expect(screen.getByText('The globe couldn’t load.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(views()).toHaveLength(1);
    await ready();
    expect(screen.queryByText('The globe couldn’t load.')).toBeNull();
  });

  it('once ready, a slow moment later does not reload it', async () => {
    await render(<Globe />);
    const first = page();
    await ready();
    await act(async () => jest.advanceTimersByTime(60_000));
    expect(page()).toBe(first);
  });
});
