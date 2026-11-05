import { daysBetween, parseDoc, photosInDoc, tripState } from '@travelog/core';
import {
  addPhotos,
  deletePhoto,
  deleteProject,
  duplicateProject,
  getTrip,
  listPhotos,
  listProjects,
  type Photo,
  type StudioProject,
} from '@travelog/db';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, useWindowDimensions, View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { errorMessage, shortDate } from '@/lib/format';
import { deletePhotoFile, pickPhotos } from '@/lib/photos';
import { Body, Button, Card, Empty, ErrorText, H2, IconTile, Row, Strong } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

const FORMAT_LABEL = { post: '4:5', square: '1:1', story: '9:16' } as const;

/**
 * The Memories tab (Plan 15), in both Plan and Trip mode: carousels made in the
 * Studio and the trip's photo pool, grouped by day.
 */
export function MemoriesView({ tripId }: { tripId: string }) {
  const router = useRouter();
  const mutate = useMutate();
  const t = useTheme();
  const trip = useQuery((db) => getTrip(db, tripId), [tripId]);
  const photos = useQuery((db) => listPhotos(db, tripId), [tripId]);
  const projects = useQuery((db) => listProjects(db, tripId), [tripId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  if (!trip) return null;

  const state = tripState(trip);
  const size = Math.floor((Math.min(width, 520) - 32 - 2 * 6) / 3);
  const cardW = Math.floor((Math.min(width, 520) - 32 - 10) / 2);
  const uriOf = (photoId: string | undefined) =>
    photos.find((p) => p.id === photoId)?.localUri ?? null;

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      const picked = await pickPhotos(trip.timeZone);
      if (picked.length) mutate((db) => addPhotos(db, tripId, picked));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = (p: Photo) =>
    Alert.alert('Remove this photo?', 'It is removed from the trip, not from your gallery.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          mutate((db) => deletePhoto(db, p.id));
          deletePhotoFile(p.localUri);
        },
      },
    ]);

  const projectMenu = (p: StudioProject) =>
    Alert.alert(p.title, undefined, [
      { text: 'Duplicate', onPress: () => mutate((db) => duplicateProject(db, p.id)) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => mutate((db) => deleteProject(db, p.id)),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);

  // Group photos by trip day; photos from outside the trip dates go last.
  const groups = new Map<string, Photo[]>();
  for (const p of photos) {
    const key = p.dayDate ?? 'other';
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const keys = [...groups.keys()].sort((a, b) =>
    a === 'other' ? 1 : b === 'other' ? -1 : a.localeCompare(b),
  );
  const dayLabel = (key: string) => {
    if (key === 'other') return 'Other photos';
    return trip.startDate
      ? `Day ${daysBetween(trip.startDate, key) + 1} · ${shortDate(key)}`
      : shortDate(key);
  };

  return (
    <>
      <Card>
        <Row style={{ gap: 12 }}>
          <IconTile icon="memories" size={44} />
          <View style={{ flex: 1 }}>
            <Strong>
              {state === 'completed' || state === 'archived'
                ? `Your ${trip.destination || trip.title} trip is done`
                : `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} · ${projects.length} ${projects.length === 1 ? 'carousel' : 'carousels'}`}
            </Strong>
            <Body muted small>
              Add your photos, then make a carousel that scrolls across slides on Instagram.
            </Body>
          </View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}>
            <Button
              label={busy ? 'Adding…' : 'Add photos'}
              icon="addPhoto"
              onPress={add}
              disabled={busy}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="New carousel"
              icon="add"
              variant="ghost"
              onPress={() => router.push(`/trip/${tripId}/studio/new`)}
            />
          </View>
        </Row>
      </Card>

      <H2>Carousels</H2>
      {projects.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {projects.map((p) => {
            const doc = parseDoc(p.doc, p.format, p.slides);
            const cover = p.thumbnailUri ?? uriOf(photosInDoc(doc)[0]);
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/trip/${tripId}/studio/${p.id}`)}
                onLongPress={() => projectMenu(p)}
                accessibilityRole="button"
                accessibilityLabel={`${p.title}, ${p.slides} slides. Long-press for more.`}
                style={{ width: cardW, gap: 4 }}
              >
                <View
                  style={{
                    width: cardW,
                    height: Math.round(cardW * 0.62),
                    borderRadius: 14,
                    overflow: 'hidden',
                    backgroundColor: t.surface2,
                  }}
                >
                  {cover ? (
                    <Image source={{ uri: cover }} style={{ flex: 1 }} resizeMode="cover" />
                  ) : null}
                </View>
                <Strong>{p.title}</Strong>
                <Body muted small>
                  {p.slides} {p.slides === 1 ? 'slide' : 'slides'} · {FORMAT_LABEL[p.format]}
                  {p.exportedAt ? ' · shared' : ''}
                </Body>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Body muted small>
          {photos.length
            ? 'Make a carousel that scrolls across slides on Instagram, like a panorama.'
            : 'Add a few photos first, then make a carousel from them.'}
        </Body>
      )}

      <H2>Photos</H2>
      <ErrorText>{error}</ErrorText>
      {!photos.length ? (
        <Empty
          icon="memories"
          title="No photos yet"
          body="Photos you add stay on this phone. Sharing them with your group comes with accounts."
        />
      ) : (
        keys.map((key) => (
          <View key={key} style={{ gap: 8 }}>
            <Body muted small>
              {dayLabel(key)} · {groups.get(key)?.length}
            </Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {groups.get(key)?.map((p) => (
                <Pressable
                  key={p.id}
                  onLongPress={() => removePhoto(p)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel="Trip photo. Long-press to remove."
                >
                  {p.localUri ? (
                    <Image
                      source={{ uri: p.localUri }}
                      style={{ width: size, height: size, borderRadius: 10 }}
                    />
                  ) : (
                    <View style={{ width: size, height: size, borderRadius: 10 }} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))
      )}
    </>
  );
}
