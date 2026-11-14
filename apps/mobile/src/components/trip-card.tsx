import type { TripWithState } from '@travelog/db';
import { radius, spacing, type } from '@travelog/ui';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { dateRange } from '@/lib/format';
import { Body, Card, Strong } from '@/ui/kit';
import { useTheme } from '@/ui/theme';
import { tripArt, tripIcon, tripIconFamily } from '@/lib/labels';
import { Art, ArtBackdrop } from '@/ui/art';
import { RemoteImage } from '@/ui/remote-image';
import { useTripCover } from '@/lib/trip-cover';

const STATE_LABELS = {
  planning: 'Planning',
  upcoming: 'Upcoming',
  live: 'Live now',
  completed: 'Completed',
  archived: 'Archived',
} as const;

export function TripCard({ trip, onPress }: { trip: TripWithState; onPress: () => void }) {
  const t = useTheme();
  // The trip's 3D object on a gradient of its type's colour (Plan 52).
  const icon = tripIcon(trip.emoji);
  // A destination photo fades in over the art when there is one (Plan 53).
  const { width } = useWindowDimensions();
  const cover = useTripCover(trip, width);
  return (
    <Card
      onPress={onPress}
      style={styles.card}
      accessibilityLabel={`${trip.title}, ${STATE_LABELS[trip.state]}`}
    >
      <View style={styles.cover}>
        <RemoteImage
          uri={cover.uri}
          blurhash={cover.photo?.blurhash}
          recyclingKey={trip.id}
          style={StyleSheet.absoluteFill}
          fallback={
            <ArtBackdrop family={tripIconFamily(icon)} style={StyleSheet.absoluteFill}>
              <Art name={tripArt(icon)} size={96} float style={styles.art} />
            </ArtBackdrop>
          }
        />
        <View style={[styles.badge, { backgroundColor: t.surface }]}>
          <Text style={[type.caption, { color: t.ink }]}>{STATE_LABELS[trip.state]}</Text>
        </View>
        {cover.uri && cover.photo ? (
          <View style={[styles.credit, { backgroundColor: t.surface }]}>
            <Text style={[type.caption, { color: t.ink2 }]} numberOfLines={1}>
              Photo: {cover.photo.credit}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Strong>{trip.title}</Strong>
        <Body muted small numberOfLines={1}>
          {[trip.destination, dateRange(trip.startDate, trip.endDate)].filter(Boolean).join(' · ')}
          {` · ${trip.memberCount} ${trip.memberCount === 1 ? 'person' : 'people'}`}
        </Body>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden', gap: 0 },
  cover: {
    height: 112,
    padding: spacing.md,
    justifyContent: 'flex-start',
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  art: { position: 'absolute', right: 16, top: 8 },
  credit: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    maxWidth: '70%',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badge: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  meta: { padding: spacing.lg, gap: 4 },
});
