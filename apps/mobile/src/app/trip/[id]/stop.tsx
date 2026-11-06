import { addDays, placeText, type Place } from '@travelog/core';
import {
  addStop,
  deleteStop,
  getPlace,
  getStop,
  getTrip,
  saveTypedPlace,
  updateStop,
  type Db,
  type StopKind,
} from '@travelog/db';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { errorMessage } from '@/lib/format';
import { openInMaps } from '@/lib/maps';
import { DateRangeField } from '@/ui/date-field';
import { Between, Body, Button, ErrorText, Field, H1, Row, Screen, Segmented } from '@/ui/kit';
import { PlaceField } from '@/ui/place-field';
import { ModeProvider } from '@/ui/theme';

/**
 * A place you set yourself (Plan 35): staying with friends, a night on a bus, a
 * road trip. The city comes from our places (or as typed); the exact spot is a
 * name and an address that open in the phone's maps app.
 */
export default function StopEditor() {
  const params = useLocalSearchParams<{
    id: string;
    stopId?: string;
    kind?: StopKind;
    start?: string;
    end?: string;
    placeId?: string;
  }>();
  return (
    <ModeProvider mode="plan">
      <StopForm {...params} tripId={params.id} />
    </ModeProvider>
  );
}

interface PlaceInput {
  text: string;
  id: string | null;
}
const fromPlace = (p: Place | undefined): PlaceInput =>
  p ? { text: placeText(p), id: p.id } : { text: '', id: null };

function StopForm({
  tripId,
  stopId,
  kind: kindParam,
  start: startParam,
  end: endParam,
  placeId: placeParam,
}: {
  tripId: string;
  stopId?: string;
  kind?: StopKind;
  start?: string;
  end?: string;
  placeId?: string;
}) {
  const router = useRouter();
  const mutate = useMutate();
  const trip = useQuery((db) => getTrip(db, tripId), [tripId]);
  const existing = useQuery((db) => (stopId ? getStop(db, stopId) : undefined), [stopId]);
  const initial = useQuery(
    (db) => ({
      place: getPlace(db, existing?.placeId ?? placeParam ?? '') ?? undefined,
      to: existing?.toPlaceId ? getPlace(db, existing.toPlaceId) : undefined,
    }),
    [existing?.id, placeParam],
  );
  const [kind, setKind] = useState<StopKind>(existing?.kind ?? kindParam ?? 'stay');
  const [place, setPlace] = useState(() => fromPlace(initial.place));
  const [to, setTo] = useState(() => fromPlace(initial.to));
  // The calendar picks arrive and leave days; a single day means one night.
  const [dates, setDates] = useState({
    start: existing?.startDate ?? startParam ?? '',
    end: existing?.endDate ?? endParam ?? '',
  });
  const [label, setLabel] = useState(existing?.label ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  if (!trip) return null;
  const staying = kind === 'stay';

  const save = () => {
    try {
      if (!dates.start) throw new RangeError('pick the dates');
      if (staying && !place.text.trim()) throw new RangeError('pick the city');
      const ref = (db: Db, p: PlaceInput) =>
        p.id ?? (p.text.trim() ? saveTypedPlace(db, p.text, { timeZone: trip.timeZone }).id : null);
      const end = dates.end && dates.end > dates.start ? dates.end : addDays(dates.start, 1);
      mutate((db) => {
        const input = {
          tripId,
          kind,
          placeId: ref(db, place),
          toPlaceId: staying ? null : ref(db, to),
          startDate: dates.start,
          endDate: end,
          label: label || null,
          address: staying ? address || null : null,
          notes: notes || null,
        };
        return existing ? updateStop(db, existing.id, input) : addStop(db, input);
      });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Between>
        <H1>{existing ? 'Your place' : 'Add a place'}</H1>
        <Button label="Cancel" variant="link" onPress={() => router.back()} />
      </Between>
      <Body muted small>
        For nights without a booking: staying with friends, a night on the road.
      </Body>
      <Segmented
        options={[
          { value: 'stay', label: 'Staying' },
          { value: 'travel', label: 'Travelling' },
        ]}
        value={kind}
        onChange={setKind}
      />
      {staying ? (
        <PlaceField
          label="City"
          value={place.text}
          onChangeText={(text) => setPlace({ text, id: null })}
          onPick={(p) => setPlace(fromPlace(p))}
          placeholder="Goa"
        />
      ) : (
        <Row>
          <View style={{ flex: 1 }}>
            <PlaceField
              label="From"
              value={place.text}
              onChangeText={(text) => setPlace({ text, id: null })}
              onPick={(p) => setPlace(fromPlace(p))}
              placeholder="Bengaluru"
            />
          </View>
          <View style={{ flex: 1 }}>
            <PlaceField
              label="To"
              value={to.text}
              onChangeText={(text) => setTo({ text, id: null })}
              onPick={(p) => setTo(fromPlace(p))}
              placeholder="Delhi"
            />
          </View>
        </Row>
      )}
      <DateRangeField
        label={staying ? 'Arrive – leave' : 'Leave – arrive'}
        start={dates.start}
        end={dates.end}
        onChange={(start, end) => setDates({ start, end })}
      />
      <Field
        label={staying ? 'Where exactly (optional)' : 'Name (optional)'}
        value={label}
        onChangeText={setLabel}
        placeholder={staying ? "Aunt's house" : 'Road trip'}
      />
      {staying ? (
        <>
          <Field
            label="Address (optional)"
            value={address}
            onChangeText={setAddress}
            placeholder="Near the temple, Candolim"
          />
          {address.trim() ? (
            <Button
              label="Open in Maps"
              icon="place"
              variant="link"
              onPress={() =>
                openInMaps([address, place.text].filter((x) => x.trim()).join(', ')).catch((e) =>
                  setError(errorMessage(e)),
                )
              }
            />
          ) : null}
        </>
      ) : null}
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ErrorText>{error}</ErrorText>
      <Button label={existing ? 'Save' : 'Add place'} onPress={save} />
      {existing ? (
        <Button
          label="Delete"
          variant="secondary"
          danger
          onPress={() => {
            mutate((db) => deleteStop(db, existing.id));
            router.back();
          }}
        />
      ) : null}
    </Screen>
  );
}
