import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useMotionOk } from './motion';

/**
 * A photo from the network, done the way production apps do it (Plan 53):
 * - something is always on screen at once: `fallback` (our 3D art) underneath, and the
 *   photo's BlurHash preview over it when we have one;
 * - the right-sized photo then cross-fades in, kept in memory and on disk, so it shows
 *   instantly next time and offline;
 * - if it fails, the image layer goes away and the fallback stays. No spinner, no
 *   broken image, no timeout to tune.
 * Feed and Nearby reuse this, with `recyclingKey` for list rows.
 */
export function RemoteImage({
  uri,
  blurhash,
  fallback,
  style,
  priority = 'normal',
  recyclingKey,
  accessibilityLabel,
}: {
  uri: string | null;
  blurhash?: string | null;
  fallback: ReactNode;
  style?: StyleProp<ViewStyle>;
  priority?: 'low' | 'normal' | 'high';
  recyclingKey?: string;
  accessibilityLabel?: string;
}) {
  const motionOk = useMotionOk();
  const [failed, setFailed] = useState<string | null>(null);
  const show = !!uri && failed !== uri;
  return (
    <View style={[styles.box, style]}>
      {fallback}
      {show ? (
        <Image
          testID="remote-image"
          source={{ uri }}
          placeholder={blurhash ? { blurhash } : undefined}
          placeholderContentFit="cover"
          contentFit="cover"
          transition={motionOk ? 200 : 0}
          cachePolicy="memory-disk"
          priority={priority}
          recyclingKey={recyclingKey}
          onError={() => setFailed(uri)}
          accessible={!!accessibilityLabel}
          accessibilityLabel={accessibilityLabel}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}

/** Starts downloading photos before they're on screen (e.g. the first trips' covers). */
export function prefetchImages(uris: (string | null)[]): void {
  const list = uris.filter((u): u is string => !!u);
  if (list.length) Image.prefetch(list, 'memory-disk').catch(() => {});
}

const styles = StyleSheet.create({ box: { overflow: 'hidden' } });
