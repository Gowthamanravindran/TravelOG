import type { BottomTabBarProps } from 'expo-router/tabs';
import { radius, type } from '@travelog/ui';
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
 * The mode bottom bar (docs/02 ModeNavBar): accent pill behind the active item.
 * `center` adds the round add button in the middle (Home mode).
 */
export function ModeTabBar({
  state,
  navigateToTab,
  tabs,
  center,
}: BottomTabBarProps & { tabs: TabSpec[]; center?: { label: string; onPress: () => void } }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
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
        <Text style={[type.caption, { color: focused ? t.ink : t.ink2 }]}>{tab.label}</Text>
      </Pressable>
    );
  });
  if (center) {
    items.splice(
      Math.ceil(items.length / 2),
      0,
      <Pressable
        key="center"
        accessibilityRole="button"
        accessibilityLabel={center.label}
        onPress={center.onPress}
        style={[styles.fab, { backgroundColor: t.accent }]}
      >
        <Icon name="add" size={28} color={t.onAccent} />
      </Pressable>,
    );
  }
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: t.surface,
          borderTopColor: t.line,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  item: { alignItems: 'center', gap: 2, minWidth: 64, minHeight: 44 },
  pill: {
    width: 48,
    height: 30,
    borderRadius: radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
});
