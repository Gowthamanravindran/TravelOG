import { photoPlacement, type Layer, type StudioFont } from '@travelog/core';
import { Image, Platform, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { Icon, isIconName } from '@/ui/icon';
import { rotationStyle } from './rotation';

/** What the canvas needs to know about a trip photo. */
export interface PhotoInfo {
  uri: string | null;
  width: number | null;
  height: number | null;
}

export interface StatItem {
  value: string;
  label: string;
}

export const FONT_FAMILY: Record<StudioFont, string | undefined> = {
  sans: undefined,
  serif: Platform.select({ ios: 'Georgia', default: 'serif' }),
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  hand: Platform.select({ ios: 'Noteworthy', default: 'cursive' }),
};

export const FONT_LABEL: Record<StudioFont, string> = {
  sans: 'Clean',
  serif: 'Classic',
  mono: 'Typewriter',
  hand: 'Handwritten',
};

/**
 * One layer drawn at `scale` screen points per canvas pixel. Positions are
 * absolute inside the canvas. Uses React Native's Image (not expo-image) so the
 * slides can be captured into pictures on Android.
 */
export function LayerView({
  layer,
  scale,
  photo,
  stats,
  onImageLoad,
}: {
  layer: Layer;
  scale: number;
  photo?: PhotoInfo;
  stats?: StatItem[];
  /** Called when the photo has loaded (or failed), so exports can wait for it. */
  onImageLoad?: () => void;
}) {
  const box = {
    position: 'absolute' as const,
    left: layer.x * scale,
    top: layer.y * scale,
    width: layer.w * scale,
    height: layer.h * scale,
    transform: rotationStyle(layer.rotation),
  };

  switch (layer.kind) {
    case 'photo': {
      const f = layer.frame;
      const inner = {
        w: Math.max(1, (layer.w - 2 * f.border) * scale),
        h: Math.max(1, (layer.h - 2 * f.border) * scale),
      };
      const place = photoPlacement(
        inner.w,
        inner.h,
        photo?.width || inner.w,
        photo?.height || inner.h,
        layer.crop,
      );
      return (
        <View
          style={[
            box,
            {
              padding: f.border * scale,
              backgroundColor: f.border ? f.borderColor : 'transparent',
              borderRadius: f.radius * scale,
            },
            f.shadow && styles.shadow,
          ]}
        >
          <View
            style={{
              flex: 1,
              overflow: 'hidden',
              borderRadius: Math.max(0, f.radius - f.border) * scale,
              backgroundColor: '#00000014',
            }}
          >
            {photo?.uri ? (
              <Image
                source={{ uri: photo.uri }}
                onLoadEnd={onImageLoad}
                style={{
                  position: 'absolute',
                  left: place.x,
                  top: place.y,
                  width: place.w,
                  height: place.h,
                }}
              />
            ) : (
              <View style={styles.empty}>
                <Icon name="addPhoto" size={Math.max(12, 64 * scale)} color="#00000055" />
              </View>
            )}
          </View>
        </View>
      );
    }

    case 'text': {
      const style: TextStyle = {
        fontFamily: FONT_FAMILY[layer.font],
        fontSize: layer.size * scale,
        lineHeight: layer.size * scale * 1.15,
        color: layer.color,
        fontWeight: layer.bold ? '800' : '400',
        textAlign: layer.align,
      };
      return (
        <View style={[box, { justifyContent: 'center' }]}>
          <Text
            style={[
              style,
              layer.background
                ? {
                    backgroundColor: layer.background,
                    paddingHorizontal: 18 * scale,
                    borderRadius: 14 * scale,
                    overflow: 'hidden',
                    alignSelf:
                      layer.align === 'left'
                        ? 'flex-start'
                        : layer.align === 'right'
                          ? 'flex-end'
                          : 'center',
                  }
                : null,
            ]}
          >
            {layer.text}
          </Text>
        </View>
      );
    }

    case 'sticker':
      return (
        <View style={[box, styles.center]}>
          {isIconName(layer.icon) ? (
            <Icon
              name={layer.icon}
              size={Math.min(layer.w, layer.h) * 0.9 * scale}
              color={layer.color}
            />
          ) : (
            <Text style={{ fontSize: Math.min(layer.w, layer.h) * 0.78 * scale }}>
              {layer.emoji}
            </Text>
          )}
        </View>
      );

    case 'stats':
      return (
        <View
          style={[
            box,
            styles.stats,
            { backgroundColor: layer.color, borderRadius: 28 * scale, padding: 24 * scale },
          ]}
        >
          {(stats ?? []).map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ color: '#FFFFFF', fontSize: 64 * scale, fontWeight: '800' }}
              >
                {s.value}
              </Text>
              <Text numberOfLines={1} style={{ color: '#FFFFFFCC', fontSize: 26 * scale }}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      );
  }
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center' },
  stat: { width: '50%', paddingVertical: 6 },
});
