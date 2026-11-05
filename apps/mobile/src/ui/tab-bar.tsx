import type { BottomTabBarProps } from 'expo-router/tabs';
import { font, type } from '@travelog/ui';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './icon';
import { haptic, MOTION, useMotionOk } from './motion';
import { useTheme } from './theme';

export interface TabSpec {
  name: string;
  label: string;
  icon: IconName;
}

/**
 * The mode bottom bar (Plan 18): a detached, floating rounded bar in the mode's
 * colours. The active tab is drawn in the accent colour on a soft pill. `center`
 * adds a raised round button above the bar (Home's "New trip").
 * The bar sits below the screen in the layout, so it never covers content.
 */
export function ModeTabBar({
  state,
  navigateToTab,
  tabs,
  center,
}: BottomTabBarProps & { tabs: TabSpec[]; center?: { label: string; onPress: () => void } }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const bar = t.tabBar;
  const ok = useMotionOk();
  // Where each tab sits in the bar, so one pill can slide to the active tab (Plan 28).
  const [spots, setSpots] = useState<Record<string, { x: number; y: number; width: number }>>({});
  const active = tabs.find((tab) => state.routes[state.index]?.name === tab.name)?.name;
  const spot = active ? spots[active] : undefined;
  const pillX = useSharedValue(0);
  useEffect(() => {
    if (!spot) return;
    const target = spot.x + (spot.width - PILL_W) / 2;
    pillX.set(ok ? withSpring(target, MOTION.spring) : target);
  }, [spot, ok, pillX]);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pillX.get() }] }));

  const items = tabs.map((tab) => {
    const index = state.routes.findIndex((r) => r.name === tab.name);
    const focused = state.index === index;
    return (
      <Pressable
        key={tab.name}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
        onPress={() => {
          const route = state.routes[index];
          if (route && !focused) {
            haptic('select');
            navigateToTab(route.key);
          }
        }}
        onLayout={(e) => {
          const { x, y, width } = e.nativeEvent.layout;
          setSpots((s) =>
            s[tab.name]?.x === x && s[tab.name]?.y === y && s[tab.name]?.width === width
              ? s
              : { ...s, [tab.name]: { x, y, width } },
          );
        }}
        style={styles.item}
      >
        <View style={styles.pill}>
          <Icon name={tab.icon} size={22} color={focused ? bar.activeFg : bar.fg} />
        </View>
        <Text
          numberOfLines={1}
          style={[
            type.caption,
            { color: focused ? bar.activeLabel : bar.fg, ...font('text', focused ? 600 : 500) },
          ]}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  });

  if (center) {
    items.splice(
      Math.ceil(items.length / 2),
      0,
      <View key="center" style={styles.item}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={center.label}
          onPress={center.onPress}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: t.accent,
              borderColor: t.bg,
              shadowColor: t.accent,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Icon name="add" size={28} color={t.onAccent} />
        </Pressable>
        <Text numberOfLines={1} style={[type.caption, { color: bar.fg, ...font('text', 600) }]}>
          {center.label}
        </Text>
      </View>,
    );
  }

  return (
    <View
      style={[styles.outer, { backgroundColor: t.bg, paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View
        testID="tab-bar"
        style={[
          styles.bar,
          {
            backgroundColor: bar.bg,
            borderColor: bar.line ?? bar.bg,
            shadowOpacity: t.scheme === 'dark' ? 0.3 : 0.08,
          },
        ]}
      >
        <Animated.View
          testID="tab-pill"
          pointerEvents="none"
          style={[
            styles.slidingPill,
            { backgroundColor: bar.activeBg, opacity: spot ? 1 : 0, top: spot?.y ?? 8 },
            pillStyle,
          ]}
        />
        {items}
      </View>
    </View>
  );
}

const PILL_W = 52;

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 16, paddingTop: 10 },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', gap: 3, minHeight: 48 },
  slidingPill: {
    position: 'absolute',
    left: 0,
    width: PILL_W,
    height: 30,
    borderRadius: 15,
  },
  pill: {
    width: PILL_W,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    marginBottom: -2,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});
