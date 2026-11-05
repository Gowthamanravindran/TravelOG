import { themeFor } from '@travelog/ui';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { saveAppearance } from '@/lib/appearance';
import { makeDb, withData } from '@/testing/test-utils';
import { Button, Chip, IconTile } from '@/ui/kit';
import { ModeTabBar } from '@/ui/tab-bar';

const flat = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (typeof el.props.style === 'function'
      ? (el.props.style as (s: { pressed: boolean }) => unknown)({ pressed: false })
      : el.props.style) as any,
  ) as Record<string, unknown>;

async function inTheme(theme: 'sunset' | 'block', ui: React.ReactNode) {
  const db = makeDb();
  saveAppearance(db, { theme, mode: 'light' });
  await render(withData(db, ui, 'home'));
}

describe('kit', () => {
  it('Button primary uses the accent and a pill', async () => {
    await inTheme('sunset', <Button label="Add expense" onPress={() => {}} />);
    const s = flat(screen.getByRole('button', { name: 'Add expense' }));
    expect(s.backgroundColor).toBe('#B32F18');
    expect(s.borderRadius).toBe(999);
  });

  it('Button secondary is outlined', async () => {
    await inTheme('sunset', <Button label="Set budget" variant="secondary" onPress={() => {}} />);
    const s = flat(screen.getByRole('button', { name: 'Set budget' }));
    expect(s.backgroundColor).toBe('transparent');
    expect(s.borderWidth).toBe(1);
  });

  it('IconTile family uses theme tiles', async () => {
    await inTheme('block', <IconTile icon="flight" family="sea" />);
    expect(flat(screen.getByTestId('icon-tile')).backgroundColor).toBe('#0B6584');
  });

  it('Chip selected uses the tint', async () => {
    await inTheme('sunset', <Chip label="Day 1" selected onPress={() => {}} />);
    const s = flat(screen.getByRole('button', { name: 'Day 1' }));
    expect(s.backgroundColor).toBe(themeFor('sunset', 'home', 'light').accentSoft);
  });

  it('tab bar in Colour block is black', async () => {
    const state = {
      index: 0,
      routes: [
        { key: 'a', name: 'index' },
        { key: 'b', name: 'profile' },
      ],
    };
    const metrics = {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    };
    await inTheme(
      'block',
      <SafeAreaProvider initialMetrics={metrics}>
        <ModeTabBar
          {...({ state, navigateToTab: () => {} } as unknown as Parameters<typeof ModeTabBar>[0])}
          tabs={[
            { name: 'index', label: 'Trips', icon: 'trips' },
            { name: 'profile', label: 'Profile', icon: 'profile' },
          ]}
        />
      </SafeAreaProvider>,
    );
    expect(flat(screen.getByTestId('tab-bar')).backgroundColor).toBe('#141414');
  });
});
