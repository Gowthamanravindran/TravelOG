import {
  STUDIO_FONTS,
  type Background,
  type Frame,
  type Layer,
  type StudioDoc,
  type TextLayer,
} from '@travelog/core';
import type { Photo } from '@travelog/db';
import { type } from '@travelog/ui';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import type { IconName } from '@/ui/icon';
import { Button, Chip, ChipRow, Row } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

import { FONT_LABEL } from './layer-view';

export const SWATCHES = [
  '#FFFFFF',
  '#FAF7F2',
  '#EFE7DA',
  '#1B1A3A',
  '#0F1020',
  '#FF6B5B',
  '#5B5BD6',
  '#14B8A6',
  '#F59E0B',
  '#E11D48',
  '#0EA5E9',
  '#22C55E',
  '#A855F7',
  '#9CA3AF',
  '#000000',
];

export const GRADIENTS: [string, string][] = [
  ['#FF6B5B', '#FFB86B'],
  ['#5B5BD6', '#14B8A6'],
  ['#0F1020', '#5B5BD6'],
  ['#FFE6E2', '#E7E7FB'],
  ['#0EA5E9', '#22C55E'],
  ['#A855F7', '#E11D48'],
  ['#F59E0B', '#E11D48'],
  ['#1B1A3A', '#000000'],
  ['#FAF7F2', '#EFE7DA'],
];

export const STICKERS: IconName[] = [
  'flight',
  'beach',
  'mountain',
  'waves',
  'sun',
  'food',
  'place',
  'heart',
  'sparkle',
  'car',
  'train',
  'camping',
  'hiking',
  'camera',
  'plan',
  'flower',
  'drink',
  'globe',
  'star',
];

export const FRAME_STYLES: { label: string; frame: Frame }[] = [
  { label: 'Plain', frame: { radius: 0, border: 0, borderColor: '#FFFFFF', shadow: false } },
  { label: 'Rounded', frame: { radius: 32, border: 0, borderColor: '#FFFFFF', shadow: false } },
  { label: 'Border', frame: { radius: 0, border: 14, borderColor: '#FFFFFF', shadow: false } },
  { label: 'Print', frame: { radius: 4, border: 22, borderColor: '#FFFFFF', shadow: true } },
];

export function Swatches({
  value,
  onPick,
  label,
}: {
  value: string | null;
  onPick: (color: string) => void;
  label: string;
}) {
  const t = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
    >
      {SWATCHES.map((c) => (
        <Pressable
          key={c}
          onPress={() => onPick(c)}
          accessibilityRole="button"
          accessibilityLabel={`${label} ${c}`}
          accessibilityState={{ selected: value === c }}
          hitSlop={4}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: c,
            borderWidth: value === c ? 3 : 1,
            borderColor: value === c ? t.accent : t.line,
          }}
        />
      ))}
    </ScrollView>
  );
}

/** Trip photos to drop onto the canvas (or into the selected frame). */
export function PhotoTray({
  photos,
  used,
  onPick,
  hint,
}: {
  photos: Photo[];
  used: string[];
  onPick: (photo: Photo) => void;
  hint: string;
}) {
  const t = useTheme();
  if (!photos.length)
    return (
      <Text style={[type.caption, { color: t.ink2 }]}>
        No trip photos yet. Add them in the Memories tab.
      </Text>
    );
  return (
    <View style={{ gap: 6 }}>
      <Text style={[type.caption, { color: t.ink2 }]}>{hint}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {photos.map((p) =>
          p.localUri ? (
            <Pressable
              key={p.id}
              onPress={() => onPick(p)}
              accessibilityRole="imagebutton"
              accessibilityLabel={used.includes(p.id) ? 'Trip photo, already used' : 'Trip photo'}
            >
              <Image
                source={{ uri: p.localUri }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 10,
                  opacity: used.includes(p.id) ? 0.55 : 1,
                  borderWidth: used.includes(p.id) ? 2 : 0,
                  borderColor: t.accent,
                }}
              />
            </Pressable>
          ) : null,
        )}
      </ScrollView>
    </View>
  );
}

export function BackgroundPanel({
  background,
  onChange,
}: {
  background: Background;
  onChange: (bg: Background) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Swatches
        label="Background"
        value={background.kind === 'color' ? background.color : null}
        onPick={(color) => onChange({ kind: 'color', color })}
      />
      <Row>
        {GRADIENTS.map(([from, to]) => {
          const on =
            background.kind === 'gradient' && background.from === from && background.to === to;
          return (
            <Pressable
              key={from + to}
              onPress={() => onChange({ kind: 'gradient', from, to, angle: 0 })}
              accessibilityRole="button"
              accessibilityLabel={`Gradient ${from} to ${to}`}
              accessibilityState={{ selected: on }}
              style={{
                width: 56,
                height: 32,
                borderRadius: 10,
                flexDirection: 'row',
                overflow: 'hidden',
                borderWidth: on ? 3 : 1,
                borderColor: on ? t.accent : t.line,
              }}
            >
              <View style={{ flex: 1, backgroundColor: from }} />
              <View style={{ flex: 1, backgroundColor: to }} />
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

export function SlidesPanel({
  doc,
  current,
  onAdd,
  onRemove,
  onMove,
}: {
  doc: StudioDoc;
  current: number;
  onAdd: () => void;
  onRemove: () => void;
  onMove: (to: number) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[type.caption, { color: t.ink2 }]}>
        Slide {current + 1} of {doc.slides} · scroll the canvas to pick a slide
      </Text>
      <Row>
        <Button label="Add slide" icon="add" small onPress={onAdd} disabled={doc.slides >= 10} />
        <Button
          label="Remove this slide"
          small
          variant="secondary"
          danger
          onPress={onRemove}
          disabled={doc.slides <= 1}
        />
      </Row>
      <Row>
        <Button
          label="Move left"
          icon="left"
          small
          variant="secondary"
          onPress={() => onMove(current - 1)}
          disabled={current === 0}
        />
        <Button
          label="Move right"
          icon="right"
          small
          variant="secondary"
          onPress={() => onMove(current + 1)}
          disabled={current >= doc.slides - 1}
        />
      </Row>
    </View>
  );
}

/** Tools for the selected item. */
export function LayerPanel({
  layer,
  cropping,
  onPatch,
  onToggleCrop,
  onReplace,
  onArrange,
  onDuplicate,
  onDelete,
  onDone,
}: {
  layer: Layer;
  cropping: boolean;
  onPatch: (patch: Partial<Layer>) => void;
  onToggleCrop: () => void;
  onReplace: () => void;
  onArrange: (to: 'forward' | 'backward') => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDone: () => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      {layer.kind === 'photo' ? (
        <>
          <Row>
            <Button label="Replace" small onPress={onReplace} />
            {cropping ? (
              <>
                <Button
                  label="Zoom out"
                  icon="remove"
                  variant="secondary"
                  small
                  onPress={() =>
                    onPatch({
                      crop: { ...layer.crop, scale: Math.max(1, layer.crop.scale - 0.25) },
                    } as Partial<Layer>)
                  }
                />
                <Button
                  label="Zoom in"
                  icon="add"
                  variant="secondary"
                  small
                  onPress={() =>
                    onPatch({
                      crop: { ...layer.crop, scale: Math.min(8, layer.crop.scale + 0.25) },
                    } as Partial<Layer>)
                  }
                />
              </>
            ) : null}
            <Button
              label={cropping ? 'Done cropping' : 'Crop'}
              icon={cropping ? 'check' : 'crop'}
              small
              variant={cropping ? 'primary' : 'secondary'}
              onPress={onToggleCrop}
              disabled={!layer.photoId}
            />
          </Row>
          <ChipRow>
            {FRAME_STYLES.map((f) => (
              <Chip
                key={f.label}
                label={f.label}
                selected={JSON.stringify(layer.frame) === JSON.stringify(f.frame)}
                onPress={() => onPatch({ frame: f.frame } as Partial<Layer>)}
              />
            ))}
          </ChipRow>
        </>
      ) : null}
      {layer.kind === 'text' ? <TextTools layer={layer} onPatch={onPatch} /> : null}
      {layer.kind === 'sticker' ? (
        <Swatches
          label="Sticker colour"
          value={layer.color}
          onPick={(color) => onPatch({ color } as Partial<Layer>)}
        />
      ) : null}
      {layer.kind === 'stats' ? (
        <Swatches
          label="Card colour"
          value={layer.color}
          onPick={(color) => onPatch({ color } as Partial<Layer>)}
        />
      ) : null}
      <ChipRow>
        <Chip label="Smaller" icon="remove" onPress={() => onPatch(scaledPatch(layer, 1 / 1.1))} />
        <Chip label="Bigger" icon="add" onPress={() => onPatch(scaledPatch(layer, 1.1))} />
        <Chip
          label="Rotate left"
          icon="undo"
          onPress={() => onPatch({ rotation: roundAngle(layer.rotation - 15) })}
        />
        <Chip
          label="Rotate right"
          icon="redo"
          onPress={() => onPatch({ rotation: roundAngle(layer.rotation + 15) })}
        />
        {layer.rotation ? (
          <Chip label="Straighten" onPress={() => onPatch({ rotation: 0 })} />
        ) : null}
      </ChipRow>
      <ChipRow>
        <Chip label="Forward" onPress={() => onArrange('forward')} />
        <Chip label="Back" onPress={() => onArrange('backward')} />
        <Chip label="Duplicate" onPress={onDuplicate} />
        <Chip label="Delete" onPress={onDelete} />
        <Chip label="Done" selected onPress={onDone} />
      </ChipRow>
    </View>
  );
}

function TextTools({ layer, onPatch }: { layer: TextLayer; onPatch: (p: Partial<Layer>) => void }) {
  const t = useTheme();
  const patch = (p: Partial<TextLayer>) => onPatch(p as Partial<Layer>);
  return (
    <View style={{ gap: 8 }}>
      <TextInput
        accessibilityLabel="Text"
        value={layer.text}
        onChangeText={(text) => patch({ text })}
        placeholder="Write something"
        placeholderTextColor={t.ink2}
        maxLength={200}
        style={[
          type.body,
          {
            color: t.ink,
            backgroundColor: t.surface,
            borderColor: t.line,
            borderWidth: 1,
            borderRadius: 12,
            padding: 10,
          },
        ]}
      />
      <ChipRow>
        {STUDIO_FONTS.map((f) => (
          <Chip
            key={f}
            label={FONT_LABEL[f]}
            selected={layer.font === f}
            onPress={() => patch({ font: f })}
          />
        ))}
      </ChipRow>
      <Swatches label="Text colour" value={layer.color} onPick={(color) => patch({ color })} />
      <ChipRow>
        <Chip
          label="Smaller"
          onPress={() => patch({ size: Math.max(12, Math.round(layer.size / 1.15)) })}
        />
        <Chip
          label="Bigger"
          onPress={() => patch({ size: Math.min(600, Math.round(layer.size * 1.15)) })}
        />
        <Chip label="Bold" selected={layer.bold} onPress={() => patch({ bold: !layer.bold })} />
        <Chip
          label={`Align ${layer.align}`}
          onPress={() =>
            patch({
              align:
                layer.align === 'left' ? 'center' : layer.align === 'center' ? 'right' : 'left',
            })
          }
        />
        <Chip
          label="Label"
          selected={layer.background !== null}
          onPress={() => patch({ background: layer.background ? null : '#FFFFFF' })}
        />
      </ChipRow>
    </View>
  );
}

/** Grows or shrinks an item around its centre (text size too). */
function scaledPatch(layer: Layer, k: number): Partial<Layer> {
  const w = Math.max(40, layer.w * k);
  const h = Math.max(40, layer.h * k);
  const patch: Partial<Layer> = {
    x: layer.x + (layer.w - w) / 2,
    y: layer.y + (layer.h - h) / 2,
    w,
    h,
  };
  if (layer.kind === 'text')
    (patch as { size?: number }).size = Math.max(12, Math.min(600, layer.size * (w / layer.w)));
  return patch;
}

function roundAngle(deg: number): number {
  return ((Math.round(deg) + 540) % 360) - 180;
}
