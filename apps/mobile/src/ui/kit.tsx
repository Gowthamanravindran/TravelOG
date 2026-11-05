import { radius, spacing, type } from '@travelog/ui';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from './icon';
import { useTheme } from './theme';

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
}) {
  const t = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: t.bg }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, styles.content]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function H1({ children, eyebrow }: { children: ReactNode; eyebrow?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 2 }}>
      {eyebrow ? (
        <Text style={[type.label, styles.eyebrow, { color: t.accent }]} numberOfLines={1}>
          {eyebrow}
        </Text>
      ) : null}
      <Text accessibilityRole="header" style={[type.display, { color: t.ink }]}>
        {children}
      </Text>
    </View>
  );
}

export function H2({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.rowBetween}>
      <Text accessibilityRole="header" style={[type.title, { color: t.ink }]}>
        {children}
      </Text>
      {right}
    </View>
  );
}

export function Body({
  children,
  muted,
  small,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  muted?: boolean;
  small?: boolean;
  style?: StyleProp<any>;
  numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[small ? type.caption : type.body, { color: muted ? t.ink2 : t.ink }, style]}
    >
      {children}
    </Text>
  );
}

export function Strong({ children, style }: { children: ReactNode; style?: StyleProp<any> }) {
  const t = useTheme();
  return <Text style={[type.headline, { color: t.ink }, style]}>{children}</Text>;
}

export function Card({
  children,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const base = [styles.card, { backgroundColor: t.surface, borderColor: t.line }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [...base, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  small,
  danger,
  accessibilityLabel,
  icon,
}: {
  label: string;
  /** Icon before the label (or alone when the label is empty). */
  icon?: IconName;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'link';
  disabled?: boolean;
  small?: boolean;
  danger?: boolean;
  /** Required when the label is only an icon, so screen readers say what it does. */
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  if (variant === 'link') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        onPress={onPress}
        disabled={disabled}
        hitSlop={12}
      >
        <View style={styles.inline}>
          {icon ? <Icon name={icon} size={18} color={danger ? t.danger : t.accent} /> : null}
          {label ? (
            <Text style={[type.label, { color: danger ? t.danger : t.accent }]}>{label}</Text>
          ) : null}
        </View>
      </Pressable>
    );
  }
  const primary = variant === 'primary';
  const bg = danger ? t.danger : primary ? t.accent : t.surface2;
  const fg = primary || danger ? t.onAccent : t.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      // Small buttons are 36 pt tall; extend the touch area to the 44 pt minimum.
      hitSlop={small ? 4 : undefined}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.inline}>
        {icon ? <Icon name={icon} size={small ? 18 : 20} color={fg} /> : null}
        {label ? (
          <Text style={[small ? type.label : type.headline, { color: fg }]}>{label}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const t = useTheme();
  const content = (
    <View style={styles.inline}>
      {icon ? <Icon name={icon} size={16} color={selected ? t.onAccent : t.ink2} /> : null}
      <Text style={[type.label, { color: selected ? t.onAccent : t.ink }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
  const style = [styles.chip, { backgroundColor: selected ? t.accent : t.surface2 }];
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={6}
      style={style}
    >
      {content}
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {children}
    </ScrollView>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: t.surface2 }]} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && { backgroundColor: t.surface }]}
          >
            <Text style={[type.label, { color: selected ? t.ink : t.ink2 }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({
  label,
  hint,
  error,
  ...input
}: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[type.caption, styles.fieldLabel, { color: t.ink2 }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={t.ink2}
        {...input}
        style={[
          type.body,
          styles.input,
          { color: t.ink, backgroundColor: t.surface, borderColor: error ? t.danger : t.line },
          input.multiline && { minHeight: 80, textAlignVertical: 'top' },
        ]}
      />
      {error ? (
        <Text style={[type.caption, { color: t.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[type.caption, { color: t.ink2 }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Empty({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={[styles.empty, { borderColor: t.line }]}>
      <View style={[styles.emptyIcon, { backgroundColor: t.accentSoft }]}>
        <Icon name={icon} size={30} color={t.accent} />
      </View>
      <Text style={[type.headline, { color: t.ink, textAlign: 'center' }]}>{title}</Text>
      {body ? (
        <Text style={[type.body, { color: t.ink2, textAlign: 'center' }]}>{body}</Text>
      ) : null}
      {action}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Between({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.rowBetween, style]}>{children}</View>;
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.line }} />;
}

/** A thin progress bar; turns red when over 100 %. */
export function Bar({ value, color }: { value: number; color?: string }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      style={[styles.bar, { backgroundColor: t.surface2 }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: 99,
          backgroundColor: value > 1 ? t.danger : (color ?? t.accent),
        }}
      />
    </View>
  );
}

/** A rounded square holding an icon, used at the start of list rows and cards. */
export function IconTile({
  icon,
  size = 40,
  tint,
}: {
  icon: IconName;
  size?: number;
  /** Icon colour; the tile uses the mode's soft accent behind it. */
  tint?: string;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: t.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={size * 0.52} color={tint ?? t.accent} />
    </View>
  );
}

/** A section title with an optional primary action on the right. */
export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; icon?: IconName; onPress: () => void };
  children?: ReactNode;
}) {
  return (
    <View style={{ gap: 10 }}>
      <H2
        right={
          action ? (
            <Button label={action.label} icon={action.icon} small onPress={action.onPress} />
          ) : null
        }
      >
        {title}
      </H2>
      {children}
    </View>
  );
}

/** An icon followed by text on one line (titles of items, bookings, expenses). */
export function WithIcon({
  icon,
  children,
  color,
  size = 18,
}: {
  icon: IconName;
  children: ReactNode;
  color?: string;
  size?: number;
}) {
  const t = useTheme();
  return (
    <View style={[styles.inline, { flexShrink: 1 }]}>
      <Icon name={icon} size={size} color={color ?? t.ink2} />
      <View style={{ flexShrink: 1 }}>{children}</View>
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const t = useTheme();
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" style={[type.label, { color: t.danger }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm },
  button: {
    minHeight: 48,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: spacing.md },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    justifyContent: 'center',
  },
  chipRow: { gap: spacing.sm, paddingVertical: 2 },
  segmented: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  segment: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { textTransform: 'uppercase', letterSpacing: 0.6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  empty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bar: { height: 8, borderRadius: 99, overflow: 'hidden' },
});
