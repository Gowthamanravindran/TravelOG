import { act, render, screen } from '@testing-library/react-native';

import { Globe } from '@/components/globe';
import { globeProblem } from '@/lib/runtime';

// The map page can fail to start (no drawing context, the page going silent). The globe then
// tries again by itself, and remembers what went wrong so Settings → About can say (Plan 77).

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

  it('a page that never says it is ready is loaded again', async () => {
    await render(<Globe />);
    const first = page();
    await act(async () => jest.advanceTimersByTime(16_500));
    expect(page()).not.toBe(first);
    expect(globeProblem()).toMatch(/did not start within 15 s/);
  });

  it('once ready, a slow moment later does not reload it', async () => {
    await render(<Globe />);
    const first = page();
    await ready();
    await act(async () => jest.advanceTimersByTime(60_000));
    expect(page()).toBe(first);
  });
});
