import { type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { shortDate } from '@/lib/format';
import { useTripReadiness } from '@/lib/readiness';
import { ProgressRing } from '@/ui/progress-ring';
import { useTheme } from '@/ui/theme';

/** "4 left · next: Visa by 28 Nov". */
export function readyLine(left: number, next: { title: string; dueDate: string | null } | null) {
  const what = next
    ? `next: ${next.title}${next.dueDate ? ` by ${shortDate(next.dueDate)}` : ''}`
    : '';
  return [`${left} left`, what].filter(Boolean).join(' · ');
}

/**
 * Plan 61: Get ready, one line above the itinerary (the list itself grows long, so it lives on
 * its own screen). Hidden when everything is ready.
 */
export function GetReadyCard({ tripId }: { tripId: string }) {
  const t = useTheme();
  const router = useRouter();
  const r = useTripReadiness(tripId);
  if (!r) return null;
  const { done, total, next } = r.summary;
  if (r.manual.length > 0 && done >= total) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Get ready, ${done} of ${total} done`}
      onPress={() => router.push(`/trip/${tripId}/ready`)}
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
      <ProgressRing done={done} total={total} />
      <View style={{ flex: 1 }}>
        <Text style={[type.headline, { color: t.ink }]}>Get ready</Text>
        <Text style={[type.caption, { color: t.ink2 }]} numberOfLines={1}>
          {r.manual.length === 0
            ? 'Visa, tickets, packing: start your checklist'
            : readyLine(total - done, next)}
        </Text>
      </View>
      <Text style={[type.label, { color: t.accent }]}>Open</Text>
    </Pressable>
  );
}
