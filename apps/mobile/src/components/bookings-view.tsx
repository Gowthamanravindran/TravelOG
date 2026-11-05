import { getTrip, listAttachments, listBookings } from '@travelog/db';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useQuery } from '@/data/provider';
import { dateTimeIn, money } from '@/lib/format';
import { BOOKING_LABELS } from '@/lib/labels';
import {
  Between,
  Body,
  Button,
  Card,
  Empty,
  IconTile,
  Row,
  Section,
  Strong,
  WithIcon,
} from '@/ui/kit';
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

  const add = () => router.push(`/trip/${tripId}/booking`);
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
      </Card>

      {bookings.length ? (
        <Section title="All bookings">
          {bookings.map((b) => (
            <Card
              key={b.id}
              onPress={() => router.push(`/trip/${tripId}/booking?bookingId=${b.id}`)}
              accessibilityLabel={b.title}
            >
              <Row style={{ gap: 12, alignItems: 'flex-start' }}>
                <IconTile icon={BOOKING_LABELS[b.type].icon} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Between>
                    <Body small style={{ color: t.accent, fontWeight: '700' }}>
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
