import type { CollageLayout, Rect } from '@travelog/core';
import type { ComponentRef, Ref } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Draws a collage from a layout (fractions of the canvas). Uses React Native's
 * Image (not expo-image) so the view can be captured into a picture on Android.
 */

export const COLLAGE_ACCENTS = ['#FF5A4E', '#5B5BD6', '#14B8A6', '#F59E0B'] as const;

export interface CollageStat {
  value: string;
  label: string;
}

export type CanvasRef = ComponentRef<typeof View>;

interface Props {
  ref?: Ref<CanvasRef>;
  layout: CollageLayout;
  /** Canvas size in points on screen. */
  width: number;
  height: number;
  photoUris: (string | null)[];
  title: string;
  subtitle: string;
  stats?: CollageStat[];
  accent: string;
  /** Called when a photo slot is tapped (to swap it). */
  onSlotPress?: (index: number) => void;
  selectedSlot?: number | null;
}

const place = (r: Rect, width: number, height: number) => ({
  position: 'absolute' as const,
  left: r.x * width,
  top: r.y * height,
  width: r.w * width,
  height: r.h * height,
  transform: r.rotate ? [{ rotate: `${r.rotate}deg` }] : undefined,
});

export function CollageCanvas({
  ref,
  layout,
  width,
  height,
  photoUris,
  title,
  subtitle,
  stats,
  accent,
  onSlotPress,
  selectedSlot,
}: Props) {
  const s = width / 1080; // text scale relative to the 1080 px export
  const bg = layout.dark ? '#0F1020' : '#FAF7F2';
  const ink = layout.dark ? '#F5F3EE' : '#1A1A2E';
  const muted = layout.dark ? '#A8A6B8' : '#6B6878';

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{ width, height, backgroundColor: bg, overflow: 'hidden' }}
      accessibilityLabel={`Collage: ${title}`}
    >
      <View style={[place(layout.title, width, height), styles.titleBox]}>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          style={{ color: ink, fontSize: 72 * s, fontWeight: '800', letterSpacing: -1 * s }}
        >
          {title}
        </Text>
        <Text numberOfLines={1} style={{ color: accent, fontSize: 30 * s, fontWeight: '700' }}>
          {subtitle}
        </Text>
      </View>

      {layout.frame === 'film' ? (
        <View
          style={[
            styles.film,
            {
              left: (layout.slots[0]?.x ?? 0) * width - 44 * s,
              width: (layout.slots[0]?.w ?? 0) * width + 88 * s,
              top: layout.title.y * height + layout.title.h * height,
              bottom: (1 - layout.footer.y) * height,
              borderLeftWidth: 18 * s,
              borderRightWidth: 18 * s,
            },
          ]}
        />
      ) : null}

      {layout.slots.map((r, i) => {
        const uri = photoUris[i];
        const box = place(r, width, height);
        const polaroid = layout.frame === 'polaroid';
        const border = polaroid ? 18 * s : 0;
        return (
          <Pressable
            key={i}
            disabled={!onSlotPress}
            onPress={() => onSlotPress?.(i)}
            style={[
              box,
              {
                backgroundColor: polaroid ? '#FFFFFF' : layout.dark ? '#1E2036' : '#ECE7DE',
                padding: border,
                paddingBottom: polaroid ? border * 4 : 0,
                borderRadius: polaroid ? 4 * s : 22 * s,
                overflow: 'hidden',
              },
              polaroid && styles.shadow,
              selectedSlot === i && { borderWidth: 6 * s, borderColor: accent },
            ]}
            accessibilityRole={onSlotPress ? 'button' : undefined}
            accessibilityLabel={onSlotPress ? `Photo ${i + 1}, tap to change` : undefined}
          >
            {uri ? (
              <Image
                source={{ uri }}
                resizeMode="cover"
                style={{ flex: 1, borderRadius: polaroid ? 0 : 22 * s }}
              />
            ) : (
              <View style={styles.empty}>
                <Text style={{ color: muted, fontSize: 28 * s }}>+ photo</Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {layout.stats && stats?.length ? (
        <View
          style={[
            place(layout.stats, width, height),
            styles.stats,
            { borderRadius: 28 * s, padding: 28 * s, backgroundColor: accent },
          ]}
        >
          {stats.map((st) => (
            <View key={st.label} style={styles.stat}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ color: '#FFFFFF', fontSize: 64 * s, fontWeight: '800' }}
              >
                {st.value}
              </Text>
              <Text numberOfLines={1} style={{ color: '#FFFFFFCC', fontSize: 26 * s }}>
                {st.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[place(layout.footer, width, height), styles.footer]}>
        <Text style={{ color: muted, fontSize: 26 * s, fontWeight: '600' }}>
          Plan this trip on <Text style={{ color: accent, fontWeight: '800' }}>TravelOG</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleBox: { justifyContent: 'flex-end' },
  film: {
    position: 'absolute',
    backgroundColor: '#05060F',
    borderStyle: 'dashed',
    borderColor: '#F5F3EE55',
  },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center' },
  stat: { width: '50%', paddingVertical: 6 },
  footer: { justifyContent: 'center' },
});
