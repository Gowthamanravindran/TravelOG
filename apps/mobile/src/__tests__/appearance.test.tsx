import { themeFor } from '@travelog/ui';
import { createProject, createTrip, setSetting } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import StudioEditorScreen from '@/app/trip/[id]/studio/[projectId]';
import { ErrorScreen } from '@/components/error-screen';
import { useMutate } from '@/data/provider';
import {
  DEFAULT_APPEARANCE,
  readAppearance,
  resolveScheme,
  saveAppearance,
} from '@/lib/appearance';
import { makeDb, withData } from '@/testing/test-utils';
import { useTheme } from '@/ui/theme';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));

describe('appearance setting', () => {
  it('appearance falls back on bad stored values', () => {
    const db = makeDb();
    setSetting(db, 'appearance.theme', 'neon');
    setSetting(db, 'appearance.mode', 'dim');
    expect(readAppearance(db)).toEqual(DEFAULT_APPEARANCE);
    expect(DEFAULT_APPEARANCE).toEqual({ theme: 'sunset', mode: 'system' });
  });

  it('saveAppearance round-trips', () => {
    const db = makeDb();
    saveAppearance(db, { theme: 'block', mode: 'dark' });
    expect(readAppearance(db)).toEqual({ theme: 'block', mode: 'dark' });
    saveAppearance(db, { mode: 'light' });
    expect(readAppearance(db)).toEqual({ theme: 'block', mode: 'light' });
  });

  it('resolveScheme', () => {
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });

  it('useTheme follows the saved choice', async () => {
    const db = makeDb();
    saveAppearance(db, { theme: 'block', mode: 'light' });
    function Probe() {
      const t = useTheme();
      const mutate = useMutate();
      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => mutate((d) => saveAppearance(d, { mode: 'dark' }))}
        >
          <Text>{t.bg}</Text>
        </Pressable>
      );
    }
    await render(withData(db, <Probe />, 'plan'));
    expect(screen.getByText('#C6D9FF')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button'));
    expect(screen.getByText('#15254A')).toBeTruthy();
  });

  it('studio stays dark in light mode', async () => {
    const db = makeDb();
    saveAppearance(db, { theme: 'block', mode: 'light' });
    const trip = createTrip(
      db,
      {
        title: 'Goa',
        destination: 'Goa',
        startDate: '2026-07-12',
        endDate: '2026-07-14',
        timeZone: 'Asia/Kolkata',
      },
      { displayName: 'You' },
    );
    const project = createProject(db, {
      tripId: trip.id,
      format: 'post',
      slides: 2,
      template: 'bridge',
    });
    mockParams = { id: trip.id, projectId: project.id };
    await render(withData(db, <StudioEditorScreen />, 'trip'));
    const backgrounds = new Set<string>();
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return;
      const n = node as { props?: { style?: unknown }; children?: unknown[] };
      for (const st of [n.props?.style].flat(Infinity) as { backgroundColor?: string }[])
        if (st && typeof st.backgroundColor === 'string') backgrounds.add(st.backgroundColor);
      n.children?.forEach(walk);
    };
    walk(screen.toJSON());
    expect(backgrounds).toContain(themeFor('block', 'trip', 'dark').bg);
    expect(backgrounds).not.toContain(themeFor('block', 'trip', 'light').bg);
  });

  it('error screen renders without AppearanceProvider', async () => {
    await render(<ErrorScreen error={new Error('x')} retry={async () => {}} />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });
});
