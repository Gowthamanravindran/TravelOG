import type { TripInput } from '@travelog/db';
import { isLocalDate } from '@travelog/core';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CURRENCIES, deviceTimeZone } from '@/lib/format';
import { TRIP_EMOJIS } from '@/lib/labels';
import { Body, Chip, ChipRow, Field, Row } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

export interface TripFormValue {
  title: string;
  emoji: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
  timeZone: string;
}

export function emptyTripForm(currency = 'INR'): TripFormValue {
  return {
    title: '',
    emoji: '🧳',
    destination: '',
    startDate: '',
    endDate: '',
    currency,
    timeZone: deviceTimeZone(),
  };
}

export function toTripInput(v: TripFormValue): TripInput {
  return {
    title: v.title,
    emoji: v.emoji,
    destination: v.destination || null,
    startDate: v.startDate || null,
    endDate: v.endDate || null,
    currency: v.currency,
    timeZone: v.timeZone.trim() || deviceTimeZone(),
  };
}

export function TripForm({
  value,
  onChange,
}: {
  value: TripFormValue;
  onChange: (v: TripFormValue) => void;
}) {
  const t = useTheme();
  const set = (patch: Partial<TripFormValue>) => onChange({ ...value, ...patch });
  const [showTz, setShowTz] = useState(false);
  const dateError = (d: string) =>
    d && !isLocalDate(d) ? 'Use YYYY-MM-DD, e.g. 2026-11-14' : null;

  return (
    <View style={{ gap: 16 }}>
      <Field
        label="Trip name"
        value={value.title}
        onChangeText={(title) => set({ title })}
        placeholder="Goa long weekend"
      />
      <Body muted small>
        Pick an icon
      </Body>
      <Row style={{ flexWrap: 'wrap' }}>
        {TRIP_EMOJIS.map((e) => (
          <Pressable
            key={e}
            accessibilityRole="button"
            accessibilityLabel={`Icon ${e}`}
            accessibilityState={{ selected: value.emoji === e }}
            onPress={() => set({ emoji: e })}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: value.emoji === e ? t.accent : t.line,
              backgroundColor: value.emoji === e ? t.accentSoft : t.surface,
            }}
          >
            <Text style={{ fontSize: 22 }}>{e}</Text>
          </Pressable>
        ))}
      </Row>
      <Field
        label="Where"
        value={value.destination}
        onChangeText={(destination) => set({ destination })}
        placeholder="North Goa"
      />
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Start"
            value={value.startDate}
            onChangeText={(startDate) => set({ startDate })}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            error={dateError(value.startDate)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="End"
            value={value.endDate}
            onChangeText={(endDate) => set({ endDate })}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            error={dateError(value.endDate)}
          />
        </View>
      </Row>
      <Body muted small>
        Not sure of the dates yet? Leave them empty and decide with a dates poll later.
      </Body>
      <Body muted small>
        Trip currency
      </Body>
      <ChipRow>
        {CURRENCIES.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={value.currency === c}
            onPress={() => set({ currency: c })}
          />
        ))}
      </ChipRow>
      {showTz ? (
        <Field
          label="Time zone"
          value={value.timeZone}
          onChangeText={(timeZone) => set({ timeZone })}
          autoCapitalize="none"
          hint="IANA name, e.g. Asia/Kolkata or Asia/Tokyo. Trip days follow this time zone."
        />
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setShowTz(true)}>
          <Body small muted>
            Time zone: {value.timeZone} · change
          </Body>
        </Pressable>
      )}
    </View>
  );
}
