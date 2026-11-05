import { font } from '@travelog/ui';
import { render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Text } from 'react-native';

import { FONT_ASSETS, FontGate } from '@/lib/fonts';

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
});
