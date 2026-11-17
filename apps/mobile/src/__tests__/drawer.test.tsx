import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { DeviceEventEmitter, StyleSheet, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Drawer } from '@/ui/drawer';
import { ModeProvider } from '@/ui/theme';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Harness({ onChange }: { onChange: (i: number) => void }) {
  const [index, setIndex] = useState(0);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={metrics}>
        <ModeProvider mode="home">
          <Drawer
            heights={[300, 700]}
            index={index}
            onIndexChange={(i) => {
              onChange(i);
              setIndex(i);
            }}
            label="trip list"
            header={<Text>Your trips</Text>}
          >
            <Text>Goa long weekend</Text>
          </Drawer>
        </ModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

describe('Drawer (Plan 66)', () => {
  it('shows its header and content, and the handle raises then lowers it', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    expect(screen.getByText('Your trips')).toBeTruthy();
    expect(screen.getByText('Goa long weekend')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Expand trip list' }));
    expect(onChange).toHaveBeenLastCalledWith(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Collapse trip list' }));
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('only scrolls its content when fully raised', async () => {
    await render(<Harness onChange={() => {}} />);
    expect(screen.getByTestId('drawer-scroll').props.scrollEnabled).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Expand trip list' }));
    expect(screen.getByTestId('drawer-scroll').props.scrollEnabled).toBe(true);
  });

  it('leaves room under its content for the keyboard, so the last rows can be scrolled into view', async () => {
    await render(<Harness onChange={() => {}} />);
    const pad = () =>
      StyleSheet.flatten(screen.getByTestId('drawer-scroll').props.contentContainerStyle)
        .paddingBottom as number;
    const before = pad();
    await act(async () => {
      DeviceEventEmitter.emit('keyboardDidShow', { endCoordinates: { height: 300 } });
    });
    expect(pad()).toBe(before + 300);
    await act(async () => {
      DeviceEventEmitter.emit('keyboardDidHide', {});
    });
    expect(pad()).toBe(before);
  });
});
