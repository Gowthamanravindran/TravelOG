import { daysBetween, fitTemplate, parseDoc, photosInDoc, tripState } from '@travelog/core';
import {
  addPhotos,
  createProjectFromDoc,
  deletePhotos,
  deleteProject,
  duplicateProject,
  getTrip,
  listPhotos,
  listProjects,
  newId,
  type Photo,
  type StudioProject,
} from '@travelog/db';
import { font, spacing, type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { errorMessage, shortDate } from '@/lib/format';
import { deletePhotoFile, pickPhotos } from '@/lib/photos';
import { Icon } from '@/ui/icon';
import { Body, Button, Card, Empty, ErrorText, H2, IconTile, Row, Strong } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

const FORMAT_LABEL = { post: '4:5', square: '1:1', story: '9:16' } as const;

/**
 * The Memories tab (Plans 15 and 22), in Plan and Trip mode: add photos, tap to
 * select any number, then "Make a collage" (or delete them). Saved collages are
 * listed above the photos.
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
  const [selected, setSelected] = useState<string[]>([]);
  const { width } = useWindowDimensions();
  if (!trip) return null;

  const state = tripState(trip);
  const size = Math.floor((Math.min(width, 520) - 32 - 2 * 6) / 3);
  const cardW = Math.floor((Math.min(width, 520) - 32 - 10) / 2);
  const uriOf = (photoId: string | undefined) =>
    photos.find((p) => p.id === photoId)?.localUri ?? null;
  // Forget selections of photos that were removed.
  const chosen = selected.filter((id) => photos.some((p) => p.id === id));

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

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleDay = (ids: string[]) => {
    const all = ids.every((id) => chosen.includes(id));
    setSelected((s) => (all ? s.filter((x) => !ids.includes(x)) : [...new Set([...s, ...ids])]));
  };

  const removeSelected = () =>
    Alert.alert(
      `Remove ${chosen.length} ${chosen.length === 1 ? 'photo' : 'photos'}?`,
      'They are removed from the trip, not from your gallery.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const files = mutate((db) => deletePhotos(db, chosen));
            files.forEach((f) => deletePhotoFile(f));
            setSelected([]);
          },
        },
      ],
    );

  const makeCollage = () => {
    // Keep the photos in the order they were taken.
    const ordered = photos.filter((p) => chosen.includes(p.id)).map((p) => p.id);
    // Saved straight away as "<trip> · n"; the editor opens on its layouts.
    const doc = fitTemplate('bridge', 'post', ordered, newId, trip.destination || trip.title);
    const project = mutate((db) => createProjectFromDoc(db, tripId, doc));
    router.push(`/trip/${tripId}/studio/${project.id}?start=layouts`);
    setSelected([]);
  };

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
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.lg,
          paddingBottom: chosen.length ? 140 : spacing.xxxl,
        }}
      >
        <Card>
          <Row style={{ gap: 12 }}>
            <IconTile icon="memories" size={44} />
            <View style={{ flex: 1 }}>
              <Strong>
                {state === 'completed' || state === 'archived'
                  ? `Your ${trip.destination || trip.title} trip is done`
                  : `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} · ${projects.length} ${projects.length === 1 ? 'collage' : 'collages'}`}
              </Strong>
              <Body muted small>
                Add photos, tap the ones you like, then make a collage that scrolls across slides.
              </Body>
            </View>
          </Row>
          <Button
            label={busy ? 'Adding…' : 'Add photos'}
            icon="addPhoto"
            onPress={add}
            disabled={busy}
          />
        </Card>

        {projects.length ? (
          <>
            <H2>Collages</H2>
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
          </>
        ) : null}

        <H2>Photos</H2>
        <ErrorText>{error}</ErrorText>
        {!photos.length ? (
          <Empty
            icon="memories"
            title="No photos yet"
            body="Photos you add stay on this phone. Sharing them with your group comes with accounts."
          />
        ) : (
          <>
            <Body muted small>
              Tap photos to select them for a collage.
            </Body>
            {keys.map((key) => {
              const dayPhotos = groups.get(key) ?? [];
              const ids = dayPhotos.map((p) => p.id);
              const allOn = ids.every((id) => chosen.includes(id));
              return (
                <View key={key} style={{ gap: 8 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Body muted small>
                      {dayLabel(key)} · {dayPhotos.length}
                    </Body>
                    <Button
                      label={allOn ? 'Clear day' : 'Select all'}
                      variant="link"
                      small
                      onPress={() => toggleDay(ids)}
                    />
                  </Row>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {dayPhotos.map((p) => {
                      const on = chosen.includes(p.id);
                      const order = chosen.indexOf(p.id) + 1;
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => toggle(p.id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                          accessibilityLabel="Trip photo"
                          style={{
                            width: size,
                            height: size,
                            borderRadius: 12,
                            overflow: 'hidden',
                            borderWidth: on ? 3 : 0,
                            borderColor: t.accent,
                          }}
                        >
                          {p.localUri ? (
                            <Image
                              source={{ uri: p.localUri }}
                              style={{ flex: 1, opacity: on ? 0.85 : 1 }}
                            />
                          ) : (
                            <View style={{ flex: 1, backgroundColor: t.surface2 }} />
                          )}
                          <View
                            style={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: on ? t.accent : '#00000044',
                              borderWidth: 2,
                              borderColor: '#FFFFFF',
                            }}
                          >
                            {on ? (
                              <Text
                                style={[
                                  type.caption,
                                  { color: t.onAccent, ...font('display', 800) },
                                ]}
                              >
                                {order}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {chosen.length ? (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 12,
            borderRadius: 24,
            padding: 10,
            gap: 8,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.line,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 10,
          }}
        >
          <Row style={{ justifyContent: 'space-between', paddingHorizontal: 6 }}>
            <Strong>{chosen.length} selected</Strong>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear selection"
              onPress={() => setSelected([])}
              hitSlop={10}
            >
              <Icon name="close" size={20} color={t.ink2} />
            </Pressable>
          </Row>
          <Row>
            <View style={{ flex: 2 }}>
              <Button
                label={`Make a collage (${chosen.length})`}
                icon="layout"
                onPress={makeCollage}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Delete"
                icon="remove"
                variant="ghost"
                danger
                onPress={removeSelected}
              />
            </View>
          </Row>
        </View>
      ) : null}
    </View>
  );
}
