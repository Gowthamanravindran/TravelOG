import type { TripInput } from '@travelog/db';
import { currencyLabel, placeText, timeZoneLabel, type Place } from '@travelog/core';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CURRENCIES, deviceTimeZone } from '@/lib/format';
import { TRIP_ICONS, tripIcon } from '@/lib/labels';
import { Icon } from '@/ui/icon';
import { Body, Chip, ChipRow, Field, Row } from '@/ui/kit';
import { useTheme } from '@/ui/theme';
import { DateRangeField } from '@/ui/date-field';
import { PlaceField } from '@/ui/place-field';

export interface TripFormValue {
  title: string;
  emoji: string;
  destination: string;
  /** The picked place (Plan 29); null when the destination was typed. */
  destinationPlaceId: string | null;
  startDate: string;
  endDate: string;
  currency: string;
  timeZone: string;
}

export function emptyTripForm(currency = 'INR'): TripFormValue {
  return {
    title: '',
    emoji: 'trips',
    destination: '',
    destinationPlaceId: null,
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
    destinationPlaceId: v.destination ? v.destinationPlaceId : null,
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
  // A picked place fills the time zone and currency, unless they were changed by hand.
  const touched = useRef({ timeZone: false, currency: false });
  const [placeCountry, setPlaceCountry] = useState<string | null>(null);
  const pick = (p: Place) => {
    setPlaceCountry(p.countryName);
    set({
      destination: placeText(p),
      destinationPlaceId: p.id,
      ...(p.timeZone && !touched.current.timeZone ? { timeZone: p.timeZone } : {}),
      ...(p.currency && !touched.current.currency ? { currency: p.currency } : {}),
    });
  };
  const known: readonly string[] = CURRENCIES;
  const currencies = known.includes(value.currency) ? known : [value.currency, ...known];

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
        {TRIP_ICONS.map(({ icon: e, label }) => (
          <Pressable
            key={e}
            accessibilityRole="button"
            accessibilityLabel={`Icon: ${label}`}
            accessibilityState={{ selected: tripIcon(value.emoji) === e }}
            onPress={() => set({ emoji: e })}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: tripIcon(value.emoji) === e ? t.accent : t.line,
              backgroundColor: tripIcon(value.emoji) === e ? t.accentSoft : t.surface,
            }}
          >
            <Icon name={e} size={22} color={tripIcon(value.emoji) === e ? t.accent : t.ink2} />
          </Pressable>
        ))}
      </Row>
      <PlaceField
        label="Where"
        value={value.destination}
        onChangeText={(destination) => set({ destination, destinationPlaceId: null })}
        onPick={pick}
        placeholder="Goa, Tokyo, Europe…"
      />
      <DateRangeField
        label="Dates"
        start={value.startDate}
        end={value.endDate}
        onChange={(startDate, endDate) => set({ startDate, endDate })}
        placeholder="Pick start and end"
      />
      <Body muted small>
        Not sure of the dates yet? Leave them empty and decide with a dates poll later.
      </Body>
      <Body muted small>
        Trip currency
      </Body>
      <ChipRow>
        {currencies.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={value.currency === c}
            onPress={() => {
              touched.current.currency = true;
              set({ currency: c });
            }}
          />
        ))}
      </ChipRow>
      <Body muted small>
        {currencyLabel(value.currency)}
      </Body>
      {showTz ? (
        <Field
          label="Time zone"
          value={value.timeZone}
          onChangeText={(timeZone) => {
            touched.current.timeZone = true;
            set({ timeZone });
          }}
          autoCapitalize="none"
          hint="IANA name, e.g. Asia/Kolkata or Asia/Tokyo. Trip days follow this time zone."
        />
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setShowTz(true)}>
          <Body small muted>
            Time zone: {timeZoneLabel(value.timeZone, placeCountry)} · change
          </Body>
        </Pressable>
      )}
    </View>
  );
}
