import {
  addItem,
  deleteItem,
  getTrip,
  ITEM_TYPES,
  listItems,
  updateItem,
  type ItemType,
} from '@travelog/db';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { tripCentre } from '@/lib/stop-search';
import { amountText, errorMessage, parseAmount } from '@/lib/format';
import { ITEM_LABELS } from '@/lib/labels';
import { Between, Button, Chip, ChipRow, ErrorText, Field, H1, Row, Screen } from '@/ui/kit';
import { ModeProvider } from '@/ui/theme';
import { TimeField } from '@/ui/date-field';
import { NO_PLACE, StopPlaceField, type StopPlaceValue } from '@/ui/stop-place-field';

export default function ItemEditor() {
  const { id, variantId, itemId } = useLocalSearchParams<{
    id: string;
    variantId: string;
    itemId?: string;
  }>();
  const router = useRouter();
  const mutate = useMutate();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  const existing = useQuery(
    (db) => (itemId ? listItems(db, variantId).find((i) => i.id === itemId) : undefined),
    [variantId, itemId],
  );
  const currency = trip?.currency ?? 'INR';
  const [kind, setKind] = useState<ItemType>(existing?.type ?? 'place');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [time, setTime] = useState(existing?.startTime ?? '');
  const [duration, setDuration] = useState(
    existing?.durationMin ? String(existing.durationMin) : '',
  );
  const [cost, setCost] = useState(amountText(existing?.estCostMinor, currency));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const near = useQuery((db) => tripCentre(db, id), [id]);
  const [place, setPlace] = useState<StopPlaceValue>(
    existing
      ? {
          name: existing.placeName ?? '',
          address: existing.address,
          lat: existing.lat,
          lng: existing.lng,
          poiId: existing.poiId,
        }
      : NO_PLACE,
  );
  const [kindChosen, setKindChosen] = useState(!!existing);
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => void) => {
    try {
      setError(null);
      fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const save = () => {
    try {
      const input = {
        type: kind,
        title,
        startTime: time || null,
        durationMin: duration ? Math.round(Number(duration)) : null,
        estCostMinor: parseAmount(cost, currency),
        currency,
        notes: notes || null,
        placeName: place.name.trim() || null,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        poiId: place.poiId,
      };
      mutate((db) =>
        existing ? updateItem(db, existing.id, input) : addItem(db, variantId, input),
      );
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <ModeProvider mode="plan">
      <Screen edges={['top', 'bottom']}>
        <Between>
          <H1>{existing ? 'Edit stop' : 'Add stop'}</H1>
          <Button label="Cancel" variant="link" onPress={() => router.back()} />
        </Between>
        <ChipRow>
          {ITEM_TYPES.map((k) => (
            <Chip
              key={k}
              label={ITEM_LABELS[k].label}
              icon={ITEM_LABELS[k].icon}
              selected={kind === k}
              onPress={() => {
                setKind(k);
                setKindChosen(true);
              }}
            />
          ))}
        </ChipRow>
        <Field
          label="Name"
          value={title}
          onChangeText={setTitle}
          placeholder="Chapora Fort"
          autoFocus={!existing}
        />
        <StopPlaceField
          tripId={id}
          near={near ?? null}
          value={place}
          onChange={setPlace}
          onPick={(p) => {
            if (!title.trim()) setTitle(p.name);
            if (!kindChosen) setKind(p.kind);
          }}
        />
        <Row>
          <View style={{ flex: 1 }}>
            <TimeField label="Time" value={time} onChange={setTime} />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Minutes"
              value={duration}
              onChangeText={setDuration}
              placeholder="90"
              keyboardType="number-pad"
            />
          </View>
        </Row>
        <Field
          label={`Estimated cost (${currency})`}
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Field
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Booking link, tips"
        />
        <ErrorText>{error}</ErrorText>
        <Button label={existing ? 'Save' : 'Add'} onPress={save} disabled={!title.trim()} />
        {existing ? (
          <Button
            label="Remove from plan"
            variant="secondary"
            danger
            onPress={() => {
              mutate((db) => deleteItem(db, existing.id));
              router.back();
            }}
          />
        ) : null}
      </Screen>
    </ModeProvider>
  );
}
