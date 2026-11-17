import { radius, spacing } from '@travelog/ui';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MOTION, useMotionOk } from './motion';
import { useTheme } from './theme';

/** Eases to rest and stops; nothing overshoots or bounces (Plan 32). */
const SETTLE = { duration: MOTION.slow, easing: Easing.out(Easing.cubic) };

/**
 * A drawer that stays on the screen, over whatever is behind it (Plan 66). Unlike
 * `BottomSheet` it is not a modal: the content behind stays live. It rests at one of
 * `heights` (ascending, in points); dragging the header follows the finger and settles on the
 * nearest height, and the handle steps between the lowest and the highest. The content
 * scrolls only at the highest height unless `scroll` is 'always'; `footer` stays pinned to the
 * bottom of the part that shows. With Reduce motion on it jumps.
 */
export function Drawer({
  heights,
  index,
  onIndexChange,
  label,
  header,
  children,
  footer,
  scroll = 'raised',
  progress,
  padBottom = true,
}: {
  heights: readonly number[];
  index: number;
  onIndexChange: (index: number) => void;
  /** What the drawer holds, for the handle's label: "Expand {label}". */
  label: string;
  header?: ReactNode;
  children: ReactNode;
  /** Stays at the bottom of the visible part at every height (the step's main button). */
  footer?: ReactNode;
  scroll?: 'raised' | 'always';
  /** Written by the drawer: 0 at the lowest height, 1 at the highest. */
  progress?: SharedValue<number>;
  /** Keep content clear of the gesture bar. Off when a tab bar sits below the screen. */
  padBottom?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const ok = useMotionOk();
  const top = heights.length - 1;
  const max = heights[top] ?? 0;
  const min = heights[0] ?? 0;
  const resting = max - (heights[Math.min(index, top)] ?? max);
  // How far the drawer is pushed down from its highest position.
  const offset = useSharedValue(resting);
  const start = useSharedValue(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const bottomPad = padBottom ? insets.bottom : 0;

  useEffect(() => {
    offset.set(ok ? withTiming(resting, SETTLE) : resting);
  }, [resting, ok, offset]);

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onStart(() => {
      start.set(offset.get());
    })
    .onChange((e) => {
      offset.set(Math.min(max - min, Math.max(0, start.get() + e.translationY)));
    })
    .onEnd((e) => {
      // Where a flick would carry it, then the nearest resting height.
      const aim = offset.get() + e.velocityY * 0.12;
      let best = 0;
      for (let i = 1; i < heights.length; i++)
        if (Math.abs(max - heights[i]! - aim) < Math.abs(max - heights[best]! - aim)) best = i;
      const to = max - heights[best]!;
      offset.set(ok ? withTiming(to, SETTLE) : to);
      runOnJS(onIndexChange)(best);
    });

  const style = useAnimatedStyle(() => {
    const y = offset.get();
    if (progress) progress.set(max > min ? 1 - y / (max - min) : 0);
    return { transform: [{ translateY: y }] };
  });

  // The footer rides up as the drawer rides down, so it stays at the bottom of what shows.
  const footerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -offset.get() }] }));

  const raised = index >= top;
  return (
    <Animated.View
      style={[
        styles.drawer,
        {
          height: max,
          backgroundColor: t.surface,
          borderColor: t.line,
        },
        style,
      ]}
    >
      <GestureDetector gesture={pan}>
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${raised ? 'Collapse' : 'Expand'} ${label}`}
            onPress={() => onIndexChange(raised ? 0 : top)}
            hitSlop={8}
            style={styles.handleArea}
          >
            <View style={[styles.handle, { backgroundColor: t.line }]} />
          </Pressable>
          {header ? <View style={styles.header}>{header}</View> : null}
        </View>
      </GestureDetector>
      <ScrollView
        testID="drawer-scroll"
        scrollEnabled={raised || scroll === 'always'}
        keyboardShouldPersistTaps="handled"
        // The part below the resting height is off screen; pad so the last row can be reached.
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing.lg + bottomPad + resting + (footer ? footerHeight : 0) },
        ]}
      >
        {children}
      </ScrollView>
      {footer ? (
        <Animated.View
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
          style={[
            styles.footer,
            { paddingBottom: spacing.md + bottomPad, backgroundColor: t.surface },
            footerStyle,
          ]}
        >
          {footer}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  handleArea: { height: 28, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
