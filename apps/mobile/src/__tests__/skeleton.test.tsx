import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { Deferred } from '@/ui/motion';
import { ItinerarySkeleton } from '@/ui/skeleton';
import { makeDb, withData } from '@/testing/test-utils';

let mockReduced = false;
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduced,
}));

/** Plan 46: a heavy screen shows its skeleton at once, then fills in. */
describe('Deferred and the itinerary skeleton', () => {
  afterEach(() => {
    mockReduced = false;
  });

  const ui = (label: string) =>
    withData(
      makeDb(),
      <Deferred fallback={<ItinerarySkeleton />}>
        <Text>{label}</Text>
      </Deferred>,
      'plan',
    );

  it('shows the skeleton first, then the content, and never the skeleton again', async () => {
    const { rerender } = await render(ui('Day 1 plan'));
    expect(screen.getByLabelText('Loading your plan')).toBeTruthy();
    expect(screen.queryByText('Day 1 plan')).toBeNull();
    expect(await screen.findByText('Day 1 plan')).toBeTruthy();
    expect(screen.queryByLabelText('Loading your plan')).toBeNull();
    await rerender(ui('Day 2 plan'));
    expect(screen.getByText('Day 2 plan')).toBeTruthy();
    expect(screen.queryByLabelText('Loading your plan')).toBeNull();
  });

  it('the skeleton has the plan’s shape: route, day chips, stops', async () => {
    await render(withData(makeDb(), <ItinerarySkeleton />, 'plan'));
    // 1 route bar + 5 chips + 3 stops × (time + tile + 2 lines).
    expect(screen.getAllByTestId('shimmer')).toHaveLength(1 + 5 + 3 * 4);
  });

  it('stays still with Reduce motion on', async () => {
    mockReduced = true;
    await render(withData(makeDb(), <ItinerarySkeleton />, 'plan'));
    for (const s of screen.getAllByTestId('shimmer'))
      expect(StyleSheet.flatten(s.props.style).opacity ?? 1).toBe(1);
  });
});
