import { font, radius, type } from '@travelog/ui';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './icon';
import { sheetEntering, useMotionOk } from './motion';
import { useTheme } from './theme';

export interface Choice {
  icon: IconName;
  label: string;
  body: string;
  /** The recommended option: drawn filled in the accent colour. */
  primary?: boolean;
  onPress: () => void;
}

/**
 * A small bottom sheet with a few big options (Plan 31: "Upload document" or
 * "Enter booking details"). While `busy` it shows a spinner and the message instead.
 */
export function ChoiceSheet({
  visible,
  title,
  choices,
  busy,
  onClose,
}: {
  visible: boolean;
  title: string;
  choices: Choice[];
  busy?: string | null;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const sheetIn = sheetEntering(useMotionOk());
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={busy ? undefined : onClose}
        accessibilityLabel="Close"
      />
      <Animated.View
        entering={sheetIn}
        style={[
          styles.sheet,
          { backgroundColor: t.surface, paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: t.line }]} />
        <Text style={[type.title, { color: t.ink }]}>{title}</Text>
        {busy ? (
          <View style={styles.busy} accessibilityLiveRegion="polite">
            <ActivityIndicator color={t.accent} />
            <Text style={[type.body, { color: t.ink2 }]}>{busy}</Text>
          </View>
        ) : (
          choices.map((c) => (
            <Pressable
              key={c.label}
              accessibilityRole="button"
              accessibilityLabel={c.label}
              accessibilityHint={c.body}
              onPress={c.onPress}
              style={({ pressed }) => [
                styles.choice,
                {
                  backgroundColor: c.primary ? t.accent : t.surface2,
                  borderColor: c.primary ? t.accent : t.line,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Icon name={c.icon} size={26} color={c.primary ? t.onAccent : t.ink} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={[
                    type.body,
                    { color: c.primary ? t.onAccent : t.ink, ...font('text', 600) },
                  ]}
                >
                  {c.label}
                </Text>
                <Text style={[type.caption, { color: c.primary ? t.onAccent : t.ink2 }]}>
                  {c.body}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000066' },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 4 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 24 },
});
