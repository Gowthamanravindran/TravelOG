import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { RangeCalendar } from '@/ui/range-calendar';
import { ModeProvider } from '@/ui/theme';

function Harness({ onChange, first = '' }: { onChange: jest.Mock; first?: string }) {
  const [range, setRange] = useState({ start: first, end: '' });
  return (
    <ModeProvider mode="home">
      <RangeCalendar
        start={range.start}
        end={range.end}
        initialMonth="2027-03"
        onChange={(start, end) => {
          onChange(start, end);
          setRange({ start, end });
        }}
      />
      <Text>{`value:${range.start}..${range.end}`}</Text>
    </ModeProvider>
  );
}

describe('RangeCalendar (Plan 67): a calendar that sits in a panel', () => {
  it('first tap is the first day, the next on or after it is the last day', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    expect(screen.getByText('March 2027')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '12 Mar 2027' }));
    expect(onChange).toHaveBeenLastCalledWith('2027-03-12', '');
    await fireEvent.press(screen.getByRole('button', { name: '18 Mar 2027' }));
    expect(onChange).toHaveBeenLastCalledWith('2027-03-12', '2027-03-18');
    expect(screen.getByRole('button', { name: '15 Mar 2027' }).props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('a tap before the first day moves the first day; a tap after a full range starts again', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} first="2027-03-12" />);
    await fireEvent.press(screen.getByRole('button', { name: '10 Mar 2027' }));
    expect(onChange).toHaveBeenLastCalledWith('2027-03-10', '');
    await fireEvent.press(screen.getByRole('button', { name: '10 Mar 2027' }));
    expect(onChange).toHaveBeenLastCalledWith('2027-03-10', '2027-03-10');
    await fireEvent.press(screen.getByRole('button', { name: '20 Mar 2027' }));
    expect(onChange).toHaveBeenLastCalledWith('2027-03-20', '');
  });

  it('pages between months, so a range can cross a month end', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: '30 Mar 2027' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('April 2027')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '2 Apr 2027' }));
    expect(onChange).toHaveBeenLastCalledWith('2027-03-30', '2027-04-02');
  });
});
