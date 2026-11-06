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
  joinTime,
  roundTo5,
  splitTime,
} from '@travelog/core';
import { font, radius, type } from '@travelog/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { shortDate } from '@/lib/format';

import { BottomSheet } from './bottom-sheet';
import { Icon } from './icon';
import { Button } from './kit';
import { useTheme } from './theme';

/**
 * Date and time inputs (Plan 18). Dates open a calendar sheet; a range field
 * picks start and end on one calendar. Times use the phone's own time picker.
 */

function FieldShell({
  label,
  value,
  placeholder,
  icon,
  onPress,
  onClear,
  hint,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  icon: 'dates' | 'today' | 'event';
  onPress: () => void;
  onClear?: () => void;
  hint?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[type.caption, styles.fieldLabel, { color: t.ink2 }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? 'not set'}`}
        onPress={onPress}
        style={[styles.field, { backgroundColor: t.surface, borderColor: t.line }]}
      >
        <Icon name={icon} size={20} color={value ? t.accent : t.ink2} />
        <Text style={[type.body, { color: value ? t.ink : t.ink2, flex: 1 }]} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        {value && onClear ? (
          <Pressable accessibilityLabel={`Clear ${label}`} hitSlop={10} onPress={onClear}>
            <Icon name="close" size={18} color={t.ink2} />
          </Pressable>
        ) : null}
      </Pressable>
      {hint ? <Text style={[type.caption, { color: t.ink2 }]}>{hint}</Text> : null}
    </View>
  );
}

const pretty = (d: string) => {
  const year = d.slice(0, 4);
  return `${shortDate(d)} ${year}`;
};

/** One date, picked on a calendar. Value is 'YYYY-MM-DD' or '' when not set. */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Pick a date',
  hint,
}: {
  label: string;
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FieldShell
        label={label}
        value={value ? pretty(value) : null}
        placeholder={placeholder}
        icon="event"
        onPress={() => setOpen(true)}
        onClear={() => onChange('')}
        hint={hint}
      />
      <CalendarSheet
        visible={open}
        title={label}
        range={{ start: value || null, end: value || null }}
        mode="single"
        onClose={() => setOpen(false)}
        onDone={(r) => {
          onChange(r.start ?? '');
          setOpen(false);
        }}
      />
    </>
  );
}

/** Start and end on one calendar: tap the first day, then the last. */
export function DateRangeField({
  label,
  start,
  end,
  onChange,
  placeholder = 'Pick the dates',
  hint,
}: {
  label: string;
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const shown = start
    ? end && end !== start
      ? `${pretty(start)} – ${pretty(end)}`
      : pretty(start)
    : null;
  return (
    <>
      <FieldShell
        label={label}
        value={shown}
        placeholder={placeholder}
        icon="dates"
        onPress={() => setOpen(true)}
        onClear={() => onChange('', '')}
        hint={hint}
      />
      <CalendarSheet
        visible={open}
        title={label}
        range={{ start: start || null, end: end || null }}
        mode="range"
        onClose={() => setOpen(false)}
        onDone={(r) => {
          onChange(r.start ?? '', r.end ?? r.start ?? '');
          setOpen(false);
        }}
      />
    </>
  );
}

/** A time 'HH:MM' picked on our own time sheet (works in every build and in Expo Go). */
export function TimeField({
  label,
  value,
  onChange,
  placeholder = 'Add a time',
  hint,
}: {
  label: string;
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FieldShell
        label={label}
        value={value || null}
        placeholder={placeholder}
        icon="today"
        onPress={() => setOpen(true)}
        onClear={() => onChange('')}
        hint={hint}
      />
      <TimeSheet
        visible={open}
        title={label}
        value={value}
        onClose={() => setOpen(false)}
        onDone={(time) => {
          onChange(time);
          setOpen(false);
        }}
      />
    </>
  );
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/** Bottom sheet: tap an hour, tap the minutes (5-minute steps, − / + for exact). */
export function TimeSheet({
  visible,
  title,
  value,
  onClose,
  onDone,
}: {
  visible: boolean;
  title: string;
  value: string;
  onClose: () => void;
  onDone: (time: string) => void;
}) {
  const t = useTheme();
  const initial = () => splitTime(value) ?? { hour: 9, minute: 0 };
  const [picked, setPicked] = useState(initial);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setPicked(initial());
  }

  const cell = (selected: boolean, label: string, a11y: string, onPress: () => void) => (
    <Pressable
      key={a11y}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.timeCell, { backgroundColor: selected ? t.accent : t.surface2 }]}
    >
      <Text
        style={[
          type.body,
          { color: selected ? t.onAccent : t.ink, ...font('text', selected ? 600 : 400) },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
  const step = (by: number) =>
    setPicked((p) => {
      const total = (p.hour * 60 + p.minute + by + 1440) % 1440;
      return { hour: Math.floor(total / 60), minute: total % 60 };
    });

  return (
    <BottomSheet visible={visible} onClose={onClose} closeLabel="Close time picker">
      <Text style={[type.caption, styles.fieldLabel, { color: t.ink2 }]}>{title}</Text>
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="One minute earlier"
          onPress={() => step(-1)}
          hitSlop={10}
          style={[styles.navBtn, { backgroundColor: t.surface2 }]}
        >
          <Icon name="remove" size={20} color={t.ink} />
        </Pressable>
        <Text style={[type.display, { color: t.ink, fontSize: 40, lineHeight: 46 }]}>
          {joinTime(picked.hour, picked.minute)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="One minute later"
          onPress={() => step(1)}
          hitSlop={10}
          style={[styles.navBtn, { backgroundColor: t.surface2 }]}
        >
          <Icon name="add" size={20} color={t.ink} />
        </Pressable>
      </View>
      <Text style={[type.caption, { color: t.ink2 }]}>Hour</Text>
      <View style={styles.timeGrid}>
        {HOURS.map((h) =>
          cell(picked.hour === h, String(h).padStart(2, '0'), `Hour ${h}`, () =>
            setPicked((p) => ({ ...p, hour: h })),
          ),
        )}
      </View>
      <Text style={[type.caption, { color: t.ink2 }]}>Minutes</Text>
      <View style={styles.timeGrid}>
        {MINUTES.map((m) =>
          cell(roundTo5(picked.minute) === m, `:${String(m).padStart(2, '0')}`, `Minute ${m}`, () =>
            setPicked((p) => ({ ...p, minute: m })),
          ),
        )}
      </View>
      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <Button label="Cancel" variant="secondary" onPress={onClose} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Done" onPress={() => onDone(joinTime(picked.hour, picked.minute))} />
        </View>
      </View>
    </BottomSheet>
  );
}

/** Bottom sheet with a month calendar; single day or start–end range. */
export function CalendarSheet({
  visible,
  title,
  range,
  mode,
  onClose,
  onDone,
}: {
  visible: boolean;
  title: string;
  range: DateRange;
  mode: 'single' | 'range';
  onClose: () => void;
  onDone: (range: DateRange) => void;
}) {
  const t = useTheme();
  const today = localDateIn(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata');
  const [picked, setPicked] = useState<DateRange>(range);
  const [month, setMonth] = useState(() => monthOf(range.start ?? today));
  const [wasVisible, setWasVisible] = useState(visible);
  // Reset to the field's value each time the sheet opens.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setPicked(range);
      setMonth(monthOf(range.start ?? today));
    }
  }

  const tap = (date: string) =>
    setPicked(mode === 'single' ? { start: date, end: date } : tapRange(picked, date));
  const ready = mode === 'single' ? !!picked.start : !!picked.start;
  const summary =
    mode === 'range'
      ? picked.start
        ? picked.end
          ? `${pretty(picked.start)} – ${pretty(picked.end)}`
          : `${pretty(picked.start)} – pick the last day`
        : 'Tap the first day'
      : picked.start
        ? pretty(picked.start)
        : 'Tap a day';

  return (
    <BottomSheet visible={visible} onClose={onClose} closeLabel="Close calendar">
      <Text style={[type.caption, styles.fieldLabel, { color: t.ink2 }]}>{title}</Text>
      <Text style={[type.title, { color: t.ink }]}>{summary}</Text>

      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => setMonth(shiftMonth(month, -1))}
          hitSlop={10}
          style={[styles.navBtn, { backgroundColor: t.surface2 }]}
        >
          <Icon name="left" size={20} color={t.ink} />
        </Pressable>
        <Text style={[type.headline, { color: t.ink }]}>{monthTitle(month)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => setMonth(shiftMonth(month, 1))}
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
                  accessibilityLabel={pretty(date)}
                  accessibilityState={{ selected: !!role }}
                  onPress={() => tap(date)}
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

      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <Button label="Cancel" variant="secondary" onPress={onClose} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Done" onPress={() => onDone(picked)} disabled={!ready} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { textTransform: 'uppercase', letterSpacing: 0.6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
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
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeCell: {
    width: '14.6%',
    minWidth: 44,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
