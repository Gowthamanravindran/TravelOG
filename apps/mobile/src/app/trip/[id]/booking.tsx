import {
  addAttachment,
  addBooking,
  addExpense,
  BOOKING_TYPES,
  deleteAttachment,
  deleteBooking,
  getBooking,
  getPlace,
  getTrip,
  listAttachments,
  listMembers,
  saveTypedPlace,
  updateBooking,
  type BookingType,
} from '@travelog/db';
import {
  localDateIn,
  localTimeIn,
  localToUtcIso,
  placeText,
  type BookingDraft,
  type DraftField,
  type Place,
} from '@travelog/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { clearImport, peekImport, type ImportStep } from '@/lib/booking-import';
import { amountText, errorMessage, parseAmount } from '@/lib/format';
import { openAttachment, pickAttachment } from '@/lib/files';
import { BOOKING_LABELS } from '@/lib/labels';
import { openInMaps } from '@/lib/maps';
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
import { DateRangeField, TimeField } from '@/ui/date-field';
import { PlaceField } from '@/ui/place-field';

/**
 * Add or edit a booking (Plans 31, 32): a full page that slides up from the bottom. Opened from an uploaded
 * document, it starts filled in from it, one booking at a time ("1 of 2" for a
 * return flight), with the document attached.
 */
export default function BookingEditor() {
  const { id, bookingId, importId, type, start, end } = useLocalSearchParams<{
    id: string;
    bookingId?: string;
    importId?: string;
    /** From "Check your plan" → Add stay (Plan 35): a type and dates to start with. */
    type?: BookingType;
    start?: string;
    end?: string;
  }>();
  const preset = type ? { type, start: start ?? '', end: end ?? '' } : undefined;
  const router = useRouter();
  const imported = peekImport(importId);
  const [step, setStep] = useState(0);
  const steps = imported?.steps.length ?? 0;
  // Said once, on the first booking: what was left out of a multi-file upload (Plan 39).
  const extras =
    step === 0 && imported
      ? [
          imported.skipped
            ? `${imported.skipped} ${imported.skipped === 1 ? 'duplicate' : 'duplicates'} skipped.`
            : '',
          imported.truncated ? 'Only the first 10 files were added.' : '',
        ].filter(Boolean)
      : [];
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
        imported={imported?.steps[step]}
        extras={extras}
        draft={imported?.steps[step]?.draft}
        preset={preset}
        step={step}
        steps={steps}
        onDone={() => (step + 1 < steps ? setStep(step + 1) : finish())}
        onCancel={finish}
      />
    </ModeProvider>
  );
}

const STAY_IN = '12:00';
const STAY_OUT = '13:00';
const TEXTS = {
  stay: { range: 'Check-in – check-out', startTime: 'Check-in', endTime: 'Check-out' },
  journey: { range: 'Departs – arrives', startTime: 'Departs', endTime: 'Arrives' },
  other: { range: 'Dates', startTime: 'Starts', endTime: 'Ends' },
};
const JOURNEYS = new Set<BookingType>(['flight', 'train', 'bus']);

/** A place as typed in the form: picked from our list (id), or just text. */
interface PlaceInput {
  text: string;
  id: string | null;
  timeZone: string | null;
}
const placeInput = (p: Place | undefined, text?: string | null): PlaceInput =>
  p
    ? { text: placeText(p), id: p.id, timeZone: p.timeZone }
    : { text: text ?? '', id: null, timeZone: null };

function BookingForm({
  tripId,
  bookingId,
  imported,
  extras = [],
  draft,
  preset,
  step,
  steps,
  onDone,
  onCancel,
}: {
  tripId: string;
  bookingId?: string;
  /** The booking being checked, with the file it came from (Plan 39). */
  imported?: ImportStep;
  extras?: string[];
  draft?: BookingDraft;
  preset?: { type: BookingType; start: string; end: string };
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
  const found = new Set<DraftField>(draft?.found ?? []);
  const initialPlaces = useQuery(
    (db) => {
      const get = (id?: string | null) => (id ? getPlace(db, id) : undefined);
      return {
        from: get(existing?.fromPlaceId ?? draft?.fromPlaceId),
        to: get(existing?.toPlaceId ?? draft?.toPlaceId),
        city: get(existing?.placeId ?? draft?.placeId),
      };
    },
    [existing?.id, draft],
  );
  const [from, setFrom] = useState(() =>
    placeInput(initialPlaces.from, existing ? null : draft?.fromText),
  );
  const [to, setTo] = useState(() => placeInput(initialPlaces.to, existing ? null : draft?.toText));
  const [city, setCity] = useState(() =>
    placeInput(initialPlaces.city, existing ? null : draft?.placeText),
  );
  const [address, setAddress] = useState(existing?.address ?? draft?.address ?? '');
  // Each time is in the time zone of its place, else the trip's (Plan 35).
  const zones = (type: BookingType, f: PlaceInput, t2: PlaceInput, c: PlaceInput) =>
    JOURNEYS.has(type)
      ? { start: f.timeZone ?? tz, end: t2.timeZone ?? tz }
      : { start: c.timeZone ?? tz, end: c.timeZone ?? tz };
  const firstZones = zones(
    existing?.type ?? draft?.type ?? 'train',
    placeInput(initialPlaces.from),
    placeInput(initialPlaces.to),
    placeInput(initialPlaces.city),
  );
  const split = (iso: string | null | undefined, zone: string) =>
    iso
      ? { d: localDateIn(zone, new Date(iso)), t: localTimeIn(zone, new Date(iso)) }
      : { d: '', t: '' };
  const currency = existing?.currency ?? draft?.currency ?? trip?.currency ?? 'INR';
  const [kind, setKindState] = useState<BookingType>(
    existing?.type ?? (draft && found.has('type') ? draft.type : (preset?.type ?? 'train')),
  );
  // Stays start at 12:00 and end at 13:00 unless the document says otherwise (Plan 38).
  const stayTimes = (k: BookingType, which: 'start' | 'end', read?: string | null) =>
    read || (k === 'stay' && !existing ? (which === 'start' ? STAY_IN : STAY_OUT) : '');
  const [title, setTitle] = useState(existing?.title ?? draft?.title ?? '');
  const [provider, setProvider] = useState(existing?.provider ?? draft?.provider ?? '');
  const [reference, setReference] = useState(existing?.reference ?? draft?.reference ?? '');
  const [start, setStart] = useState(
    existing
      ? split(existing.startsAt, firstZones.start)
      : {
          d: draft?.startDate ?? preset?.start ?? '',
          t: stayTimes(kind, 'start', draft?.startTime),
        },
  );
  const [end, setEnd] = useState(
    existing
      ? split(existing.endsAt, firstZones.end)
      : { d: draft?.endDate ?? preset?.end ?? '', t: stayTimes(kind, 'end', draft?.endTime) },
  );
  const [cost, setCost] = useState(amountText(existing?.costMinor ?? draft?.costMinor, currency));
  const [notes, setNotes] = useState(existing?.notes ?? draft?.notes ?? '');
  const sameCurrency = currency === trip?.currency;
  const [addAsExpense, setAddAsExpense] = useState(!existing && sameCurrency);
  const [error, setError] = useState<string | null>(null);
  if (!trip) return null;

  const setKind = (k: BookingType) => {
    setKindState(k);
    if (k === 'stay' && !existing) {
      setStart((v) => ({ ...v, t: v.t || STAY_IN }));
      setEnd((v) => ({ ...v, t: v.t || STAY_OUT }));
    }
  };
  const zone = zones(kind, from, to, city);
  const instant = (v: { d: string; t: string }, z: string) =>
    v.d ? localToUtcIso(v.d, v.t || '00:00', z) : null;
  const label = BOOKING_LABELS[kind];
  const journey = JOURNEYS.has(kind);
  const sameZones = zone.start === tz && zone.end === tz;
  const readable = !!imported?.readable;
  // The name fills itself in when left empty (Plan 38): "Paris stay", "Oslo → Istanbul".
  const short = (t: string) => t.split(',')[0]!.trim();
  const autoTitle =
    kind === 'stay' && city.text.trim()
      ? `${short(city.text)} stay`
      : journey && from.text.trim() && to.text.trim()
        ? `${short(from.text)} → ${short(to.text)}`
        : !journey && city.text.trim()
          ? `${label.label} in ${short(city.text)}`
          : label.label;
  const texts = TEXTS[journey ? 'journey' : kind === 'stay' ? 'stay' : 'other'];

  const save = () => {
    try {
      const costMinor = parseAmount(cost, currency);
      const input = {
        tripId,
        type: kind,
        title: title.trim() || autoTitle,
        provider: journey ? provider || null : null,
        reference: reference || null,
        startsAt: instant(start, zone.start),
        endsAt: instant(end, zone.end),
        costMinor,
        currency,
        notes: notes.trim() || null,
        address: journey ? null : address.trim() || null,
      };
      mutate((db) => {
        // Places typed but not picked are kept as typed, with the trip's time zone.
        const ref = (p: PlaceInput) =>
          p.id ?? (p.text.trim() ? saveTypedPlace(db, p.text, { timeZone: tz }).id : null);
        const places = journey
          ? { fromPlaceId: ref(from), toPlaceId: ref(to), placeId: null }
          : { fromPlaceId: null, toPlaceId: null, placeId: ref(city) };
        if (existing) return updateBooking(db, existing.id, { ...input, ...places });
        const b = addBooking(db, { ...input, ...places });
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
              ? 'Filled in from this document: check before saving.'
              : "Couldn't read this file: enter the details below. Scans and photos can't be read on the phone yet. It will be attached to the booking."}
          </Body>
          {extras.map((e) => (
            <Body key={e} muted small>
              {e}
            </Body>
          ))}
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
        placeholder={autoTitle}
        hint={title.trim() ? undefined : 'Optional: filled in for you'}
      />
      {journey ? (
        <Row>
          <View style={{ flex: 1 }}>
            <Field
              label="Provider"
              value={provider}
              onChangeText={setProvider}
              placeholder="IndiGo"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="PNR"
              value={reference}
              onChangeText={setReference}
              autoCapitalize="characters"
            />
          </View>
        </Row>
      ) : (
        <Field
          label={kind === 'stay' ? 'Confirmation no.' : 'Booking ref'}
          value={reference}
          onChangeText={setReference}
          autoCapitalize="characters"
        />
      )}
      {journey ? (
        <Row>
          <View style={{ flex: 1 }}>
            <PlaceField
              label="From"
              value={from.text}
              onChangeText={(text) => setFrom({ text, id: null, timeZone: null })}
              onPick={(p) => setFrom(placeInput(p))}
              placeholder="Bengaluru"
            />
          </View>
          <View style={{ flex: 1 }}>
            <PlaceField
              label="To"
              value={to.text}
              onChangeText={(text) => setTo({ text, id: null, timeZone: null })}
              onPick={(p) => setTo(placeInput(p))}
              placeholder="Goa"
            />
          </View>
        </Row>
      ) : (
        <>
          <PlaceField
            label={kind === 'stay' ? 'City' : 'Where'}
            value={city.text}
            onChangeText={(text) => setCity({ text, id: null, timeZone: null })}
            onPick={(p) => setCity(placeInput(p))}
            placeholder="Goa"
          />
          <Field
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Candolim Beach Road, Goa"
          />
          {address.trim() || city.text.trim() ? (
            <Button
              label="Open in Maps"
              icon="place"
              variant="link"
              onPress={() =>
                openInMaps([title, address, city.text].filter((x) => x.trim()).join(', ')).catch(
                  (e) => setError(errorMessage(e)),
                )
              }
            />
          ) : null}
        </>
      )}
      {/* Both days on one calendar, as when creating a trip (Plan 38). */}
      <DateRangeField
        label={texts.range}
        start={start.d}
        end={end.d}
        onChange={(d1, d2) => {
          setStart({ ...start, d: d1 });
          setEnd({ ...end, d: d2 });
        }}
      />
      <Row>
        <View style={{ flex: 1 }}>
          <TimeField
            label={texts.startTime}
            value={start.t}
            onChange={(t) => setStart({ ...start, t })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TimeField label={texts.endTime} value={end.t} onChange={(t) => setEnd({ ...end, t })} />
        </View>
      </Row>
      <Body muted small>
        {sameZones
          ? `Times are in the trip's time zone (${tz}).`
          : 'Times are local to each place.'}
      </Body>
      <Field
        label={`Total cost (${currency})`}
        value={cost}
        onChangeText={setCost}
        keyboardType="decimal-pad"
      />
      <Field
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Seats, room, who's travelling"
        multiline
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
                  f.localUri &&
                  openAttachment({
                    localUri: f.localUri,
                    mimeType: f.mimeType,
                    name: f.name,
                  }).catch((e) => setError(errorMessage(e)))
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
