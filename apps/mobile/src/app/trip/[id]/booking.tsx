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
import {
  localDateIn,
  localTimeIn,
  localToUtcIso,
  type BookingDraft,
  type DraftField,
} from '@travelog/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { clearImport, peekImport, type BookingImport } from '@/lib/booking-import';
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
  IconTile,
  Row,
  Screen,
  Strong,
  WithIcon,
} from '@/ui/kit';
import { ModeProvider } from '@/ui/theme';
import { DateField, TimeField } from '@/ui/date-field';

/**
 * Add or edit a booking (Plans 31, 32): a full page that slides up from the bottom. Opened from an uploaded
 * document, it starts filled in from it, one booking at a time ("1 of 2" for a
 * return flight), with the document attached.
 */
export default function BookingEditor() {
  const { id, bookingId, importId } = useLocalSearchParams<{
    id: string;
    bookingId?: string;
    importId?: string;
  }>();
  const router = useRouter();
  const imported = peekImport(importId);
  const [step, setStep] = useState(0);
  const steps = imported?.drafts.length ?? 0;
  const finish = () => {
    clearImport(importId);
    router.back();
  };
  return (
    <ModeProvider mode="plan">
      <BookingForm
        key={step}
        tripId={id}
        bookingId={bookingId}
        imported={imported}
        draft={imported?.drafts[step]}
        step={step}
        steps={steps}
        onDone={() => (step + 1 < steps ? setStep(step + 1) : finish())}
        onCancel={finish}
      />
    </ModeProvider>
  );
}

const FROM_DOC = 'From your document';

function BookingForm({
  tripId,
  bookingId,
  imported,
  draft,
  step,
  steps,
  onDone,
  onCancel,
}: {
  tripId: string;
  bookingId?: string;
  imported?: BookingImport;
  draft?: BookingDraft;
  step: number;
  steps: number;
  onDone: () => void;
  onCancel: () => void;
}) {
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
  const found = new Set<DraftField>(draft?.found ?? []);
  const currency = existing?.currency ?? draft?.currency ?? trip?.currency ?? 'INR';
  const [kind, setKind] = useState<BookingType>(
    existing?.type ?? (draft && found.has('type') ? draft.type : 'train'),
  );
  const [title, setTitle] = useState(existing?.title ?? draft?.title ?? '');
  const [provider, setProvider] = useState(existing?.provider ?? draft?.provider ?? '');
  const [reference, setReference] = useState(existing?.reference ?? draft?.reference ?? '');
  const [start, setStart] = useState(
    existing ? split(existing.startsAt) : { d: draft?.startDate ?? '', t: draft?.startTime ?? '' },
  );
  const [end, setEnd] = useState(
    existing ? split(existing.endsAt) : { d: draft?.endDate ?? '', t: draft?.endTime ?? '' },
  );
  const [cost, setCost] = useState(amountText(existing?.costMinor ?? draft?.costMinor, currency));
  const [notes, setNotes] = useState(existing?.notes ?? draft?.notes ?? '');
  const sameCurrency = currency === trip?.currency;
  const [addAsExpense, setAddAsExpense] = useState(!existing && sameCurrency);
  const [error, setError] = useState<string | null>(null);
  if (!trip) return null;

  const hint = (f: DraftField) => (found.has(f) ? FROM_DOC : undefined);
  const instant = (v: { d: string; t: string }) =>
    v.d ? localToUtcIso(v.d, v.t || '00:00', tz) : null;
  const label = BOOKING_LABELS[kind];
  const readable = !!imported?.readable;

  const save = () => {
    try {
      const costMinor = parseAmount(cost, currency);
      const input = {
        tripId,
        type: kind,
        title,
        provider: provider || null,
        reference: reference || null,
        startsAt: instant(start),
        endsAt: instant(end),
        costMinor,
        currency,
        notes: notes.trim() || null,
      };
      mutate((db) => {
        if (existing) return updateBooking(db, existing.id, input);
        const b = addBooking(db, input);
        if (imported) addAttachment(db, { tripId, bookingId: b.id, ...imported.file });
        if (addAsExpense && sameCurrency && costMinor) {
          const members = listMembers(db, tripId);
          const me = members.find((m) => m.isMe) ?? members[0]!;
          addExpense(db, {
            tripId,
            title: b.title,
            category: kind === 'stay' ? 'stay' : kind === 'event' ? 'activities' : 'travel',
            amountMinor: costMinor,
            currency,
            paidByMemberId: me.id,
            splitMethod: 'equal',
            participants: members.map((m) => ({ memberId: m.id })),
            bookingId: b.id,
          });
        }
        return b;
      });
      onDone();
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

  const heading = existing
    ? 'Booking'
    : readable
      ? `${label.label} · Check the details`
      : 'Add booking';
  const last = step + 1 >= steps;

  return (
    <Screen edges={['top', 'bottom']}>
      <Between>
        <Row style={{ gap: 12, flex: 1 }}>
          <IconTile icon={label.icon} family={label.family} />
          <View style={{ flex: 1 }}>
            <H1 eyebrow={steps > 1 ? `Booking ${step + 1} of ${steps}` : undefined}>{heading}</H1>
          </View>
        </Row>
        <Button label="Cancel" variant="link" onPress={onCancel} />
      </Between>

      {imported ? (
        <Card>
          <WithIcon icon="document" size={18}>
            <Strong>{imported.file.name}</Strong>
          </WithIcon>
          <Body muted small>
            {readable
              ? steps > 1
                ? `This document has ${steps} bookings. Filled in from it: check before saving.`
                : 'Filled in from your document: check before saving.'
              : "Couldn't read this file: enter the details below. Scans and photos can't be read on the phone yet. It will be attached to the booking."}
          </Body>
        </Card>
      ) : null}

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
        hint={hint('title')}
      />
      <Row>
        <View style={{ flex: 1 }}>
          <Field
            label="Provider"
            value={provider}
            onChangeText={setProvider}
            placeholder="HRTC"
            hint={hint('provider')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="PNR / ref"
            value={reference}
            onChangeText={setReference}
            autoCapitalize="characters"
            hint={hint('reference')}
          />
        </View>
      </Row>
      <Row>
        <View style={{ flex: 3 }}>
          <DateField
            label="Starts"
            value={start.d}
            onChange={(d) => setStart({ ...start, d })}
            hint={hint('start')}
          />
        </View>
        <View style={{ flex: 2 }}>
          <TimeField label="Time" value={start.t} onChange={(t) => setStart({ ...start, t })} />
        </View>
      </Row>
      <Row>
        <View style={{ flex: 3 }}>
          <DateField
            label="Ends"
            value={end.d}
            onChange={(d) => setEnd({ ...end, d })}
            hint={hint('end')}
          />
        </View>
        <View style={{ flex: 2 }}>
          <TimeField label="Time" value={end.t} onChange={(t) => setEnd({ ...end, t })} />
        </View>
      </Row>
      <Body muted small>
        Times are in the trip&apos;s time zone ({tz}).
      </Body>
      <Field
        label={`Total cost (${currency})`}
        value={cost}
        onChangeText={setCost}
        keyboardType="decimal-pad"
        hint={hint('cost')}
      />
      <Field
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Seats, room, who's travelling"
        multiline
        hint={hint('notes')}
      />
      {!existing && sameCurrency ? (
        <Chip
          label="Also add to expenses, split equally"
          icon={addAsExpense ? 'check' : 'circle'}
          selected={addAsExpense}
          onPress={() => setAddAsExpense(!addAsExpense)}
        />
      ) : null}
      {!existing && !sameCurrency ? (
        <Body muted small>
          Paid in {currency}: add it under Budget to convert it to {trip.currency}.
        </Body>
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
      <Button
        label={existing ? 'Save' : steps > 1 && !last ? 'Add and go to the next' : 'Add booking'}
        onPress={save}
        disabled={!title.trim()}
      />
      {steps > 1 && !existing ? (
        <Button
          label={last ? 'Skip this one' : 'Skip to the next'}
          variant="link"
          onPress={onDone}
        />
      ) : null}
      {existing ? (
        <Button
          label="Delete booking"
          variant="secondary"
          danger
          onPress={() => {
            mutate((db) => deleteBooking(db, existing.id));
            onDone();
          }}
        />
      ) : null}
    </Screen>
  );
}
