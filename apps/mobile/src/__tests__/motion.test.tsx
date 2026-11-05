import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Pressable, Text } from 'react-native';

import { Appear, CelebrationHost, CountUp, haptic, useCelebrate, useMotionOk } from '@/ui/motion';

let mockReduced = false;
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduced,
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

function MotionProbe() {
  return <Text>{useMotionOk() ? 'moving' : 'still'}</Text>;
}

describe('motion', () => {
  afterEach(() => {
    mockReduced = false;
  });

  it('useMotionOk follows the Reduce motion setting', async () => {
    mockReduced = true;
    await render(<MotionProbe />);
    expect(screen.getByText('still')).toBeTruthy();
  });

  it('Appear renders its children', async () => {
    await render(
      <Appear index={3}>
        <Text>Row</Text>
      </Appear>,
    );
    expect(screen.getByText('Row')).toBeTruthy();
  });

  it('CountUp ends on the exact value', async () => {
    jest.useFakeTimers();
    try {
      await render(<CountUp value={12400} format={(n) => `₹${n}`} />);
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText('₹12400')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('CountUp shows the final value at once when motion is reduced', async () => {
    mockReduced = true;
    await render(<CountUp value={500} format={(n) => `${n} km`} />);
    expect(screen.getByText('500 km')).toBeTruthy();
  });

  it('a celebration shows a check mark and gives one success haptic', async () => {
    function Fire() {
      const celebrate = useCelebrate();
      return (
        <Pressable accessibilityRole="button" onPress={() => celebrate('Trip created')}>
          <Text>Go</Text>
        </Pressable>
      );
    }
    await render(
      <CelebrationHost>
        <Fire />
      </CelebrationHost>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByLabelText('Trip created')).toBeTruthy();
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });

  it('haptic never throws, even if the device refuses', async () => {
    (Haptics.selectionAsync as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error('no')),
    );
    expect(() => haptic('select')).not.toThrow();
  });
});
