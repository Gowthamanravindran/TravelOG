import {
  addAttachment,
  addBooking,
  addExpense,
  BOOKING_TYPES,
  deleteAttachment,
  deleteBooking,
  getBooking,
  getTrip,
  listAttachments,
  listMembers,
  updateBooking,
  type BookingType,
} from '@travelog/db';
import { localDateIn, localTimeIn, localToUtcIso } from '@travelog/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { amountText, errorMessage, parseAmount } from '@/lib/format';
import { openAttachment, pickAttachment } from '@/lib/files';
import { BOOKING_LABELS } from '@/lib/labels';
import {
  Between,
  Body,
  Button,
  Card,
  Chip,
  ChipRow,
  ErrorText,
  Field,
  H1,
  Row,
  Screen,
} from '@/ui/kit';
import { ModeProvider } from '@/ui/theme';
import { DateField, TimeField } from '@/ui/date-field';

export default function BookingEditor() {
  const { id, bookingId } = useLocalSearchParams<{ id: string; bookingId?: string }>();
  return (
    <ModeProvider mode="plan">
      <BookingForm tripId={id} bookingId={bookingId} />
    </ModeProvider>
  );
}

function BookingForm({ tripId, bookingId }: { tripId: string; bookingId?: string }) {
  const router = useRouter();
  const mutate = useMutate();
  const trip = useQuery((db) => getTrip(db, tripId), [tripId]);
  const existing = useQuery(
    (db) => (bookingId ? getBooking(db, bookingId) : undefined),
    [bookingId],
  );
  const files = useQuery((db) => (bookingId ? listAttachments(db, bookingId) : []), [bookingId]);
  const tz = trip?.timeZone ?? 'Asia/Kolkata';
  const split = (iso?: string | null) =>
    iso
      ? { d: localDateIn(tz, new Date(iso)), t: localTimeIn(tz, new Date(iso)) }
      : { d: '', t: '' };
  const [kind, setKind] = useState<BookingType>(existing?.type ?? 'train');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [provider, setProvider] = useState(existing?.provider ?? '');
  const [reference, setReference] = useState(existing?.reference ?? '');
  const [start, setStart] = useState(split(existing?.startsAt));
  const [end, setEnd] = useState(split(existing?.endsAt));
  const [cost, setCost] = useState(amountText(existing?.costMinor, trip?.currency ?? 'INR'));
  const [addAsExpense, setAddAsExpense] = useState(!existing);
  const [error, setError] = useState<string | null>(null);
  if (!trip) return null;

  const instant = (v: { d: string; t: string }) =>
    v.d ? localToUtcIso(v.d, v.t || '00:00', tz) : null;

  const save = () => {
    try {
      const costMinor = parseAmount(cost, trip.currency);
      const input = {
        tripId,
        type: kind,
        title,
        provider: provider || null,
        reference: reference || null,
        startsAt: instant(start),
        endsAt: instant(end),
        costMinor,
        currency: trip.currency,
      };
      mutate((db) => {
        if (existing) return updateBooking(db, existing.id, input);
        const b = addBooking(db, input);
        if (addAsExpense && costMinor) {
          const members = listMembers(db, tripId);
          const me = members.find((m) => m.isMe) ?? members[0]!;
          addExpense(db, {
            tripId,
            title: b.title,
            category: kind === 'stay' ? 'stay' : kind === 'event' ? 'activities' : 'travel',
            amountMinor: costMinor,
            currency: trip.currency,
            paidByMemberId: me.id,
            splitMethod: 'equal',
            participants: members.map((m) => ({ memberId: m.id })),
            bookingId: b.id,
          });
        }
        return b;
      });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const attach = async () => {
    try {
      if (!existing) throw new Error('save the booking first, then attach the ticket');
      const file = await pickAttachment();
      if (file) mutate((db) => addAttachment(db, { tripId, bookingId: existing.id, ...file }));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Between>
        <H1>{existing ? 'Booking' : 'Add booking'}</H1>
        <Button label="Cancel" variant="link" onPress={() => router.back()} />
      </Between>
      <ChipRow>
        {BOOKING_TYPES.map((b) => (
          <Chip
            key={b}
            label={BOOKING_LABELS[b].label}
            icon={BOOKING_LABELS[b].icon}
            selected={kind === b}
            onPress={() => setKind(b)}
          />
        ))}
      </ChipRow>
      <Field
        label="Name"
        value={title}
        onChangeText={setTitle}
        placeholder="Delhi → Manali Volvo"
      />
      <Row>
        <View style={{ flex: 1 }}>
          <Field label="Provider" value={provider} onChangeText={setProvider} placeholder="HRTC" />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="PNR / ref"
            value={reference}
            onChangeText={setReference}
            autoCapitalize="characters"
          />
        </View>
      </Row>
      <Row>
        <View style={{ flex: 3 }}>
          <DateField label="Starts" value={start.d} onChange={(d) => setStart({ ...start, d })} />
        </View>
        <View style={{ flex: 2 }}>
          <TimeField label="Time" value={start.t} onChange={(t) => setStart({ ...start, t })} />
        </View>
      </Row>
      <Row>
        <View style={{ flex: 3 }}>
          <DateField label="Ends" value={end.d} onChange={(d) => setEnd({ ...end, d })} />
        </View>
        <View style={{ flex: 2 }}>
          <TimeField label="Time" value={end.t} onChange={(t) => setEnd({ ...end, t })} />
        </View>
      </Row>
      <Body muted small>
        Times are in the trip&apos;s time zone ({tz}).
      </Body>
      <Field
        label={`Total cost (${trip.currency})`}
        value={cost}
        onChangeText={setCost}
        keyboardType="decimal-pad"
      />
      {!existing ? (
        <Chip
          label="Also add to expenses, split equally"
          icon={addAsExpense ? 'check' : 'circle'}
          selected={addAsExpense}
          onPress={() => setAddAsExpense(!addAsExpense)}
        />
      ) : null}
      {existing ? (
        <Card>
          <Between>
            <Body>Tickets on this phone</Body>
            <Button label="Attach" icon="attach" variant="link" onPress={attach} />
          </Between>
          {files.map((f) => (
            <Between key={f.id}>
              <Button
                label={f.name}
                icon="attach"
                variant="link"
                onPress={() =>
                  f.localUri && openAttachment(f.localUri).catch((e) => setError(errorMessage(e)))
                }
              />
              <Button
                label="Remove"
                variant="link"
                danger
                onPress={() => mutate((db) => deleteAttachment(db, f.id))}
              />
            </Between>
          ))}
          {!files.length ? (
            <Body muted small>
              Attach the PDF or a screenshot so it opens without signal.
            </Body>
          ) : null}
        </Card>
      ) : null}
      <ErrorText>{error}</ErrorText>
      <Button label={existing ? 'Save' : 'Add booking'} onPress={save} disabled={!title.trim()} />
      {existing ? (
        <Button
          label="Delete booking"
          variant="ghost"
          danger
          onPress={() => {
            mutate((db) => deleteBooking(db, existing.id));
            router.back();
          }}
        />
      ) : null}
    </Screen>
  );
}
