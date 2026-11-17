import {
  localDateIn,
  monthGrid,
  monthOf,
  monthTitle,
  rangeRole,
  shiftMonth,
  tapRange,
  WEEKDAYS,
  type DateRange,
} from '@travelog/core';
import { font, type } from '@travelog/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { shortDate } from '@/lib/format';

import { Icon } from './icon';
import { useTheme } from './theme';

type Month = { year: number; month: number };

/** "12 Mar 2027": how a day is read out and shown in summaries. */
export const prettyDay = (d: string) => `${shortDate(d)} ${d.slice(0, 4)}`;

const todayHere = () =>
  localDateIn(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata');

/**
 * One month of days with the picked day or range marked, and arrows to page months. The
 * calendar sheet (Plan 18) and the inline range calendar (Plan 67) both draw this.
 */
export function CalendarMonth({
  picked,
  month,
  onMonthChange,
  onTap,
}: {
  picked: DateRange;
  month: Month;
  onMonthChange: (month: Month) => void;
  onTap: (date: string) => void;
}) {
  const t = useTheme();
  const today = todayHere();
  return (
    <View>
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => onMonthChange(shiftMonth(month, -1))}
          hitSlop={10}
          style={[styles.navBtn, { backgroundColor: t.surface2 }]}
        >
          <Icon name="left" size={20} color={t.ink} />
        </Pressable>
        <Text style={[type.headline, { color: t.ink }]}>{monthTitle(month)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => onMonthChange(shiftMonth(month, 1))}
          hitSlop={10}
          style={[styles.navBtn, { backgroundColor: t.surface2 }]}
        >
          <Icon name="right" size={20} color={t.ink} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={[type.caption, styles.weekday, { color: t.ink2 }]}>
            {w.slice(0, 2)}
          </Text>
        ))}
      </View>
      {monthGrid(month).map((week) => (
        <View key={week[0]!.date} style={styles.week}>
          {week.map(({ date, inMonth }) => {
            const role = rangeRole(picked, date);
            const edge = role === 'start' || role === 'end' || role === 'single';
            return (
              <View
                key={date}
                style={[
                  styles.cell,
                  role === 'between' && { backgroundColor: t.accentSoft },
                  role === 'start' && {
                    backgroundColor: t.accentSoft,
                    borderTopLeftRadius: 20,
                    borderBottomLeftRadius: 20,
                  },
                  role === 'end' && {
                    backgroundColor: t.accentSoft,
                    borderTopRightRadius: 20,
                    borderBottomRightRadius: 20,
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={prettyDay(date)}
                  accessibilityState={{ selected: !!role }}
                  onPress={() => onTap(date)}
                  // 40 pt drawn, 44 pt to touch.
                  hitSlop={2}
                  style={[
                    styles.day,
                    edge && { backgroundColor: t.accent },
                    !edge && date === today && { borderWidth: 1.5, borderColor: t.accent },
                  ]}
                >
                  <Text
                    style={[
                      type.body,
                      {
                        color: edge ? t.onAccent : inMonth ? t.ink : t.ink2,
                        opacity: inMonth || edge ? 1 : 0.45,
                        ...font('text', edge ? 600 : 400),
                      },
                    ]}
                  >
                    {Number(date.slice(8))}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * A start–end calendar that sits in the page (Plan 67): tap the first day, then the last.
 * A tap before the first day moves the first day; a tap once both are set starts again.
 * `''` means not set. It opens on the start's month, else `initialMonth` ("2027-03"), else today's.
 */
export function RangeCalendar({
  start,
  end,
  onChange,
  initialMonth,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  initialMonth?: string;
}) {
  const [month, setMonth] = useState<Month>(() =>
    monthOf(start || (initialMonth ? `${initialMonth}-01` : todayHere())),
  );
  const picked: DateRange = { start: start || null, end: end || null };
  return (
    <CalendarMonth
      picked={picked}
      month={month}
      onMonthChange={setMonth}
      onTap={(date) => {
        const next = tapRange(picked, date);
        onChange(next.start ?? '', next.end ?? '');
      }}
    />
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
