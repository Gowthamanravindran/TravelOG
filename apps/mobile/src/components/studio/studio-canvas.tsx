import { canvasSize, layersOnSlide, slideSize, type Layer, type StudioDoc } from '@travelog/core';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentRef, ReactNode, Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LayerView, type PhotoInfo, type StatItem } from './layer-view';
import { rotationStyle } from './rotation';

export type CanvasRef = ComponentRef<typeof View>;

function gradientPoints(angle: number) {
  // 0° = left→right, 90° = top→bottom.
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) / 2;
  const dy = Math.sin(rad) / 2;
  return { start: { x: 0.5 - dx, y: 0.5 - dy }, end: { x: 0.5 + dx, y: 0.5 + dy } };
}

/**
 * Draws a Studio document. In the editor it shows the whole strip with seams;
 * for export, `slide` shows one slide only (a window onto the same canvas), so
 * layers that cross a seam are cut exactly where the carousel will be swiped.
 */
export function StudioCanvas({
  ref,
  doc,
  scale,
  photos,
  stats,
  slide,
  seams = false,
  onLayerPress,
  onBackgroundPress,
  renderLayer,
  overlay,
  watermark = false,
  onImageLoad,
}: {
  ref?: Ref<CanvasRef>;
  doc: StudioDoc;
  /** Screen points per canvas pixel. */
  scale: number;
  photos: Record<string, PhotoInfo>;
  stats?: StatItem[];
  /** Show only this slide (for export). */
  slide?: number;
  seams?: boolean;
  onLayerPress?: (layer: Layer) => void;
  onBackgroundPress?: () => void;
  /** Lets the editor replace how a layer is drawn (e.g. the one being dragged). */
  renderLayer?: (layer: Layer, node: ReactNode) => ReactNode;
  overlay?: ReactNode;
  /** "Made with TravelOG" on the last slide. */
  watermark?: boolean;
  onImageLoad?: () => void;
}) {
  const { width, height } = canvasSize(doc);
  const slideW = slideSize(doc.format).width;
  const bg = doc.background;
  const offsetX = slide == null ? 0 : -slide * slideW * scale;

  const canvas = (
    <View
      style={{
        position: 'absolute',
        left: offsetX,
        top: 0,
        width: width * scale,
        height: height * scale,
        backgroundColor: bg.kind === 'color' ? bg.color : bg.from,
      }}
    >
      {bg.kind === 'gradient' ? (
        <LinearGradient
          colors={[bg.from, bg.to]}
          {...gradientPoints(bg.angle)}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {onBackgroundPress ? (
        <Pressable
          accessibilityLabel="Canvas background"
          onPress={onBackgroundPress}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {(slide == null ? doc.layers : layersOnSlide(doc, slide)).map((layer) => {
        const node = (
          <LayerView
            layer={layer}
            scale={scale}
            photo={layer.kind === 'photo' && layer.photoId ? photos[layer.photoId] : undefined}
            stats={stats}
            onImageLoad={onImageLoad}
          />
        );
        const drawn = renderLayer ? renderLayer(layer, node) : node;
        if (!onLayerPress)
          return (
            <View key={layer.id} pointerEvents="none" style={StyleSheet.absoluteFill}>
              {drawn}
            </View>
          );
        return (
          <View key={layer.id} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            {drawn}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={describe(layer)}
              onPress={() => onLayerPress(layer)}
              style={{
                position: 'absolute',
                left: layer.x * scale,
                top: layer.y * scale,
                width: layer.w * scale,
                height: layer.h * scale,
                transform: rotationStyle(layer.rotation),
              }}
            />
          </View>
        );
      })}
      {seams
        ? Array.from({ length: doc.slides - 1 }, (_, i) => (
            <SeamLine key={i} left={(i + 1) * slideW * scale - 1} height={height * scale} />
          ))
        : null}
      {seams
        ? Array.from({ length: doc.slides }, (_, i) => (
            <Text
              key={`n${i}`}
              pointerEvents="none"
              style={[styles.number, { left: i * slideW * scale + 8 }]}
            >
              {i + 1}
            </Text>
          ))
        : null}
      {watermark ? (
        <Text
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: 28 * scale,
            bottom: 22 * scale,
            fontSize: 24 * scale,
            fontWeight: '700',
            color: '#FFFFFF',
            textShadowColor: '#00000088',
            textShadowRadius: 6 * scale,
          }}
        >
          Made with TravelOG
        </Text>
      ) : null}
      {overlay}
    </View>
  );

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: (slide == null ? width : slideW) * scale,
        height: height * scale,
        overflow: 'hidden',
      }}
    >
      {canvas}
    </View>
  );
}

/**
 * A dashed line drawn as short solid segments. (A dashed border on one side
 * only is not supported on Android and broke the film-roll layout.)
 */
function SeamLine({ left, height }: { left: number; height: number }) {
  const dash = 10;
  const gap = 6;
  const count = Math.max(1, Math.floor(height / (dash + gap)));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left, top: 0, width: 2, height }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: i * (dash + gap),
            width: 2,
            height: dash,
            backgroundColor: '#FFFFFFCC',
          }}
        />
      ))}
    </View>
  );
}

function describe(layer: Layer): string {
  switch (layer.kind) {
    case 'photo':
      return layer.photoId ? 'Photo' : 'Empty photo frame';
    case 'text':
      return `Text: ${layer.text}`;
    case 'sticker':
      return `Sticker ${layer.icon ?? layer.emoji}`;
    case 'stats':
      return 'Trip stats';
  }
}

const styles = StyleSheet.create({
  number: {
    position: 'absolute',
    top: 6,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: '#00000066',
    paddingHorizontal: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
