import { daysBetween, tripState } from '@travelog/core';
import { addPhotos, deletePhoto, getTrip, listPhotos, type Photo } from '@travelog/db';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, useWindowDimensions, View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { errorMessage, shortDate } from '@/lib/format';
import { deletePhotoFile, pickPhotos } from '@/lib/photos';
import {
  Between,
  Body,
  Button,
  Card,
  Empty,
  ErrorText,
  H1,
  H2,
  Row,
  Screen,
  Strong,
} from '@/ui/kit';
import { ModeProvider } from '@/ui/theme';

/** Trip photo pool, grouped by day, and the way into the collage editor (docs/01 §6). */
export default function Memories() {
  return (
    <ModeProvider mode="home">
      <MemoriesScreen />
    </ModeProvider>
  );
}

function MemoriesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mutate = useMutate();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  const photos = useQuery((db) => listPhotos(db, id), [id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  if (!trip) return null;

  const state = tripState(trip);
  const size = Math.floor((Math.min(width, 520) - 32 - 2 * 6) / 3);

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      const picked = await pickPhotos(trip.timeZone);
      if (picked.length) mutate((db) => addPhotos(db, id, picked));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = (p: Photo) =>
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

  // Group by trip day; photos from outside the trip dates go last.
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
    <Screen edges={['top', 'bottom']}>
      <Between>
        <H1 eyebrow={`${trip.emoji} ${trip.title}`}>Memories</H1>
        <Button label="Done" variant="link" onPress={() => router.back()} />
      </Between>

      {state === 'completed' || state === 'archived' ? (
        <Card>
          <Strong>Your {trip.destination || trip.title} trip is done 🎉</Strong>
          <Body muted small>
            Add your best photos and turn them into a collage for Instagram or WhatsApp.
          </Body>
          <Button
            label="Open the plan and budget"
            variant="link"
            small
            onPress={() => router.push(`/trip/${id}/plan`)}
          />
        </Card>
      ) : null}

      <Row>
        <View style={{ flex: 1 }}>
          <Button label={busy ? 'Adding…' : '＋ Add photos'} onPress={add} disabled={busy} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Make a collage"
            variant="ghost"
            disabled={!photos.length}
            onPress={() => router.push(`/trip/${id}/collage`)}
          />
        </View>
      </Row>
      <ErrorText>{error}</ErrorText>

      {!photos.length ? (
        <Empty
          icon="📸"
          title="No photos yet"
          body="Photos you add stay on this phone. Sharing them with your group comes with accounts."
        />
      ) : (
        keys.map((key) => (
          <View key={key} style={{ gap: 8 }}>
            <H2
              right={
                <Body muted small>
                  {groups.get(key)?.length}
                </Body>
              }
            >
              {dayLabel(key)}
            </H2>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {groups.get(key)?.map((p) => (
                <Pressable
                  key={p.id}
                  onLongPress={() => remove(p)}
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
      {photos.length ? (
        <Body muted small>
          Long-press a photo to remove it.
        </Body>
      ) : null}
    </Screen>
  );
}
