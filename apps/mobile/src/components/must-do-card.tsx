import { distanceKm, formatKm } from '@travelog/core';
import { type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useQuery } from '@/data/provider';
import { mustDoList } from '@/lib/must-do';
import { ProgressRing } from '@/ui/progress-ring';
import { useTheme } from '@/ui/theme';

/**
 * Plan 62: Must-do on Today: progress, and the closest thing not done yet (from the last
 * check-in with a place, else the first one left).
 */
export function MustDoCard({
  tripId,
  here,
}: {
  tripId: string;
  /** Where you last checked in, if it had a place. */
  here?: { lat: number; lng: number } | null;
}) {
  const t = useTheme();
  const router = useRouter();
  const list = useQuery((db) => mustDoList(db, tripId), [tripId]);
  if (!list.length) return null;
  const left = list.filter((m) => !m.done);
  const done = list.length - left.length;
  const near = here
    ? left
        .filter((m) => m.point)
        .map((m) => ({ m, km: distanceKm(here, m.point!) }))
        .sort((a, b) => a.km - b.km)[0]
    : undefined;
  const next = near?.m ?? left[0];
  const line = !next
    ? 'All done 🎉'
    : near
      ? `Closest not done: ${next.title}, ${formatKm(near.km)}`
      : `Next: ${next.title}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Must-do, ${done} of ${list.length} done`}
      onPress={() => router.navigate(`/trip/${tripId}/live/must-do`)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        borderRadius: 18,
        backgroundColor: t.accentSoft,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <ProgressRing done={done} total={list.length} />
      <View style={{ flex: 1 }}>
        <Text style={[type.headline, { color: t.ink }]}>Must-do</Text>
        <Text style={[type.caption, { color: t.ink2 }]} numberOfLines={1}>
          {line}
        </Text>
      </View>
      <Text style={[type.label, { color: t.accent }]}>Open</Text>
    </Pressable>
  );
}
