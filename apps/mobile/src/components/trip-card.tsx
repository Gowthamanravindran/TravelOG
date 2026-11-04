import type { TripWithState } from '@travelog/db';
import { radius, spacing, type } from '@travelog/ui';
import { StyleSheet, Text, View } from 'react-native';

import { dateRange } from '@/lib/format';
import { Body, Card, Strong } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

const STATE_LABELS = {
  planning: 'Planning',
  upcoming: 'Upcoming',
  live: '● Live now',
  completed: 'Completed',
  archived: 'Archived',
} as const;

const COVERS = {
  planning: ['#5B5BD6', '#A78BFA'],
  upcoming: ['#FF6B5B', '#FFB020'],
  live: ['#14B8A6', '#0EA5E9'],
  completed: ['#16A34A', '#14B8A6'],
  archived: ['#8A8AA3', '#5E5C78'],
} as const;

export function TripCard({ trip, onPress }: { trip: TripWithState; onPress: () => void }) {
  const t = useTheme();
  const [a] = COVERS[trip.state];
  return (
    <Card
      onPress={onPress}
      style={styles.card}
      accessibilityLabel={`${trip.title}, ${STATE_LABELS[trip.state]}`}
    >
      <View style={[styles.cover, { backgroundColor: a }]}>
        <Text style={styles.emoji}>{trip.emoji}</Text>
        <View style={[styles.badge, { backgroundColor: t.surface }]}>
          <Text style={[type.caption, { color: t.ink }]}>{STATE_LABELS[trip.state]}</Text>
        </View>
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
    height: 96,
    padding: spacing.md,
    justifyContent: 'flex-end',
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  emoji: { position: 'absolute', right: 16, top: 10, fontSize: 40 },
  badge: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  meta: { padding: spacing.lg, gap: 4 },
});
