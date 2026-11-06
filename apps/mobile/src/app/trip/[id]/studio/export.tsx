import { StatusBar } from 'expo-status-bar';
import { layersOnSlide, slideSize } from '@travelog/core';
import { getProject, listPhotos, markExported, tripRecap } from '@travelog/db';
import { type } from '@travelog/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { InsetView } from '@/ui/inset-view';

import { type PhotoInfo, type StatItem } from '@/components/studio/layer-view';
import { ShareActions } from '@/components/studio/share-actions';
import { StudioCanvas, type CanvasRef } from '@/components/studio/studio-canvas';
import { useMutate, useQuery } from '@/data/provider';
import { errorMessage, money } from '@/lib/format';
import {
  IMAGE_WAIT_MS,
  captureSlide,
  exportScale,
  keepSlides,
  nextFrames,
} from '@/lib/studio-export';
import { Button, ErrorText } from '@/ui/kit';
import { useCelebrate } from '@/ui/motion';
import { ModeProvider, useTheme } from '@/ui/theme';

/** Preview, export every slide at exact size, and share (Plan 15). */
export default function StudioExport() {
  return (
    <ModeProvider mode="trip" scheme="dark">
      {/* The workspace is always dark, so the status bar icons are light. */}
      <StatusBar style="light" />
      <ExportScreen />
    </ModeProvider>
  );
}

function ExportScreen() {
  const { id, projectId } = useLocalSearchParams<{ id: string; projectId: string }>();
  const router = useRouter();
  const mutate = useMutate();
  const celebrate = useCelebrate();
  const t = useTheme();
  const { width: screenW } = useWindowDimensions();
  const loaded = useQuery((db) => getProject(db, projectId), [projectId]);
  const tripPhotos = useQuery((db) => listPhotos(db, id), [id]);
  const recap = useQuery((db) => tripRecap(db, id), [id]);

  const [page, setPage] = useState(0);
  const [capturing, setCapturing] = useState<number | null>(null);
  const [done, setDone] = useState(0);
  const [files, setFiles] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const captureRef = useRef<CanvasRef>(null);
  const loadedCount = useRef(0);
  const expected = useRef(0);
  const ready = useRef<(() => void) | null>(null);
  const started = useRef(false);

  const photos = useMemo(() => {
    const out: Record<string, PhotoInfo> = {};
    for (const p of tripPhotos) out[p.id] = { uri: p.localUri, width: p.width, height: p.height };
    return out;
  }, [tripPhotos]);

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

  const doc = loaded?.doc;

  const runExport = async () => {
    if (!doc) return;
    setError(null);
    setFiles(null);
    setDone(0);
    const size = slideSize(doc.format);
    const tmp: string[] = [];
    try {
      for (let i = 0; i < doc.slides; i++) {
        loadedCount.current = 0;
        expected.current = layersOnSlide(doc, i).filter(
          (l) => l.kind === 'photo' && l.photoId && photos[l.photoId]?.uri,
        ).length;
        // Draw slide i off to the side, then wait for its photos (or give up waiting).
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, IMAGE_WAIT_MS);
          ready.current = () => {
            clearTimeout(timeout);
            resolve();
          };
          setCapturing(i);
          if (expected.current === 0) ready.current();
        });
        await nextFrames();
        tmp.push(await captureSlide(captureRef, size));
        setDone(i + 1);
      }
      setCapturing(null);
      const kept = await keepSlides(projectId, tmp);
      mutate((db) => markExported(db, projectId, kept[0] ?? null));
      setFiles(kept);
      celebrate(`${kept.length} ${kept.length === 1 ? 'slide' : 'slides'} ready`);
    } catch (e) {
      setCapturing(null);
      setError(errorMessage(e));
    }
  };

  // Export as soon as the screen opens.
  useEffect(() => {
    if (started.current || !doc) return;
    started.current = true;
    void runExport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  if (!doc || !loaded) return null;

  const { width: slideW, height: slideH } = slideSize(doc.format);
  const previewW = Math.min(screenW - 32, 460);
  const previewScale = previewW / slideW;
  const onImageLoad = () => {
    loadedCount.current += 1;
    if (loadedCount.current >= expected.current) ready.current?.();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Exact-size slide being captured, hidden behind the screen. */}
      {capturing != null ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
          <StudioCanvas
            key={capturing}
            ref={captureRef}
            doc={doc}
            scale={exportScale()}
            photos={photos}
            stats={stats}
            slide={capturing}
            watermark={capturing === doc.slides - 1}
            onImageLoad={onImageLoad}
          />
        </View>
      ) : null}

      <InsetView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Button label="Edit" icon="back" variant="link" onPress={() => router.back()} />
          <Text
            style={[type.headline, { color: t.ink, flex: 1, textAlign: 'center' }]}
            numberOfLines={1}
          >
            {loaded.project.title}
          </Text>
          <Text style={[type.caption, { color: t.ink2, minWidth: 48, textAlign: 'right' }]}>
            {page + 1} / {doc.slides}
          </Text>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / screenW))}
          style={{ flexGrow: 0 }}
        >
          {Array.from({ length: doc.slides }, (_, i) => (
            <View key={i} style={{ width: screenW, alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ borderRadius: 12, overflow: 'hidden' }}>
                <StudioCanvas
                  doc={doc}
                  scale={previewScale}
                  photos={photos}
                  stats={stats}
                  slide={i}
                  watermark={i === doc.slides - 1}
                />
              </View>
            </View>
          ))}
        </ScrollView>
        <Text style={[type.caption, { color: t.ink2, textAlign: 'center' }]}>
          Swipe to check each slide · {slideW}×{slideH}
        </Text>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {files ? (
            <ShareActions files={files} current={page} format={doc.format} />
          ) : error ? (
            <>
              <ErrorText>{error}</ErrorText>
              <Button
                label="Try again"
                onPress={() => {
                  void runExport();
                }}
              />
            </>
          ) : (
            <Text
              accessibilityRole="progressbar"
              style={[type.body, { color: t.ink, textAlign: 'center' }]}
            >
              Preparing slide {Math.min(done + 1, doc.slides)} of {doc.slides}…
            </Text>
          )}
        </ScrollView>
      </InsetView>
    </View>
  );
}
