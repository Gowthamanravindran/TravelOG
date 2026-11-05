import { StatusBar } from 'expo-status-bar';
import {
  addLayer,
  addSlide,
  canvasSize,
  DEFAULT_CROP,
  DEFAULT_FRAME,
  fitTemplate,
  duplicateLayer,
  moveLayerZ,
  photosInDoc,
  removeLayer,
  removeSlide,
  setBackground,
  setPhoto,
  slideSize,
  STUDIO_TEMPLATES,
  swapSlides,
  updateLayer,
  type Layer,
  type StudioDoc,
  type StudioFormat,
  type StudioTemplateId,
} from '@travelog/core';
import { getTrip, listPhotos, newId, tripRecap, type Photo } from '@travelog/db';
import { type } from '@travelog/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type PhotoInfo, type StatItem } from '@/components/studio/layer-view';
import {
  BackgroundPanel,
  LayerPanel,
  PhotoTray,
  SlidesPanel,
  STICKERS,
} from '@/components/studio/panels';
import { Guides, Selection } from '@/components/studio/selection';
import { StudioCanvas } from '@/components/studio/studio-canvas';
import { useQuery } from '@/data/provider';
import { money } from '@/lib/format';
import { useStudioEditor } from '@/lib/studio-editor';
import { Button, Chip, ChipRow, Segmented } from '@/ui/kit';
import { ModeProvider, useTheme } from '@/ui/theme';
import { Icon, type IconName } from '@/ui/icon';
import { LayoutStrip } from '@/components/studio/layout-strip';

type Tool = 'photos' | 'text' | 'stickers' | 'background' | 'slides';
const TOOLS: { id: Tool; label: string; icon: IconName }[] = [
  { id: 'photos', label: 'Photos', icon: 'addPhoto' },
  { id: 'text', label: 'Text', icon: 'text' },
  { id: 'stickers', label: 'Stickers', icon: 'sticker' },
  { id: 'background', label: 'Background', icon: 'palette' },
  { id: 'slides', label: 'Slides', icon: 'slides' },
];

/** The Studio editor (Plan 15): a wide canvas of slides; photos can cross the seams. */
export default function StudioEditorScreen() {
  return (
    <ModeProvider mode="trip" scheme="dark">
      {/* The workspace is always dark, so the status bar icons are light. */}
      <StatusBar style="light" />
      <Editor />
    </ModeProvider>
  );
}

function Editor() {
  // `start=layouts` (from Make a collage) needs nothing special: layouts are always shown.
  const { id, projectId } = useLocalSearchParams<{ id: string; projectId: string }>();
  const router = useRouter();
  const t = useTheme();
  const editor = useStudioEditor(projectId);
  const { doc, apply, selectedId, select } = editor;
  const trip = useQuery((db) => getTrip(db, id), [id]);
  const tripPhotos = useQuery((db) => listPhotos(db, id), [id]);
  const recap = useQuery((db) => tripRecap(db, id), [id]);

  const [area, setArea] = useState({ width: 0, height: 0 });
  const [scrollX, setScrollX] = useState(0);
  const [tool, setTool] = useState<Tool>('photos');
  const [layoutId, setLayoutId] = useState<StudioTemplateId | null>(null);
  const [cropping, setCropping] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [live, setLive] = useState<{ id: string; patch: Partial<Layer> } | null>(null);
  const [guides, setGuides] = useState<{ vertical: number[]; horizontal: number[] }>({
    vertical: [],
    horizontal: [],
  });

  const photos = useMemo(() => {
    const out: Record<string, PhotoInfo> = {};
    for (const p of tripPhotos) out[p.id] = { uri: p.localUri, width: p.width, height: p.height };
    return out;
  }, [tripPhotos]);

  if (!editor.project || !trip) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={[type.body, { color: t.ink }]}>This collage no longer exists.</Text>
        <Button label="Back" variant="link" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const { width: slideW, height: slideH } = slideSize(doc.format);
  const { width: canvasW, height: canvasH } = canvasSize(doc);
  const scale =
    area.width && area.height
      ? Math.min((area.height - 16) / slideH, (area.width - 48) / slideW)
      : 0;
  const current = scale
    ? Math.max(0, Math.min(doc.slides - 1, Math.round(scrollX / (slideW * scale))))
    : 0;
  const shown: StudioDoc = live ? updateLayer(doc, live.id, live.patch) : doc;
  const selected = shown.layers.find((l) => l.id === selectedId) ?? null;
  // The tools show the committed item, so they don't re-render on every gesture frame.
  const committed = doc.layers.find((l) => l.id === selectedId) ?? null;
  const used = photosInDoc(doc);
  const heading = trip.destination || trip.title;

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

  /** Adds a layer in the middle of the slide you're looking at, and selects it. */
  const place = (make: (cx: number, cy: number) => Layer) => {
    const layer = make((current + 0.5) * slideW, slideH / 2);
    apply((d) => addLayer(d, layer));
    select(layer.id);
    setCropping(false);
  };

  const addPhoto = (p: Photo) => {
    if (replacing && selected?.kind === 'photo') {
      apply((d) => setPhoto(d, selected.id, p.id));
      setReplacing(false);
      return;
    }
    const aspect = p.width && p.height ? p.height / p.width : 1;
    const w = slideW * 0.62;
    const h = Math.min(slideH * 0.8, w * aspect);
    place((cx, cy) => ({
      id: newId(),
      kind: 'photo',
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      rotation: 0,
      photoId: p.id,
      crop: DEFAULT_CROP,
      frame: { ...DEFAULT_FRAME, radius: 24 },
    }));
  };

  const darkBg =
    doc.background.kind === 'color'
      ? ['#0F1020', '#1B1A3A'].includes(doc.background.color)
      : doc.background.from === '#0F1020';

  const removeCurrentSlide = () => {
    const doIt = () => apply((d) => removeSlide(d, current));
    Alert.alert(`Remove slide ${current + 1}?`, 'Things only on this slide are removed too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doIt },
    ]);
  };

  const deselect = () => {
    select(null);
    setCropping(false);
    setReplacing(false);
  };

  const close = () => {
    editor.flush();
    router.back();
  };

  const exportNow = () => {
    editor.flush();
    select(null);
    router.push(`/trip/${id}/studio/export?projectId=${projectId}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Button label="Close" variant="link" onPress={close} />
        <Text
          numberOfLines={1}
          style={[type.headline, { color: t.ink, flex: 1, textAlign: 'center' }]}
        >
          {editor.project.title}
        </Text>
        <Button
          label=""
          icon="undo"
          accessibilityLabel="Undo"
          variant="secondary"
          small
          onPress={editor.undo}
          disabled={!editor.canUndo}
        />
        <Button
          label=""
          icon="redo"
          accessibilityLabel="Redo"
          variant="secondary"
          small
          onPress={editor.redo}
          disabled={!editor.canRedo}
        />
        <Button label="Export" small onPress={exportNow} />
      </View>

      {/* Canvas */}
      <View
        testID="studio-area"
        style={{ flex: 1 }}
        onLayout={(e: LayoutChangeEvent) => setArea(e.nativeEvent.layout)}
      >
        {scale ? (
          <ScrollView
            horizontal
            // While something is selected, fingers move it instead of scrolling.
            scrollEnabled={!selected}
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
            scrollEventThrottle={32}
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 8 }}
          >
            <StudioCanvas
              doc={shown}
              scale={scale}
              photos={photos}
              stats={stats}
              seams
              onBackgroundPress={() => {
                select(null);
                setCropping(false);
                setReplacing(false);
              }}
              onLayerPress={(l) => {
                select(l.id);
                setCropping(false);
                setReplacing(false);
              }}
              overlay={
                <>
                  <Guides
                    guides={guides}
                    scale={scale}
                    width={canvasW}
                    height={canvasH}
                    color={t.accent}
                  />
                  {selected ? (
                    <Selection
                      key={selected.id + (cropping ? ':crop' : '')}
                      doc={doc}
                      layer={selected}
                      scale={scale}
                      mode={cropping ? 'crop' : 'move'}
                      accent={t.accent}
                      photoSize={
                        selected.kind === 'photo' && selected.photoId
                          ? {
                              w: photos[selected.photoId]?.width ?? 0,
                              h: photos[selected.photoId]?.height ?? 0,
                            }
                          : undefined
                      }
                      onLive={(patch, g) => {
                        setLive(patch ? { id: selected.id, patch } : null);
                        setGuides(g);
                      }}
                      onCommit={(patch) => apply((d) => updateLayer(d, selected.id, patch))}
                    />
                  ) : null}
                </>
              }
            />
          </ScrollView>
        ) : null}
      </View>

      {/* Tools */}
      <View style={{ borderTopWidth: 1, borderColor: t.line, paddingTop: 10, gap: 8 }}>
        {/* Layouts stay on screen while editing (Plan 24): pick one, edit, pick again. */}
        <View style={{ gap: 6, paddingHorizontal: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={[type.label, { color: t.ink2 }]}>Layouts</Text>
            <View style={{ flex: 1 }}>
              <Segmented<StudioFormat>
                value={doc.format}
                onChange={(format) => {
                  const next = fitTemplate(layoutId ?? 'bridge', format, used, newId, heading);
                  apply(() => next);
                  deselect();
                }}
                options={[
                  { value: 'post', label: '4:5' },
                  { value: 'square', label: 'Square' },
                  { value: 'story', label: '9:16' },
                ]}
              />
            </View>
          </View>
          <LayoutStrip
            compact
            photoIds={used}
            format={doc.format}
            current={layoutId}
            heading={heading}
            photos={photos}
            stats={stats}
            onPick={(template, next) => {
              // Applied straight away; Undo brings the previous layout back.
              setLayoutId(template);
              apply(() => next);
              deselect();
            }}
          />
        </View>
        <ScrollView
          style={{ maxHeight: 210 }}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingBottom: 12,
            gap: 10,
            minHeight: 150,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {committed && !replacing ? (
            <LayerPanel
              layer={committed}
              cropping={cropping}
              onPatch={(patch) => apply((d) => updateLayer(d, committed.id, patch))}
              onToggleCrop={() => setCropping(!cropping)}
              onReplace={() => setReplacing(true)}
              onArrange={(to) => apply((d) => moveLayerZ(d, committed.id, to))}
              onDuplicate={() => {
                const copy = newId();
                apply((d) => duplicateLayer(d, committed.id, copy));
                select(copy);
              }}
              onDelete={() => {
                apply((d) => removeLayer(d, committed.id));
                select(null);
              }}
              onDone={() => {
                select(null);
                setCropping(false);
              }}
            />
          ) : replacing ? (
            <>
              <PhotoTray
                photos={tripPhotos}
                used={used}
                onPick={addPhoto}
                hint="Pick the photo for this frame"
              />
              <Button label="Cancel" variant="link" small onPress={() => setReplacing(false)} />
            </>
          ) : (
            <>
              <ChipRow>
                {TOOLS.map((x) => (
                  <Chip
                    key={x.id}
                    label={x.label}
                    icon={x.icon}
                    selected={tool === x.id}
                    onPress={() => setTool(x.id)}
                  />
                ))}
              </ChipRow>
              {tool === 'photos' ? (
                <PhotoTray
                  photos={tripPhotos}
                  used={used}
                  onPick={addPhoto}
                  hint={`Tap a photo to add it to slide ${current + 1}. Drag it across the dashed line to make it scroll.`}
                />
              ) : null}
              {tool === 'text' ? (
                <ChipRow>
                  {[
                    { label: 'Heading', size: 110, bold: true },
                    { label: 'Caption', size: 56, bold: false },
                    { label: 'Label', size: 48, bold: true, background: '#FFFFFF' },
                  ].map((s) => (
                    <Chip
                      key={s.label}
                      label={s.label}
                      onPress={() =>
                        place((cx, cy) => ({
                          id: newId(),
                          kind: 'text',
                          x: cx - slideW * 0.4,
                          y: cy - s.size * 0.75,
                          w: slideW * 0.8,
                          h: s.size * 1.5,
                          rotation: 0,
                          text:
                            s.label === 'Heading'
                              ? trip.destination || trip.title
                              : 'Write something',
                          font: 'sans',
                          size: s.size,
                          color: s.background ? '#1B1A3A' : darkBg ? '#FFFFFF' : '#1B1A3A',
                          align: 'center',
                          bold: s.bold,
                          background: s.background ?? null,
                        }))
                      }
                    />
                  ))}
                </ChipRow>
              ) : null}
              {tool === 'stickers' ? (
                <View style={{ gap: 8 }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {STICKERS.map((icon) => (
                      <Pressable
                        key={icon}
                        accessibilityRole="button"
                        accessibilityLabel={`Sticker ${icon}`}
                        onPress={() =>
                          place((cx, cy) => ({
                            id: newId(),
                            kind: 'sticker',
                            icon,
                            color: darkBg ? '#FFFFFF' : '#FF6B5B',
                            emoji: '',
                            x: cx - 110,
                            y: cy - 110,
                            w: 220,
                            h: 220,
                            rotation: 0,
                          }))
                        }
                        style={{ padding: 8 }}
                      >
                        <Icon name={icon} size={30} color={t.ink} />
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Button
                    label="Trip stats card"
                    icon="stats"
                    small
                    variant="secondary"
                    onPress={() =>
                      place((cx, cy) => ({
                        id: newId(),
                        kind: 'stats',
                        x: cx - slideW * 0.42,
                        y: cy - slideH * 0.15,
                        w: slideW * 0.84,
                        h: slideH * 0.3,
                        rotation: 0,
                        color: '#FF6B5B',
                      }))
                    }
                  />
                </View>
              ) : null}
              {tool === 'background' ? (
                <BackgroundPanel
                  background={doc.background}
                  onChange={(bg) => apply((d) => setBackground(d, bg))}
                />
              ) : null}
              {tool === 'slides' ? (
                <SlidesPanel
                  doc={doc}
                  current={current}
                  onAdd={() => apply(addSlide)}
                  onRemove={removeCurrentSlide}
                  onMove={(to) => apply((d) => swapSlides(d, current, to))}
                />
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
