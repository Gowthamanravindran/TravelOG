import { radius } from '@travelog/ui';
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { MOTION, useMotionOk } from './motion';
import { useTheme } from './theme';

/**
 * Loading placeholders (Plan 46): the shape of a screen in soft blocks, shown for
 * the moment before its content is drawn. They pulse gently, or stay still with
 * Reduce motion on. Only opacity animates.
 */
export function Shimmer({
  width,
  height,
  round = 10,
}: {
  width: DimensionValue;
  height: number;
  round?: number;
}) {
  const t = useTheme();
  const ok = useMotionOk();
  const glow = useSharedValue(1);
  useEffect(() => {
    if (!ok) return;
    glow.set(withRepeat(withTiming(0.55, { ...MOTION.ease, duration: 700 }), -1, true));
    return () => cancelAnimation(glow);
  }, [ok, glow]);
  const style = useAnimatedStyle(() => ({ opacity: glow.get() }));
  return (
    <Animated.View
      testID="shimmer"
      style={[{ width, height, borderRadius: round, backgroundColor: t.surface2 }, style]}
    />
  );
}

/** The Itinerary's shape: route strip, day chips, then a few stops. */
export function ItinerarySkeleton() {
  const t = useTheme();
  return (
    <View
      accessible
      accessibilityLabel="Loading your plan"
      accessibilityRole="progressbar"
      style={styles.wrap}
    >
      <Shimmer width="100%" height={44} round={radius.card} />
      <View style={styles.chips}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Shimmer key={i} width={76} height={58} round={14} />
        ))}
      </View>
      {[0, 1, 2].map((i) => (
        // Time on the left, then the stop's card, as each itinerary row is laid out.
        <View key={i} style={styles.row}>
          <View style={styles.time}>
            <Shimmer width={34} height={12} round={6} />
          </View>
          <View style={[styles.card, { borderColor: t.line, backgroundColor: t.surface }]}>
            <Shimmer width={36} height={36} round={radius.tile} />
            <View style={styles.lines}>
              <Shimmer width="70%" height={14} round={7} />
              <Shimmer width="45%" height={12} round={6} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  chips: { flexDirection: 'row', gap: 8, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  time: { width: 44, paddingTop: 16 },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  lines: { flex: 1, gap: 8 },
});
