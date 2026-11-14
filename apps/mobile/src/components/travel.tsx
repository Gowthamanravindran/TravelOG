import {
  bestOrder,
  estimateTravel,
  formatKm,
  formatMinutes,
  type BestOrder,
  type LatLng,
} from '@travelog/core';
import type { Item } from '@travelog/db';
import { type } from '@travelog/ui';
import { Text, View } from 'react-native';

import { BottomSheet } from '@/ui/bottom-sheet';
import { Icon } from '@/ui/icon';
import { Body, Button, Row } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

/** Plan 57: a stop's point, when it has one. */
export function pointOf(item: Pick<Item, 'lat' | 'lng'>): LatLng | null {
  return item.lat != null && item.lng != null ? { lat: item.lat, lng: item.lng } : null;
}

/** Long legs stand out: more than this many minutes. */
const LONG_MIN = 45;

/** The estimated trip between two stops, as a small chip between their cards. */
export function TravelLeg({ from, to }: { from: Item; to: Item }) {
  const t = useTheme();
  const a = pointOf(from);
  const b = pointOf(to);
  if (!a || !b) return null;
  const leg = estimateTravel(a, b);
  const long = leg.minutes > LONG_MIN;
  const text = `≈ ${formatMinutes(leg.minutes)} ${leg.mode === 'walk' ? 'walk' : 'drive'} · ${formatKm(leg.km)}`;
  return (
    <View
      testID="travel-leg"
      accessibilityLabel={`About ${formatMinutes(leg.minutes)} ${leg.mode === 'walk' ? 'on foot' : 'by road'}, ${formatKm(leg.km)}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 56 }}
    >
      <View style={{ width: 2, height: 18, borderRadius: 1, backgroundColor: t.line }} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: long ? t.tiles.clay.bg : t.surface2,
        }}
      >
        <Icon
          name={leg.mode === 'walk' ? 'activity' : 'car'}
          size={13}
          color={long ? t.tiles.clay.fg : t.ink2}
        />
        <Text style={[type.caption, { color: long ? t.tiles.clay.fg : t.ink2 }]}>{text}</Text>
      </View>
    </View>
  );
}

/** The suggested order for a plan's stops, or null when there's nothing to gain. */
export function suggestOrder(items: readonly Item[]): BestOrder | null {
  const r = bestOrder(items.map((i) => ({ id: i.id, point: pointOf(i), fixed: !!i.startTime })));
  return r.better ? r : null;
}

/** Before and after, side by side, with what it saves. Nothing changes until Use this order. */
export function BestOrderSheet({
  visible,
  dayLabel,
  items,
  suggestion,
  onApply,
  onClose,
}: {
  visible: boolean;
  dayLabel: string;
  items: readonly Item[];
  suggestion: BestOrder | null;
  onApply: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  if (!suggestion) return null;
  const byId = new Map(items.map((i) => [i.id, i]));
  const before = items.map((i) => i.id);
  const saved = suggestion.before.minutes - suggestion.after.minutes;
  const column = (title: string, ids: readonly string[], highlight: boolean) => (
    <View style={{ flex: 1, gap: 6 }}>
      <Text
        style={[type.caption, { color: t.ink2, textTransform: 'uppercase', letterSpacing: 0.6 }]}
      >
        {title}
      </Text>
      {ids.map((id, n) => {
        const item = byId.get(id)!;
        const fixed = !!item.startTime || !pointOf(item);
        const moved = highlight && before[n] !== id;
        return (
          <View
            key={id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              padding: 6,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: moved ? t.accent : t.line,
              backgroundColor: t.surface,
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: fixed ? t.ink : moved ? t.accent : t.surface2,
              }}
            >
              <Text
                style={[
                  type.caption,
                  {
                    fontSize: 10,
                    lineHeight: 12,
                    color: fixed ? t.bg : moved ? t.onAccent : t.ink2,
                  },
                ]}
              >
                {n + 1}
              </Text>
            </View>
            <Text style={[type.caption, { color: t.ink, flex: 1 }]} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
        );
      })}
    </View>
  );
  return (
    <BottomSheet visible={visible} onClose={onClose} closeLabel="Close best order">
      <View style={{ gap: 12 }}>
        <Text style={[type.title, { color: t.ink }]}>{`Best order for ${dayLabel}`}</Text>
        <View style={{ padding: 10, borderRadius: 12, backgroundColor: t.tiles.leaf.bg }}>
          <Text style={[type.label, { color: t.tiles.leaf.fg }]}>
            Saves about {formatMinutes(saved)} of travel ({formatMinutes(suggestion.before.minutes)}{' '}
            → {formatMinutes(suggestion.after.minutes)})
          </Text>
        </View>
        <Row style={{ alignItems: 'flex-start' }}>
          {column('Now', before, false)}
          {column('Suggested', suggestion.order, true)}
        </Row>
        <Body muted small>
          Stops with a set time, and stops without a place, stay where they are (dark numbers).
          Times are estimates from distance.
        </Body>
        <Row>
          <View style={{ flex: 1 }}>
            <Button label="Keep mine" variant="secondary" onPress={onClose} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Use this order" onPress={onApply} />
          </View>
        </Row>
      </View>
    </BottomSheet>
  );
}
