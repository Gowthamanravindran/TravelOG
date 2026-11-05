import type { BottomTabBarProps } from 'expo-router/tabs';
import { font, type } from '@travelog/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './icon';
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
  const dark = t.scheme === 'dark' || t.mode === 'trip';

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
          if (route && !focused) navigateToTab(route.key);
        }}
        style={styles.item}
      >
        <View style={[styles.pill, focused && { backgroundColor: t.accentSoft }]}>
          <Icon name={tab.icon} size={22} color={focused ? t.accent : t.ink2} />
        </View>
        <Text
          numberOfLines={1}
          style={[
            type.caption,
            { color: focused ? t.accent : t.ink2, ...font('text', focused ? 600 : 500) },
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
        <Text numberOfLines={1} style={[type.caption, { color: t.ink2, ...font('text', 600) }]}>
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
        style={[
          styles.bar,
          {
            backgroundColor: t.surface,
            borderColor: t.line,
            shadowOpacity: dark ? 0.45 : 0.12,
          },
        ]}
      >
        {items}
      </View>
    </View>
  );
}

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
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', gap: 3, minHeight: 48 },
  pill: {
    width: 52,
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
    marginTop: -34,
    marginBottom: -2,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});
