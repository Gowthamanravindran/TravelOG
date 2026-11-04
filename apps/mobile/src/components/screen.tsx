import { radius, spacing, type, type Theme } from '@travelog/ui';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Screen({ theme, children }: { theme: Theme; children: ReactNode }) {
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

export function Heading({
  theme,
  eyebrow,
  title,
}: {
  theme: Theme;
  eyebrow?: string;
  title: string;
}) {
  return (
    <View style={styles.heading}>
      {eyebrow ? (
        <Text style={[type.label, styles.eyebrow, { color: theme.accent }]}>{eyebrow}</Text>
      ) : null}
      <Text accessibilityRole="header" style={[type.display, { color: theme.ink }]}>
        {title}
      </Text>
    </View>
  );
}

export function Card({ theme, children }: { theme: Theme; children: ReactNode }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      {children}
    </View>
  );
}

export function Body({
  theme,
  children,
  muted,
}: {
  theme: Theme;
  children: ReactNode;
  muted?: boolean;
}) {
  return <Text style={[type.body, { color: muted ? theme.ink2 : theme.ink }]}>{children}</Text>;
}

export function Button({
  theme,
  label,
  onPress,
  variant = 'primary',
}: {
  theme: Theme;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: primary ? theme.accent : theme.surface2, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[type.headline, { color: primary ? theme.onAccent : theme.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  heading: { gap: spacing.xs, paddingTop: spacing.sm },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm },
  button: {
    minHeight: 48,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
});
