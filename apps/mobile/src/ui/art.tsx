import type { TileFamily } from '@travelog/ui';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { MOTION, useMotionOk } from './motion';
import { useTheme } from './theme';

/**
 * 3D art (Plan 52): Microsoft Fluent Emoji 3D, MIT licence (assets/art/LICENSE,
 * assets/art/SOURCE.md, and the in-app Licences screen). Bundled, so it shows offline
 * from the first launch.
 */
export const ART = {
  luggage: require('../../assets/art/luggage.png'),
  airplane: require('../../assets/art/airplane.png'),
  beach: require('../../assets/art/beach-with-umbrella.png'),
  mountain: require('../../assets/art/snow-capped-mountain.png'),
  city: require('../../assets/art/cityscape.png'),
  desert: require('../../assets/art/desert.png'),
  car: require('../../assets/art/automobile.png'),
  train: require('../../assets/art/high-speed-train.png'),
  camping: require('../../assets/art/camping.png'),
  boot: require('../../assets/art/hiking-boot.png'),
  temple: require('../../assets/art/hindu-temple.png'),
  party: require('../../assets/art/party-popper.png'),
  food: require('../../assets/art/curry-rice.png'),
  map: require('../../assets/art/world-map.png'),
  globe: require('../../assets/art/globe.png'),
  sparkles: require('../../assets/art/sparkles.png'),
  ticket: require('../../assets/art/ticket.png'),
  money: require('../../assets/art/money-bag.png'),
  camera: require('../../assets/art/camera.png'),
  ballot: require('../../assets/art/ballot-box-with-ballot.png'),
  page: require('../../assets/art/page-facing-up.png'),
  picture: require('../../assets/art/framed-picture.png'),
  pin: require('../../assets/art/round-pushpin.png'),
} as const;

export type ArtName = keyof typeof ART;

/**
 * One 3D object. With `float` it bobs gently (transform only, Plan 28); with Reduce
 * motion on it stays still. Decorative: hidden from screen readers.
 */
export function Art({
  name,
  size,
  float = false,
  delay = 0,
  style,
}: {
  name: ArtName;
  size: number;
  float?: boolean;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const ok = useMotionOk();
  const y = useSharedValue(0);
  useEffect(() => {
    if (!float || !ok) return;
    const start = setTimeout(() => {
      y.set(withRepeat(withTiming(-6, { ...MOTION.ease, duration: 1600 }), -1, true));
    }, delay);
    return () => {
      clearTimeout(start);
      cancelAnimation(y);
    };
  }, [float, ok, delay, y]);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return (
    <Animated.View
      style={[style, bob]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID={`art-${name}`}
    >
      <Image source={ART[name]} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  );
}

/** A soft gradient behind art: the theme's tint of a tile family into its surface colour. */
export function ArtBackdrop({
  family,
  style,
  children,
}: {
  family: TileFamily;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const t = useTheme();
  return (
    <LinearGradient
      colors={[t.tiles[family].bg, t.scheme === 'dark' ? t.surface : t.surface2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
