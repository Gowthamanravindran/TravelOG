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
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { radius, type } from '@travelog/ui';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shortDate } from '@/lib/format';

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

/** A time 'HH:MM' using the phone's own clock picker. */
export function TimeField({
  label,
  value,
  onChange,
  placeholder = 'Add a time',
}: {
  label: string;
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const current = () => {
    const d = new Date();
    const [h, m] = (value || '09:00').split(':').map(Number);
    d.setHours(h ?? 9, m ?? 0, 0, 0);
    return d;
  };
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current(),
        mode: 'time',
        is24Hour: true,
        onChange: (e, d) => {
          if (e.type === 'set' && d) onChange(fmt(d));
        },
      });
    } else {
      setIosOpen(true);
    }
  };
  return (
    <>
      <FieldShell
        label={label}
        value={value || null}
        placeholder={placeholder}
        icon="today"
        onPress={open}
        onClear={() => onChange('')}
      />
      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker
          value={current()}
          mode="time"
          display="spinner"
          onChange={(_e, d) => {
            if (d) onChange(fmt(d));
          }}
        />
      ) : null}
    </>
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
  const insets = useSafeAreaInsets();
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close calendar" />
      <View
        style={[
          styles.sheet,
          { backgroundColor: t.surface, paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: t.line }]} />
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
                          fontWeight: edge ? '700' : '400',
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
            <Button label="Cancel" variant="ghost" onPress={onClose} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Done" onPress={() => onDone(picked)} disabled={!ready} />
          </View>
        </View>
      </View>
    </Modal>
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
  backdrop: { flex: 1, backgroundColor: '#00000066' },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
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
});
