import {
  COLLAGE_FORMATS,
  MAX_SLIDES,
  STUDIO_TEMPLATES,
  templatePhotoCount,
  type StudioFormat,
  type StudioTemplateId,
} from '@travelog/core';
import { createProject, getTrip, listPhotos } from '@travelog/db';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { type } from '@travelog/ui';

import { useMutate, useQuery } from '@/data/provider';
import { errorMessage } from '@/lib/format';
import {
  Between,
  Body,
  Button,
  ErrorText,
  Field,
  H1,
  H2,
  Row,
  Screen,
  Segmented,
  Strong,
} from '@/ui/kit';
import { ModeProvider, useTheme } from '@/ui/theme';

const FORMATS: { value: StudioFormat; label: string }[] = [
  { value: 'post', label: 'Post 4:5' },
  { value: 'square', label: 'Square' },
  { value: 'story', label: 'Story 9:16' },
];

/** Start a carousel: format, number of slides and a template (Plan 15). */
export default function NewCarousel() {
  return (
    <ModeProvider mode="home">
      <NewCarouselForm />
    </ModeProvider>
  );
}

function NewCarouselForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mutate = useMutate();
  const t = useTheme();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  const photoCount = useQuery((db) => listPhotos(db, id).length, [id]);
  const [format, setFormat] = useState<StudioFormat>('post');
  const [slides, setSlides] = useState(3);
  const [template, setTemplate] = useState<StudioTemplateId>('bridge');
  const [title, setTitle] = useState(trip?.destination || trip?.title || '');
  const [error, setError] = useState<string | null>(null);
  if (!trip) return null;

  const create = () => {
    try {
      const project = mutate((db) =>
        createProject(db, { tripId: id, format, slides, template, title }),
      );
      router.replace(`/trip/${id}/studio/${project.id}`);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const ratio = COLLAGE_FORMATS[format].height / COLLAGE_FORMATS[format].width;

  return (
    <Screen edges={['top', 'bottom']}>
      <Between>
        <H1>New carousel</H1>
        <Button label="Cancel" variant="link" onPress={() => router.back()} />
      </Between>
      <Field label="Title" value={title} onChangeText={setTitle} maxLength={60} />
      <Segmented<StudioFormat> value={format} onChange={setFormat} options={FORMATS} />

      <Between>
        <Strong>Slides</Strong>
        <Row>
          <Button
            label=""
            icon="remove"
            accessibilityLabel="Fewer slides"
            variant="ghost"
            small
            disabled={slides <= 1}
            onPress={() => setSlides(slides - 1)}
          />
          <Text
            accessibilityLabel={`${slides} slides`}
            style={[type.title, { color: t.ink, minWidth: 28, textAlign: 'center' }]}
          >
            {slides}
          </Text>
          <Button
            label=""
            icon="add"
            accessibilityLabel="More slides"
            variant="ghost"
            small
            disabled={slides >= MAX_SLIDES}
            onPress={() => setSlides(slides + 1)}
          />
        </Row>
      </Between>
      {/* A strip showing how the slides join up. */}
      <View style={{ flexDirection: 'row', gap: 0, alignSelf: 'center' }}>
        {Array.from({ length: slides }, (_, i) => (
          <View
            key={i}
            style={{
              width: 28,
              height: 28 * ratio,
              backgroundColor: t.accentSoft,
              borderColor: t.accent,
              borderWidth: 1,
            }}
          />
        ))}
      </View>

      <H2>Template</H2>
      {STUDIO_TEMPLATES.map((tpl) => {
        const selected = tpl.id === template;
        const slots = templatePhotoCount(tpl.id, format, slides);
        return (
          <Pressable
            key={tpl.id}
            onPress={() => setTemplate(tpl.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${tpl.name}: ${tpl.hint}`}
            style={{
              borderRadius: 14,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? t.accent : t.line,
              backgroundColor: t.surface,
              padding: 12,
              gap: 2,
            }}
          >
            <Between>
              <Strong>
                {tpl.name}
                {tpl.seamless ? ' · seamless' : ''}
              </Strong>
              {slots ? (
                <Body muted small>
                  {slots} photos
                </Body>
              ) : null}
            </Between>
            <Body muted small>
              {tpl.hint}
            </Body>
          </Pressable>
        );
      })}
      <Body muted small>
        {photoCount
          ? `Photos are picked from across your ${photoCount} trip photos; you can swap any of them.`
          : 'No trip photos yet: the carousel starts with empty frames you can fill later.'}
      </Body>

      <ErrorText>{error}</ErrorText>
      <Button label="Create carousel" onPress={create} />
    </Screen>
  );
}
