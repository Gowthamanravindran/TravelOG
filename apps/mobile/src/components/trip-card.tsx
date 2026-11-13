import type { TripWithState } from '@travelog/db';
import { radius, spacing, type } from '@travelog/ui';
import { StyleSheet, Text, View } from 'react-native';

import { dateRange } from '@/lib/format';
import { Body, Card, Strong } from '@/ui/kit';
import { useTheme } from '@/ui/theme';
import { tripArt, tripIcon, tripIconFamily } from '@/lib/labels';
import { Art, ArtBackdrop } from '@/ui/art';

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
  return (
    <Card
      onPress={onPress}
      style={styles.card}
      accessibilityLabel={`${trip.title}, ${STATE_LABELS[trip.state]}`}
    >
      <ArtBackdrop family={tripIconFamily(icon)} style={styles.cover}>
        <Art name={tripArt(icon)} size={96} float style={styles.art} />
        <View style={[styles.badge, { backgroundColor: t.surface }]}>
          <Text style={[type.caption, { color: t.ink }]}>{STATE_LABELS[trip.state]}</Text>
        </View>
      </ArtBackdrop>
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
  badge: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  meta: { padding: spacing.lg, gap: 4 },
});
