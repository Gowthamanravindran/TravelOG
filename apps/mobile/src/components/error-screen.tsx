import { themeFor } from '@travelog/ui';
import { Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Icon } from '@/ui/icon';

/**
 * Shown when a screen crashes (docs/08 app states). Data is safe in the local
 * database, so "Try again" re-renders the screen.
 */
export function ErrorScreen({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  const t = themeFor('home', useColorScheme());
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        gap: 14,
        backgroundColor: t.bg,
      }}
    >
      <Icon name="error" size={44} color={t.accent} />
      <Text accessibilityRole="header" style={{ color: t.ink, fontSize: 24, fontWeight: '800' }}>
        Something went wrong
      </Text>
      <Text style={{ color: t.ink2, fontSize: 16 }}>
        Your trips are safe on this phone. Try again, or go back and reopen the screen.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => retry()}
        style={{
          backgroundColor: t.accent,
          borderRadius: 16,
          minHeight: 48,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: t.onAccent, fontSize: 17, fontWeight: '700' }}>Try again</Text>
      </Pressable>
      <ScrollView style={{ maxHeight: 120 }}>
        <Text selectable style={{ color: t.ink2, fontSize: 12 }}>
          {error.message}
        </Text>
      </ScrollView>
    </View>
  );
}
