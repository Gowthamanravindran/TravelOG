import {
  STUDIO_TEMPLATES,
  canvasSize,
  fitTemplate,
  slideSize,
  type StudioDoc,
  type StudioFormat,
  type StudioTemplateId,
} from '@travelog/core';
import {
  createProjectFromDoc,
  getTrip,
  listPhotos,
  newId,
  nextCollageTitle,
  tripRecap,
} from '@travelog/db';
import { type } from '@travelog/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type PhotoInfo, type StatItem } from '@/components/studio/layer-view';
import { StudioCanvas } from '@/components/studio/studio-canvas';
import { useMutate, useQuery } from '@/data/provider';
import { errorMessage, money } from '@/lib/format';
import { useTripId } from '@/lib/use-trip-id';
import { Button, ErrorText, Row, Segmented } from '@/ui/kit';
import { ModeProvider, useTheme } from '@/ui/theme';

const FORMATS: { value: StudioFormat; label: string }[] = [
  { value: 'post', label: '4:5' },
  { value: 'square', label: 'Square' },
  { value: 'story', label: '9:16' },
];
const TEMPLATES = STUDIO_TEMPLATES.filter((x) => x.id !== 'blank');

/**
 * Make a collage from selected photos (Plan 22): a live preview of those photos
 * in the chosen layout, layouts in a horizontal strip (each a small live
 * preview), then save and share or fine-tune in the editor.
 */
export default function ComposeCollage() {
  return (
    <ModeProvider mode="trip">
      <Compose />
    </ModeProvider>
  );
}

function Compose() {
  const id = useTripId();
  const { photos: photoParam } = useLocalSearchParams<{ photos?: string }>();
  const router = useRouter();
  const mutate = useMutate();
  const t = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  const tripPhotos = useQuery((db) => listPhotos(db, id), [id]);
  const recap = useQuery((db) => tripRecap(db, id), [id]);
  const [format, setFormat] = useState<StudioFormat>('post');
  const [template, setTemplate] = useState<StudioTemplateId>('bridge');
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => (photoParam ?? '').split(',').filter((pid) => tripPhotos.some((p) => p.id === pid)),
    [photoParam, tripPhotos],
  );
  const heading = trip?.destination || trip?.title || '';
  // Every layout, laid out for exactly these photos, so each preview is live.
  const docs = useMemo(() => {
    const out = {} as Record<StudioTemplateId, StudioDoc>;
    for (const tpl of TEMPLATES)
      out[tpl.id] = fitTemplate(tpl.id, format, selected, newId, heading);
    return out;
  }, [format, selected, heading]);
  const photos = useMemo(() => {
    const out: Record<string, PhotoInfo> = {};
    for (const p of tripPhotos) out[p.id] = { uri: p.localUri, width: p.width, height: p.height };
    return out;
  }, [tripPhotos]);
  if (!trip) return null;

  const stats: StatItem[] = recap
    ? [
        ...(recap.days
          ? [{ value: String(recap.days), label: recap.days === 1 ? 'day' : 'days' }]
          : []),
        { value: String(recap.stops), label: 'stops' },
        { value: String(recap.people), label: recap.people === 1 ? 'traveller' : 'travellers' },
        ...(recap.spentMinor
          ? [{ value: money(recap.spentMinor, recap.currency), label: 'spent' }]
          : []),
      ].slice(0, 4)
    : [];

  const doc = docs[template];
  const { height: slideH } = slideSize(format);
  // The big preview takes about 45% of the screen height.
  const previewH = Math.max(220, Math.round(screenH * 0.45));
  const scale = Math.min(previewH / slideH, (screenW - 48) / 1080);
  const thumbH = 96;

  const save = (then: 'share' | 'edit') => {
    try {
      const project = mutate((db) => createProjectFromDoc(db, id, doc, nextCollageTitle(db, id)));
      router.replace(
        then === 'share'
          ? `/trip/${id}/studio/export?projectId=${project.id}`
          : `/trip/${id}/studio/${project.id}`,
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Button label="Close" variant="link" onPress={() => router.back()} />
        <Text style={[type.headline, { color: t.ink, flex: 1, textAlign: 'center' }]}>
          Make a collage
        </Text>
        <Text style={[type.caption, { color: t.ink2, minWidth: 56, textAlign: 'right' }]}>
          {selected.length} {selected.length === 1 ? 'photo' : 'photos'}
        </Text>
      </View>

      {/* Live preview of the chosen layout, scroll sideways through the slides. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 8 }}
        style={{ flexGrow: 0 }}
      >
        <View style={{ borderRadius: 12, overflow: 'hidden' }}>
          <StudioCanvas doc={doc} scale={scale} photos={photos} stats={stats} seams />
        </View>
      </ScrollView>
      <Text style={[type.caption, { color: t.ink2, textAlign: 'center' }]}>
        {doc.slides} {doc.slides === 1 ? 'slide' : 'slides'} · swipe the preview to see them all
      </Text>

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Segmented<StudioFormat> value={format} onChange={setFormat} options={FORMATS} />
      </View>

      {/* Layouts, each a small live preview of the same photos. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}
        style={{ flexGrow: 0 }}
      >
        {TEMPLATES.map((tpl) => {
          const d = docs[tpl.id];
          const s = thumbH / slideSize(format).height;
          const on = tpl.id === template;
          return (
            <Pressable
              key={tpl.id}
              onPress={() => setTemplate(tpl.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Layout ${tpl.name}`}
              style={{ gap: 6, alignItems: 'center' }}
            >
              <View
                style={{
                  width: 150,
                  height: thumbH,
                  borderRadius: 12,
                  overflow: 'hidden',
                  borderWidth: on ? 3 : 1,
                  borderColor: on ? t.accent : t.line,
                }}
              >
                <View style={{ width: Math.max(150, canvasSize(d).width * s) }}>
                  <StudioCanvas doc={d} scale={s} photos={photos} stats={stats} />
                </View>
              </View>
              <Text style={[type.label, { color: on ? t.accent : t.ink }]}>{tpl.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <ErrorText>{error}</ErrorText>
        <Row>
          <View style={{ flex: 2 }}>
            <Button
              label="Save & share"
              icon="share"
              onPress={() => save('share')}
              disabled={!selected.length}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Fine-tune"
              icon="edit"
              variant="ghost"
              onPress={() => save('edit')}
              disabled={!selected.length}
            />
          </View>
        </Row>
      </View>
    </SafeAreaView>
  );
}
