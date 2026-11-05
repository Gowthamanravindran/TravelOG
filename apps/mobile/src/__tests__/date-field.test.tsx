import { fireEvent, render, screen } from '@testing-library/react-native';
import type React from 'react';
import { useState } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DateField, DateRangeField } from '@/ui/date-field';
import { ModeProvider as Mode } from '@/ui/theme';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
function ModeProvider({ mode, children }: { mode: 'home'; children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <Mode mode={mode}>{children}</Mode>
    </SafeAreaProvider>
  );
}

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));

function RangeHarness() {
  const [r, setR] = useState({ start: '2026-11-15', end: '2026-11-16' });
  return (
    <ModeProvider mode="home">
      <DateRangeField
        label="Dates"
        start={r.start}
        end={r.end}
        onChange={(start, end) => setR({ start, end })}
      />
      <Text>{`value:${r.start}..${r.end}`}</Text>
    </ModeProvider>
  );
}

describe('date fields', () => {
  it('picks a start and end on one calendar', async () => {
    await render(<RangeHarness />);
    await fireEvent.press(screen.getByRole('button', { name: /^Dates:/ }));
    expect(screen.getByText('November 2026')).toBeTruthy();
    // The sheet opens at the current start; tap the 15th then the 20th.
    await fireEvent.press(screen.getByRole('button', { name: '15 Nov 2026' }));
    await fireEvent.press(screen.getByRole('button', { name: '20 Nov 2026' }));
    expect(screen.getByText('15 Nov 2026 – 20 Nov 2026')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText('value:2026-11-15..2026-11-20')).toBeTruthy();
  });

  it('moves between months and picks a single day', async () => {
    const onChange = jest.fn();
    await render(
      <ModeProvider mode="home">
        <DateField label="Starts" value="2026-12-31" onChange={onChange} />
      </ModeProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: /^Starts:/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('January 2027')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '2 Jan 2027' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(onChange).toHaveBeenCalledWith('2027-01-02');
  });
});
