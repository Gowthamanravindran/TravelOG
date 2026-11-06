import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomSheet } from '@/ui/bottom-sheet';
import { InsetView } from '@/ui/inset-view';
import { ModeProvider } from '@/ui/theme';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const wrap = (ui: React.ReactNode) => (
  <SafeAreaProvider initialMetrics={metrics}>
    <ModeProvider mode="home">{ui}</ModeProvider>
  </SafeAreaProvider>
);

describe('BottomSheet (Plan 33)', () => {
  it('shows its content when open and closes from the backdrop', async () => {
    const onClose = jest.fn();
    await render(
      wrap(
        <BottomSheet visible onClose={onClose} closeLabel="Close calendar">
          <Text>Pick a day</Text>
        </BottomSheet>,
      ),
    );
    expect(screen.getByText('Pick a day')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Close calendar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("can't be dismissed while busy", async () => {
    const onClose = jest.fn();
    await render(
      wrap(
        <BottomSheet visible onClose={onClose} dismissable={false}>
          <Text>Reading…</Text>
        </BottomSheet>,
      ),
    );
    await fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('draws nothing when closed', async () => {
    await render(
      wrap(
        <BottomSheet visible={false} onClose={jest.fn()}>
          <Text>Hidden</Text>
        </BottomSheet>,
      ),
    );
    expect(screen.queryByText('Hidden')).toBeNull();
  });
});

describe('InsetView', () => {
  it('pads by the app-wide insets, on top of its own padding', async () => {
    await render(
      wrap(
        <InsetView testID="page" edges={['top', 'bottom']} style={{ padding: 10 }}>
          <Text>Body</Text>
        </InsetView>,
      ),
    );
    const style = StyleSheet.flatten(screen.getByTestId('page').props.style);
    expect(style).toMatchObject({ paddingTop: 57, paddingBottom: 44 });
    expect(style.paddingLeft).toBeUndefined();
  });
});
