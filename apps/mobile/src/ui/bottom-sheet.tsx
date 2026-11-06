import { radius } from '@travelog/ui';
import { useEffect, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MOTION, useMotionOk } from './motion';
import { useTheme } from './theme';

const EASE = { duration: MOTION.slow, easing: Easing.out(Easing.cubic) };

/**
 * The one way the app draws a bottom sheet (Plan 33). The modal window covers
 * the whole screen from its first frame (edge to edge), the sheet starts below the
 * screen and slides up once it has been measured, so it never shows in place first
 * or moves after it lands. With Reduce motion on it simply appears.
 */
export function BottomSheet({
  visible,
  onClose,
  closeLabel = 'Close',
  dismissable = true,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  closeLabel?: string;
  dismissable?: boolean;
  children: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const ok = useMotionOk();
  const offset = useSharedValue(ok ? height : 0);
  const shade = useSharedValue(ok ? 0 : 1);

  useEffect(() => {
    if (visible) return;
    // Ready for the next time it opens.
    offset.set(ok ? height : 0);
    shade.set(ok ? 0 : 1);
  }, [visible, ok, height, offset, shade]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: shade.get() }));

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={dismissable ? onClose : () => {}}
    >
      <View style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable
            style={styles.fill}
            onPress={dismissable ? onClose : undefined}
            accessibilityLabel={closeLabel}
          />
        </Animated.View>
        <Animated.View
          onLayout={() => {
            if (!ok) return;
            offset.set(withTiming(0, EASE));
            shade.set(withTiming(1, EASE));
          }}
          style={[
            styles.sheet,
            { backgroundColor: t.surface, paddingBottom: Math.max(insets.bottom, 16) },
            sheetStyle,
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: t.line }]} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: '#00000066' },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
});
