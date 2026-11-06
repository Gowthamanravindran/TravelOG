import { type RouteItem } from '@travelog/core';
import { font, type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BOOKING_LABELS } from '@/lib/labels';
import { durationText, nightsText, placeName, type Where } from '@/lib/where';
import { Icon, type IconName } from '@/ui/icon';
import { Button } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

const JOURNEY_ICON: Record<string, IconName> = {
  flight: 'flight',
  train: 'train',
  bus: 'transport',
  travel: 'route',
};

/**
 * The trip as a line (Plan 35): Bengaluru ✈ Goa 12–15 Jul 🚌 Gokarna 15–17 Jul.
 * A "?" marks a place worked out without a booking. Tap a stop to open it.
 */
export function RouteStrip({
  tripId,
  where,
  onAddPlace,
}: {
  tripId: string;
  where: Where;
  /** Shows a "+ Place" pill at the end (Plan mode only). */
  onAddPlace?: () => void;
}) {
  const t = useTheme();
  const router = useRouter();
  const add = onAddPlace ? (
    <Button
      label={where.route.length ? 'Place' : 'Add a place'}
      icon="add"
      variant="secondary"
      small
      onPress={onAddPlace}
    />
  ) : null;
  if (!where.route.length) return add ? <View style={styles.alone}>{add}</View> : null;

  const open = (sourceId: string | null) => {
    if (!sourceId) return;
    router.push(
      where.stopIds.has(sourceId)
        ? `/trip/${tripId}/stop?stopId=${sourceId}`
        : `/trip/${tripId}/booking?bookingId=${sourceId}`,
    );
  };

  const first = where.route.find((i) => i.type === 'journey');
  const startName =
    where.route[0]?.type === 'journey' && first?.type === 'journey'
      ? placeName(where.places, first.journey.fromPlaceId)
      : null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel="Your route"
      contentContainerStyle={styles.row}
    >
      {startName ? (
        <View style={[styles.stop, { borderColor: t.line }]}>
          <Text style={[type.body, { color: t.ink, ...font('text', 600) }]} numberOfLines={1}>
            {startName}
          </Text>
          <Text style={[type.caption, { color: t.ink2 }]}>From</Text>
        </View>
      ) : null}
      {where.route.map((item, i) => (
        <Item key={i} item={item} where={where} onPress={open} />
      ))}
      {add}
    </ScrollView>
  );
}

function Item({
  item,
  where,
  onPress,
}: {
  item: RouteItem;
  where: Where;
  onPress: (sourceId: string | null) => void;
}) {
  const t = useTheme();
  if (item.type === 'journey') {
    const j = item.journey;
    const to = placeName(where.places, j.toPlaceId);
    const how = j.type === 'travel' ? 'Travelling' : BOOKING_LABELS[j.type].label;
    const time = j.departTime ?? durationText(j.minutes);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${how}${to ? ` to ${to}` : ''}${time ? `, ${time}` : ''}`}
        onPress={() => onPress(j.sourceId)}
        style={styles.journey}
      >
        <View style={[styles.marker, { backgroundColor: t.accentSoft }]}>
          <Icon name={JOURNEY_ICON[j.type] ?? 'route'} size={16} color={t.accent} />
        </View>
        {time ? <Text style={[type.caption, { color: t.ink2 }]}>{time}</Text> : null}
      </Pressable>
    );
  }
  const name = placeName(where.places, item.placeId) ?? 'Somewhere';
  const dates = nightsText(item.startDate, item.endDate);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}${item.probable ? ', probably' : ''}, ${dates}`}
      onPress={() => onPress(item.sourceId)}
      style={[
        styles.stop,
        {
          backgroundColor: item.probable ? 'transparent' : t.surface,
          borderColor: t.line,
          borderStyle: item.probable ? 'dashed' : 'solid',
        },
      ]}
    >
      <Text style={[type.body, { color: t.ink, ...font('text', 600) }]} numberOfLines={1}>
        {name}
        {item.probable ? '?' : ''}
      </Text>
      <Text style={[type.caption, { color: t.ink2 }]}>{dates}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', gap: 8, paddingVertical: 2 },
  journey: { alignItems: 'center', gap: 2, paddingHorizontal: 2 },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alone: { flexDirection: 'row' },
  stop: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 180,
  },
});
