import { tripLengthDays } from '@travelog/core';
import type { Dispatch } from 'react';
import { View } from 'react-native';

import { shortDate } from '@/lib/format';
import type { DraftAction, DraftState } from '@/lib/trip-draft-state';
import { Strong } from '@/ui/kit';
import { RangeCalendar } from '@/ui/range-calendar';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "12 Mar – 18 Mar", or one date when the trip is a single day. */
export function datesText(start: string, end: string): string {
  if (!start) return '';
  return end && end !== start ? `${shortDate(start)} – ${shortDate(end)}` : shortDate(start);
}

/** "12 Mar – 18 Mar · 7 days": the trip's dates and its length, both ends counted. */
export function tripSummary(start: string, end: string): string {
  const days = tripLengthDays(start, end);
  return days ? `${datesText(start, end)} · ${plural(days, 'day')}` : '';
}

/** Step 2, "When?": tap the first day, then the last. */
export function StepDates({
  draft,
  dispatch,
}: {
  draft: DraftState;
  dispatch: Dispatch<DraftAction>;
}) {
  const line =
    tripSummary(draft.startDate, draft.endDate) ||
    (draft.startDate ? 'Now tap the last day' : 'Tap the first day');
  return (
    <View style={{ gap: 12 }}>
      <RangeCalendar
        start={draft.startDate}
        end={draft.endDate}
        onChange={(start, end) => dispatch({ type: 'setDates', start, end })}
      />
      <Strong>{line}</Strong>
    </View>
  );
}
