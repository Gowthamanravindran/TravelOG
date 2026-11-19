import { font, radius, spacing, type } from '@travelog/ui';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/ui/icon';
import { Pop } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/** A search result: tap to add. `tag` says what it is ("Country", "City") or "Added". */
export function ResultRow({
  title,
  subtitle,
  tag,
  flag,
  accessibilityLabel,
  onPress,
}: {
  title: string;
  subtitle?: string;
  tag: string;
  /** Flag image as a data URI. */
  flag?: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.row, { borderBottomColor: t.line }]}
    >
      {flag ? <Image source={{ uri: flag }} style={styles.flag} /> : null}
      <View style={styles.rowText}>
        <Text style={[type.body, { color: t.ink, ...font('text', 600) }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.caption, { color: t.ink2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={[type.caption, { color: t.ink2 }]}>{tag}</Text>
    </Pressable>
  );
}

/** Something that was picked: its name (and its number in the route), tap to remove. */
export function PickChip({
  label,
  number,
  flag,
  onRemove,
}: {
  label: string;
  number?: number;
  flag?: string;
  onRemove: () => void;
}) {
  const t = useTheme();
  return (
    <Pop style={styles.chipWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label}`}
        onPress={onRemove}
        style={[styles.chip, { borderColor: t.line, backgroundColor: t.surface }]}
      >
        {number != null ? (
          <View style={[styles.number, { backgroundColor: t.accent }]}>
            <Text style={[type.caption, { color: t.onAccent, ...font('text', 600) }]}>
              {number}
            </Text>
          </View>
        ) : flag ? (
          <Image source={{ uri: flag }} style={styles.flag} />
        ) : null}
        <Text style={[type.label, { color: t.ink }]} numberOfLines={1}>
          {label}
        </Text>
        <Icon name="close" size={14} color={t.ink2} />
      </Pressable>
    </Pop>
  );
}

/** A stop's place in the visit order, as a filled circle. */
export function StopNumber({ n }: { n: number }) {
  const t = useTheme();
  return (
    <View style={[styles.stopNumber, { backgroundColor: t.accent }]}>
      <Text style={[type.caption, { color: t.onAccent, ...font('text', 600) }]}>{n}</Text>
    </View>
  );
}

/** A round button with an icon alone: it gets a spoken name and a full 44 pt target. */
export function IconButton({
  label,
  icon,
  disabled,
  onPress,
}: {
  label: string;
  icon: 'add' | 'remove' | 'close';
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.iconButton, { borderColor: t.line, opacity: disabled ? 0.4 : 1 }]}
    >
      <Icon name={icon} size={20} color={t.ink} />
    </Pressable>
  );
}

export function Chips({ children }: { children: React.ReactNode }) {
  return <View style={styles.chips}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 1 },
  flag: { width: 24, height: 18, borderRadius: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipWrap: { maxWidth: '100%' },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.chip,
    borderWidth: 1,
    maxWidth: '100%',
  },
  number: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
