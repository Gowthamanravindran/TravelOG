import { getTrip, listAttachments, listBookings } from '@travelog/db';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useQuery } from '@/data/provider';
import { dateTimeIn, money } from '@/lib/format';
import { BOOKING_LABELS } from '@/lib/labels';
import { Between, Body, Button, Card, Empty, Strong, WithIcon } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

export function BookingsView({ tripId }: { tripId: string }) {
  const t = useTheme();
  const router = useRouter();
  const trip = useQuery((db) => getTrip(db, tripId), [tripId]);
  const bookings = useQuery(
    (db) =>
      listBookings(db, tripId).map((b) => ({ ...b, files: listAttachments(db, b.id).length })),
    [tripId],
  );
  if (!trip) return null;

  return (
    <View style={{ gap: 12 }}>
      <Body muted small>
        Tickets and reservations, saved on this phone so they open without signal. Searching and
        booking inside TravelOG comes later.
      </Body>
      {bookings.length ? (
        bookings.map((b) => (
          <Card
            key={b.id}
            onPress={() => router.push(`/trip/${tripId}/booking?bookingId=${b.id}`)}
            accessibilityLabel={b.title}
          >
            <Between>
              <WithIcon icon={BOOKING_LABELS[b.type].icon} color={t.accent} size={16}>
                <Body small style={{ color: t.accent, fontWeight: '700' }}>
                  {BOOKING_LABELS[b.type].label.toUpperCase()}
                  {b.provider ? ` · ${b.provider}` : ''}
                </Body>
              </WithIcon>
              {b.files ? (
                <Body small muted>
                  {b.files} {b.files === 1 ? 'file' : 'files'}
                </Body>
              ) : null}
            </Between>
            <Strong>{b.title}</Strong>
            <Between>
              <Body muted small>
                {b.startsAt ? dateTimeIn(b.startsAt, trip.timeZone) : 'No date'}
                {b.endsAt ? ` → ${dateTimeIn(b.endsAt, trip.timeZone)}` : ''}
              </Body>
              {b.reference ? <Strong style={{ fontSize: 14 }}>{b.reference}</Strong> : null}
            </Between>
            {b.costMinor ? (
              <Body muted small>
                {money(b.costMinor, b.currency ?? trip.currency)}
              </Body>
            ) : null}
          </Card>
        ))
      ) : (
        <Empty
          icon="bookings"
          title="No bookings yet"
          body="Add flights, trains, buses, stays and event tickets with their PDFs."
        />
      )}
      <Button
        label="Add booking"
        icon="add"
        onPress={() => router.push(`/trip/${tripId}/booking`)}
      />
    </View>
  );
}
