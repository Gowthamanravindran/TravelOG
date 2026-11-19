import type { ReactNode } from 'react';
import { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Icon } from '@/ui/icon';
import { haptic, MOTION, useMotionOk } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/** Every row is this tall, so a drag of one row's height is one place. */
export const REORDER_ROW = 64;

export interface ReorderItem {
  key: string;
  /** What the row is called, for its handle and for screen readers. */
  name: string;
}

/**
 * A list whose rows can be put in a new order (Plan 86): drag a row by its handle and the
 * others slide out of the way; let go and it takes that place. Screen readers get Move up and
 * Move down on each row instead. The handle is its own target, so dragging it does not scroll
 * the list or move the drawer around it.
 */
export function ReorderList<T extends ReorderItem>({
  items,
  onMove,
  renderRow,
  renderEnd,
}: {
  items: readonly T[];
  onMove: (from: number, to: number) => void;
  /** What the row shows; read out as one item, with Move up and Move down. */
  renderRow: (item: T, index: number) => ReactNode;
  /** The row's own buttons, between its content and the handle; each reachable on its own. */
  renderEnd?: (item: T, index: number) => ReactNode;
}) {
  const dragging = useSharedValue(-1);
  const target = useSharedValue(-1);
  const dy = useSharedValue(0);
  const order = items.map((i) => i.key).join('\n');
  // A move is shown by the new order itself: the offsets go the moment it is drawn.
  useLayoutEffect(() => {
    dragging.set(-1);
    target.set(-1);
    dy.set(0);
  }, [order, dragging, target, dy]);

  return (
    <View>
      {items.map((item, i) => (
        <Row
          key={item.key}
          item={item}
          index={i}
          count={items.length}
          dragging={dragging}
          target={target}
          dy={dy}
          onMove={onMove}
          end={renderEnd?.(item, i)}
        >
          {renderRow(item, i)}
        </Row>
      ))}
    </View>
  );
}

function Row({
  item,
  index,
  count,
  dragging,
  target,
  dy,
  onMove,
  end,
  children,
}: {
  item: ReorderItem;
  index: number;
  count: number;
  dragging: SharedValue<number>;
  target: SharedValue<number>;
  dy: SharedValue<number>;
  onMove: (from: number, to: number) => void;
  end?: ReactNode;
  children: ReactNode;
}) {
  const t = useTheme();
  const ok = useMotionOk();
  const tick = () => haptic('select');

  const pan = Gesture.Pan()
    .withTestId(`reorder-${item.name}`)
    .minDistance(0)
    .onStart(() => {
      dragging.set(index);
      target.set(index);
      dy.set(0);
      runOnJS(tick)();
    })
    .onChange((e) => {
      dy.set(e.translationY);
      const to = Math.min(count - 1, Math.max(0, Math.round(index + e.translationY / REORDER_ROW)));
      if (to !== target.get()) {
        target.set(to);
        runOnJS(tick)();
      }
    })
    .onEnd(() => {
      const to = target.get();
      if (to === index) {
        dragging.set(-1);
        dy.set(0);
        return;
      }
      // The offsets stay until the new order is drawn, so nothing jumps back for a frame.
      dy.set(REORDER_ROW * (to - index));
      runOnJS(onMove)(index, to);
    })
    .onFinalize(() => {
      if (dragging.get() === index && target.get() === index) dragging.set(-1);
    });

  const style = useAnimatedStyle(() => {
    const from = dragging.get();
    if (from === index) {
      return { transform: [{ translateY: dy.get() }], zIndex: 2, elevation: 4 };
    }
    let shift = 0;
    if (from >= 0) {
      const to = target.get();
      if (from < index && index <= to) shift = -REORDER_ROW;
      else if (to <= index && index < from) shift = REORDER_ROW;
    }
    return {
      transform: [{ translateY: ok ? withTiming(shift, { duration: MOTION.fast }) : shift }],
      zIndex: 0,
      elevation: 0,
    };
  });

  const actions = [
    ...(index > 0 ? [{ name: 'moveUp', label: 'Move up' }] : []),
    ...(index < count - 1 ? [{ name: 'moveDown', label: 'Move down' }] : []),
  ];
  return (
    <Animated.View
      style={[styles.row, { backgroundColor: t.surface, borderBottomColor: t.line }, style]}
    >
      <View
        accessible
        accessibilityLabel={`Stop ${index + 1}, ${item.name}`}
        accessibilityActions={actions}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'moveUp') onMove(index, index - 1);
          if (e.nativeEvent.actionName === 'moveDown') onMove(index, index + 1);
        }}
        style={styles.content}
      >
        {children}
      </View>
      {end}
      <GestureDetector gesture={pan}>
        <View accessibilityLabel={`Drag to reorder ${item.name}`} hitSlop={8} style={styles.handle}>
          <Icon name="drag" size={22} color={t.ink2} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: REORDER_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  handle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
