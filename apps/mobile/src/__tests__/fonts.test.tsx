import { font } from '@travelog/ui';
import { act, render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Text } from 'react-native';

import { FONT_ASSETS, FONT_TIMEOUT_MS, FontGate } from '@/lib/fonts';

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(), preventAutoHideAsync: jest.fn() }));

describe('fonts', () => {
  it('every face the type tokens use is loaded', () => {
    for (const role of ['display', 'text'] as const)
      for (const w of [400, 500, 600, 700, 800] as const)
        expect(Object.keys(FONT_ASSETS)).toContain(font(role, w).fontFamily);
  });

  it('renders children when fonts fail', async () => {
    await render(
      <FontGate fonts={[false, new Error('missing font')]} dataReady>
        <Text>App content</Text>
      </FontGate>,
    );
    expect(screen.getByText('App content')).toBeTruthy();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('waits while fonts are still loading', async () => {
    await render(
      <FontGate fonts={[false, null]} dataReady>
        <Text>App content</Text>
      </FontGate>,
    );
    expect(screen.queryByText('App content')).toBeNull();
  });

  it('opens anyway if the fonts stall (no splash hang)', async () => {
    jest.useFakeTimers();
    try {
      await render(
        <FontGate fonts={[false, null]} dataReady>
          <Text>App content</Text>
        </FontGate>,
      );
      expect(screen.queryByText('App content')).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(FONT_TIMEOUT_MS);
      });
      expect(screen.getByText('App content')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
