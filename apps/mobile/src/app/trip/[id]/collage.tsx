import {
  COLLAGE_FORMATS,
  COLLAGE_TEMPLATES,
  TEMPLATE_CAPACITY,
  collageLayout,
  pickForCollage,
  type CollageFormat,
  type CollageTemplate,
} from '@travelog/core';
import { getTrip, listPhotos, tripRecap } from '@travelog/db';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import {
  COLLAGE_ACCENTS,
  CollageCanvas,
  type CanvasRef,
  type CollageStat,
} from '@/components/collage-canvas';
import { useQuery } from '@/data/provider';
import { dateRange, errorMessage, money } from '@/lib/format';
import { shareImage } from '@/lib/photos';
import {
  Between,
  Body,
  Button,
  Chip,
  ChipRow,
  ErrorText,
  Field,
  H1,
  Row,
  Screen,
  Segmented,
} from '@/ui/kit';
import { ModeProvider, useTheme } from '@/ui/theme';

const TEMPLATE_LABELS: Record<CollageTemplate, string> = {
  grid: 'Grid',
  hero: 'Big + small',
  polaroid: 'Polaroids',
  film: 'Film strip',
  stats: 'Trip stats',
};

export default function Collage() {
  return (
    <ModeProvider mode="home">
      <CollageEditor />
    </ModeProvider>
  );
}

function CollageEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  const photos = useQuery((db) => listPhotos(db, id), [id]);
  const recap = useQuery((db) => tripRecap(db, id), [id]);
  const { width: screenWidth } = useWindowDimensions();

  const [template, setTemplate] = useState<CollageTemplate>('grid');
  const [format, setFormat] = useState<CollageFormat>('post');
  const [accent, setAccent] = useState<string>(COLLAGE_ACCENTS[0]);
  const [title, setTitle] = useState(trip?.destination || trip?.title || 'Our trip');
  // Photo per slot; starts from an automatic pick spread across the days.
  const [chosen, setChosen] = useState<string[]>(() =>
    pickForCollage(photos, TEMPLATE_CAPACITY.grid).map((p) => p.id),
  );
  const [slot, setSlot] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvas = useRef<CanvasRef>(null);

  const capacity = TEMPLATE_CAPACITY[template];
  const layout = useMemo(
    () => collageLayout(template, format, Math.min(capacity, Math.max(chosen.length, 1))),
    [template, format, capacity, chosen.length],
  );
  if (!trip) return null;

  const uriOf = (photoId: string | undefined) =>
    photos.find((p) => p.id === photoId)?.localUri ?? null;
  const slotUris = layout.slots.map((_, i) => uriOf(chosen[i]));
  const { width: fw, height: fh } = COLLAGE_FORMATS[format];
  const previewW = Math.min(screenWidth - 32, 420);
  const previewH = (previewW * fh) / fw;

  const stats: CollageStat[] = recap
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

  const changeTemplate = (next: CollageTemplate) => {
    setTemplate(next);
    setSlot(null);
    // Fill any new slots with more auto-picked photos.
    const need = TEMPLATE_CAPACITY[next];
    if (chosen.length < need) {
      const extra = pickForCollage(
        photos.filter((p) => !chosen.includes(p.id)),
        need - chosen.length,
      ).map((p) => p.id);
      setChosen([...chosen, ...extra]);
    }
  };

  const putPhoto = (photoId: string) => {
    if (slot == null) return;
    const next = [...chosen];
    const existing = next.indexOf(photoId);
    // Swap if the photo is already in another slot.
    if (existing >= 0) next[existing] = next[slot] ?? '';
    next[slot] = photoId;
    setChosen(next.filter((x, i) => x || i < layout.slots.length));
    setSlot(null);
  };

  const exportImage = async (): Promise<string> => {
    setSlot(null);
    // Let the selection outline disappear before capturing.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    if (!canvas.current) throw new Error('nothing to export');
    return captureRef(canvas, {
      format: 'jpg',
      quality: 0.92,
      width: fw,
      height: fh,
      result: 'tmpfile',
    });
  };

  const share = async () => {
    setBusy(true);
    setError(null);
    try {
      await shareImage(await exportImage());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Between>
        <H1 eyebrow={`${trip.emoji} ${trip.title}`}>Collage</H1>
        <Button label="Close" variant="link" onPress={() => router.back()} />
      </Between>

      <Segmented<CollageFormat>
        value={format}
        onChange={setFormat}
        options={(Object.keys(COLLAGE_FORMATS) as CollageFormat[]).map((f) => ({
          value: f,
          label: COLLAGE_FORMATS[f].label,
        }))}
      />
      <ChipRow>
        {COLLAGE_TEMPLATES.map((tpl) => (
          <Chip
            key={tpl}
            label={TEMPLATE_LABELS[tpl]}
            selected={template === tpl}
            onPress={() => changeTemplate(tpl)}
          />
        ))}
      </ChipRow>

      <View style={{ alignItems: 'center' }}>
        <CollageCanvas
          ref={canvas}
          layout={layout}
          width={previewW}
          height={previewH}
          photoUris={slotUris}
          title={title || ' '}
          subtitle={[dateRange(trip.startDate, trip.endDate), trip.destination]
            .filter((x) => x && x !== 'Dates not set')
            .join(' · ')}
          stats={stats}
          accent={accent}
          onSlotPress={setSlot}
          selectedSlot={slot}
        />
      </View>

      {slot != null ? (
        <View style={{ gap: 6 }}>
          <Body small muted>
            Pick a photo for spot {slot + 1}
          </Body>
          <ScrollView horizontal contentContainerStyle={{ gap: 6 }}>
            {photos.map((p) =>
              p.localUri ? (
                <Pressable
                  key={p.id}
                  onPress={() => putPhoto(p.id)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel="Use this photo"
                >
                  <Image
                    source={{ uri: p.localUri }}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 8,
                      borderWidth: chosen.includes(p.id) ? 2 : 0,
                      borderColor: t.accent,
                    }}
                  />
                </Pressable>
              ) : null,
            )}
          </ScrollView>
        </View>
      ) : (
        <Body small muted>
          Tap a photo in the collage to change it.
        </Body>
      )}

      <Field label="Title" value={title} onChangeText={setTitle} maxLength={40} />
      <Row>
        {COLLAGE_ACCENTS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setAccent(c)}
            accessibilityRole="button"
            accessibilityLabel={`Colour ${c}`}
            accessibilityState={{ selected: accent === c }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: c,
              borderWidth: accent === c ? 3 : 0,
              borderColor: t.ink,
            }}
          />
        ))}
      </Row>

      <ErrorText>{error}</ErrorText>
      <Button label={busy ? 'Preparing…' : 'Share or save'} onPress={share} disabled={busy} />
      <Body small muted>
        Exports at {fw}×{fh}. Pick Instagram, WhatsApp, or “Save image” to keep it in your gallery.
      </Body>
    </Screen>
  );
}
