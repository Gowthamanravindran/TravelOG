import { createTrip } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { centreOffset, ItineraryView } from '@/components/itinerary-view';
import { makeDb, withData } from '@/testing/test-utils';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
}));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return { ...actual, useReducedMotion: jest.fn(() => false) };
});

describe('centreOffset (Plan 43)', () => {
  it('centres a chip, but never scrolls past either end', () => {
    // 15 chips of 80 pt with 8 pt gaps; the strip shows 358 pt.
    const contentW = 15 * 88 - 8;
    expect(centreOffset(9 * 88, 80, 358, contentW)).toBe(9 * 88 + 40 - 179);
    expect(centreOffset(0, 80, 358, contentW)).toBe(0);
    expect(centreOffset(14 * 88, 80, 358, contentW)).toBe(contentW - 358);
    expect(centreOffset(0, 80, 358, 200)).toBe(0);
  });
});

describe('today’s day in the middle (Plan 43)', () => {
  const scrollTo = (ScrollView as unknown as { prototype: { scrollTo: jest.Mock } }).prototype
    .scrollTo;

  async function open() {
    const db = makeDb();
    const { id } = createTrip(
      db,
      { title: 'Europe', timeZone: 'Asia/Kolkata', startDate: '2026-11-01', endDate: '2026-11-15' },
      { displayName: 'G' },
    );
    // Day 10 is 10 Nov.
    await render(withData(db, <ItineraryView tripId={id} initialDay="2026-11-10" />, 'plan'));
    const days = screen.getAllByRole('tab');
    // The strip and each chip report their size, as the phone does after drawing.
    const strip = screen.getByTestId('day-strip');
    for (const [i, d] of days.entries())
      await fireEvent(d, 'layout', {
        nativeEvent: { layout: { x: i * 88, y: 0, width: 80, height: 60 } },
      });
    await fireEvent(strip, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 358, height: 60 } },
    });
    return days;
  }

  beforeEach(() => scrollTo.mockClear());

  it('glides the strip so today sits in the centre, once', async () => {
    const days = await open();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ x: 9 * 88 + 40 - 179, animated: true });
    // A tap centres the tapped day too.
    await fireEvent.press(days[11]!);
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 11 * 88 + 40 - 179, animated: true });
  });

  it('jumps without animating when Reduce motion is on', async () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    await open();
    expect(scrollTo).toHaveBeenCalledWith({ x: 9 * 88 + 40 - 179, animated: false });
    (useReducedMotion as jest.Mock).mockReturnValue(false);
  });
});
