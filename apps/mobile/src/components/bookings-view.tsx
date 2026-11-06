import { font } from '@travelog/ui';
import { getTrip, listAttachments, listBookings } from '@travelog/db';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useDb, useQuery } from '@/data/provider';
import { readBookingDocument, stashImport } from '@/lib/booking-import';
import { resolveDraftPlaces } from '@/lib/booking-places';
import { pickAttachment } from '@/lib/files';
import { dateTimeIn, errorMessage, money } from '@/lib/format';
import { BOOKING_LABELS } from '@/lib/labels';
import { ChoiceSheet } from '@/ui/choice-sheet';
import {
  Between,
  Body,
  Button,
  Card,
  Empty,
  ErrorText,
  IconTile,
  Row,
  Section,
  Strong,
  WithIcon,
} from '@/ui/kit';
import { Appear } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

export function BookingsView({ tripId }: { tripId: string }) {
  const t = useTheme();
  const router = useRouter();
  const db = useDb();
  const trip = useQuery((db) => getTrip(db, tripId), [tripId]);
  const bookings = useQuery(
    (db) =>
      listBookings(db, tripId).map((b) => ({ ...b, files: listAttachments(db, b.id).length })),
    [tripId],
  );
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!trip) return null;

  // Add booking: upload the ticket (read on the phone, Plan 31) or type it in.
  const add = () => {
    setError(null);
    setChoosing(true);
  };
  const upload = async () => {
    try {
      setBusy('Opening your files…');
      const file = await pickAttachment();
      if (!file) return;
      setBusy('Reading your document…');
      const read = await readBookingDocument(file, trip.currency);
      if (read.readable) {
        setBusy('Finding the places…');
        read.drafts = await Promise.all(read.drafts.map((d) => resolveDraftPlaces(db, d)));
      }
      setChoosing(false);
      router.push(`/trip/${tripId}/booking?importId=${stashImport({ file, ...read })}`);
    } catch (e) {
      setChoosing(false);
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  const manual = () => {
    setChoosing(false);
    router.push(`/trip/${tripId}/booking`);
  };
  const next = bookings.find((b) => b.startsAt && new Date(b.startsAt) > new Date());

  return (
    <View style={{ gap: 16 }}>
      <Card>
        <Row style={{ gap: 12 }}>
          <IconTile icon="bookings" size={44} />
          <View style={{ flex: 1 }}>
            <Strong>
              {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
            </Strong>
            <Body muted small numberOfLines={2}>
              {next?.startsAt
                ? `Next: ${next.title} · ${dateTimeIn(next.startsAt, trip.timeZone)}`
                : 'Tickets and stays, saved on this phone so they open without signal.'}
            </Body>
          </View>
        </Row>
        <Button label="Add booking" icon="add" onPress={add} />
        <ErrorText>{error}</ErrorText>
      </Card>
      <ChoiceSheet
        visible={choosing}
        title="Add a booking"
        busy={busy}
        onClose={() => setChoosing(false)}
        choices={[
          {
            icon: 'upload',
            label: 'Upload document',
            body: 'PDF ticket or voucher: we fill in the details for you',
            primary: true,
            onPress: upload,
          },
          {
            icon: 'edit',
            label: 'Enter booking details',
            body: 'Type in the dates, PNR and price yourself',
            onPress: manual,
          },
        ]}
      />

      {bookings.length ? (
        <Section title="All bookings">
          {bookings.map((b, i) => (
            <Appear key={b.id} index={i}>
              <Card
                onPress={() => router.push(`/trip/${tripId}/booking?bookingId=${b.id}`)}
                accessibilityLabel={b.title}
              >
                <Row style={{ gap: 12, alignItems: 'flex-start' }}>
                  <IconTile
                    icon={BOOKING_LABELS[b.type].icon}
                    family={BOOKING_LABELS[b.type].family}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Between>
                      <Body small style={{ color: t.accent, ...font('text', 600) }}>
                        {BOOKING_LABELS[b.type].label.toUpperCase()}
                        {b.provider ? ` · ${b.provider}` : ''}
                      </Body>
                      {b.files ? (
                        <WithIcon icon="attach" size={14}>
                          <Body small muted>
                            {b.files}
                          </Body>
                        </WithIcon>
                      ) : null}
                    </Between>
                    <Strong>{b.title}</Strong>
                    <Body muted small>
                      {b.startsAt ? dateTimeIn(b.startsAt, trip.timeZone) : 'No date yet'}
                      {b.endsAt ? ` → ${dateTimeIn(b.endsAt, trip.timeZone)}` : ''}
                    </Body>
                    {b.reference || b.costMinor ? (
                      <Between>
                        {b.reference ? (
                          <Strong style={{ fontSize: 14 }}>{b.reference}</Strong>
                        ) : (
                          <View />
                        )}
                        {b.costMinor ? (
                          <Body muted small>
                            {money(b.costMinor, b.currency ?? trip.currency)}
                          </Body>
                        ) : null}
                      </Between>
                    ) : null}
                  </View>
                </Row>
              </Card>
            </Appear>
          ))}
        </Section>
      ) : (
        <Empty
          icon="bookings"
          title="No bookings yet"
          body="Add flights, trains, buses, stays and event tickets with their PDFs."
          action={<Button label="Add your first booking" icon="add" onPress={add} />}
        />
      )}
    </View>
  );
}
