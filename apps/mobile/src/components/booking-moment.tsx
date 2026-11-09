import type { DayMoment, StayingStrip } from '@travelog/core';
import type { Attachment, Booking } from '@travelog/db';
import { font, type } from '@travelog/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dayChip, shortDate } from '@/lib/format';
import { openAttachment } from '@/lib/files';
import { BOOKING_LABELS } from '@/lib/labels';
import { durationText } from '@/lib/where';
import { Icon } from '@/ui/icon';
import { Between, Body, Card, IconTile, Row, Strong, WithIcon } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

/**
 * A booking on an itinerary day (Plan 42): outlined in its type's colour with a
 * "Booked" tag, its reference and ticket, and no reorder arrows. Tap to open it.
 */

/** "Chennai → Mumbai · AI 571" → ["Chennai → Mumbai", "AI 571"]. */
function splitTitle(title: string): [string, string | null] {
  const m = /^(.*\S)\s+·\s+((?:[A-Z0-9]{2}\s?\d{1,4})|(?:Train \d+))$/.exec(title);
  return m ? [m[1]!, m[2]!] : [title, null];
}

const REF_LABEL: Record<string, string> = {
  flight: 'PNR',
  train: 'PNR',
  bus: 'PNR',
  stay: 'Conf.',
};

export function BookedCard({
  moment,
  booking,
  ticket,
  onPress,
}: {
  moment: DayMoment;
  booking: Booking;
  ticket: Attachment | null;
  onPress: () => void;
}) {
  const t = useTheme();
  const look = BOOKING_LABELS[booking.type];
  const tile = t.tiles[look.family];
  const [title, number] = splitTitle(booking.title);
  const { kind, meta } = describe(moment, booking.type, look.label, number);
  const ref = booking.reference ? `${REF_LABEL[booking.type] ?? 'Ref'} ${booking.reference}` : null;
  return (
    <Row style={{ alignItems: 'stretch' }}>
      <Text style={[type.caption, styles.time, { color: t.ink, ...font('text', 600) }]}>
        {moment.time ?? ''}
      </Text>
      <Card
        onPress={onPress}
        accessibilityLabel={`${kind}, ${title}, booked`}
        style={[styles.card, { borderColor: tile.bg }]}
      >
        <Row style={{ gap: 12, alignItems: 'flex-start' }}>
          <IconTile icon={look.icon} family={look.family} size={36} />
          <View style={{ flex: 1, gap: 2 }}>
            <Between>
              <Text style={[type.caption, styles.kind, { color: t.ink2 }]} numberOfLines={1}>
                {kind}
              </Text>
              <View style={[styles.tag, { backgroundColor: tile.bg }]}>
                <Text style={[type.caption, { color: tile.fg, ...font('text', 600) }]}>Booked</Text>
              </View>
            </Between>
            <Strong>{title}</Strong>
            {meta ? (
              <Body muted small>
                {meta}
              </Body>
            ) : null}
            {ref || ticket ? (
              <Row style={{ gap: 12, marginTop: 2 }}>
                {ref ? (
                  <Text style={[type.caption, { color: t.ink, ...font('text', 600) }]}>{ref}</Text>
                ) : null}
                {ticket?.localUri ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ticket ${ticket.name}`}
                    hitSlop={10}
                    onPress={() =>
                      openAttachment({
                        localUri: ticket.localUri!,
                        mimeType: ticket.mimeType,
                        name: ticket.name,
                      }).catch(() => {})
                    }
                  >
                    <WithIcon icon="attach" size={14}>
                      <Text style={[type.caption, { color: t.accent, ...font('text', 600) }]}>
                        Ticket
                      </Text>
                    </WithIcon>
                  </Pressable>
                ) : null}
              </Row>
            ) : null}
          </View>
        </Row>
      </Card>
    </Row>
  );
}

function describe(
  m: DayMoment,
  bookingType: string,
  typeLabel: string,
  number: string | null,
): { kind: string; meta: string } {
  const label = number ? `${typeLabel} · ${number}` : typeLabel;
  const took = durationText(m.minutes ?? null);
  switch (m.kind) {
    case 'journey': {
      const nextDay = m.arriveDate ? ` (${dayChip(m.arriveDate).weekday})` : '';
      const zone = m.arriveZoneName ? ` ${m.arriveZoneName} time` : '';
      const times = m.arriveTime
        ? `${m.departTime} – ${m.arriveTime}${nextDay}${zone}`
        : `Leaves ${m.departTime}`;
      return { kind: label, meta: [times, took].filter(Boolean).join(' · ') };
    }
    case 'arrive':
      return {
        kind: `Arrives · ${label}`,
        meta: [`Left ${m.departTime} the day before`, took].filter(Boolean).join(' · '),
      };
    case 'checkin': {
      const nights = m.nights ? `${m.nights} ${m.nights === 1 ? 'night' : 'nights'}` : '';
      const from = m.stayTime ? `Check-in from ${m.stayTime}` : 'Check-in';
      return {
        kind: 'Check in',
        meta: [from, m.afterArrival ? 'after you arrive' : '', nights].filter(Boolean).join(' · '),
      };
    }
    case 'checkout':
      return { kind: 'Check out', meta: m.stayTime ? `By ${m.stayTime}` : '' };
    default:
      return { kind: bookingType === 'event' ? 'Event' : typeLabel, meta: m.time ?? '' };
  }
}

/** The nights in the middle of a stay: a slim strip at the top of the day. */
export function StayStrip({
  strip,
  booking,
  onPress,
}: {
  strip: StayingStrip;
  booking: Booking;
  onPress: () => void;
}) {
  const t = useTheme();
  const tile = t.tiles.clay;
  const out = `check-out ${dayChip(strip.checkoutDate).weekday} ${shortDate(strip.checkoutDate)}${
    strip.checkoutTime ? `, ${strip.checkoutTime}` : ''
  }`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Staying at ${booking.title}, night ${strip.night} of ${strip.nights}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.strip,
        { backgroundColor: tile.bg, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Icon name="stay" size={18} color={tile.fg} />
      <View style={{ flex: 1 }}>
        <Text style={[type.label, { color: tile.fg }]} numberOfLines={1}>
          Staying at {booking.title}
        </Text>
        <Text style={[type.caption, { color: tile.fg }]} numberOfLines={1}>
          Night {strip.night} of {strip.nights} · {out}
        </Text>
      </View>
      <Icon name="right" size={16} color={tile.fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  time: { width: 44, paddingTop: 16 },
  card: { flex: 1, padding: 12, borderWidth: 2 },
  kind: { textTransform: 'uppercase', letterSpacing: 0.6, flex: 1 },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
  },
});
