import {
  STUDIO_TEMPLATES,
  canvasSize,
  fitTemplate,
  slideSize,
  type StudioDoc,
  type StudioFormat,
  type StudioTemplateId,
} from '@travelog/core';
import { newId } from '@travelog/db';
import { type } from '@travelog/ui';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useTheme } from '@/ui/theme';

import type { PhotoInfo, StatItem } from './layer-view';
import { StudioCanvas } from './studio-canvas';

const TEMPLATES = STUDIO_TEMPLATES.filter((x) => x.id !== 'blank');
const THUMB_H = 92;

/**
 * Layouts as a horizontal strip of live previews of the same photos (Plan 22/23).
 * `onPick` gets the layout already fitted to the photos.
 */
export function LayoutStrip({
  photoIds,
  format,
  current,
  heading,
  photos,
  stats,
  onPick,
}: {
  photoIds: readonly string[];
  format: StudioFormat;
  current: StudioTemplateId | null;
  heading: string;
  photos: Record<string, PhotoInfo>;
  stats: StatItem[];
  onPick: (template: StudioTemplateId, doc: StudioDoc) => void;
}) {
  const t = useTheme();
  const docs = useMemo(() => {
    const out = {} as Record<StudioTemplateId, StudioDoc>;
    for (const tpl of TEMPLATES)
      out[tpl.id] = fitTemplate(tpl.id, format, photoIds, newId, heading);
    return out;
  }, [format, photoIds, heading]);
  const s = THUMB_H / slideSize(format).height;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
    >
      {TEMPLATES.map((tpl) => {
        const d = docs[tpl.id];
        const on = tpl.id === current;
        return (
          <Pressable
            key={tpl.id}
            onPress={() => onPick(tpl.id, d)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Layout ${tpl.name}`}
            style={{ gap: 6, alignItems: 'center' }}
          >
            <View
              style={{
                width: 140,
                height: THUMB_H,
                borderRadius: 12,
                overflow: 'hidden',
                borderWidth: on ? 3 : 1,
                borderColor: on ? t.accent : t.line,
              }}
            >
              <View pointerEvents="none" style={{ width: Math.max(140, canvasSize(d).width * s) }}>
                <StudioCanvas doc={d} scale={s} photos={photos} stats={stats} />
              </View>
            </View>
            <Text style={[type.label, { color: on ? t.accent : t.ink }]}>{tpl.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
