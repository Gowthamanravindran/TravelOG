import {
  addSavedToTrip,
  getTrip,
  listTrips,
  myMember,
  savePlace,
  type SavedSource,
} from '@travelog/db';
import { type } from '@travelog/ui';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { IDEAS_DAY } from '@/components/itinerary-view';
import { useDb, useMutate, useQuery } from '@/data/provider';
import { findPlaces, type FoundPlace } from '@/lib/find-places';
import { errorMessage } from '@/lib/format';
import { ITEM_LABELS } from '@/lib/labels';
import { fetchPreview, firstLink, type LinkPreview } from '@/lib/link-preview';
import { SOURCE_LABELS } from '@/lib/saved';
import { tripCentre } from '@/lib/stop-search';
import { Icon } from '@/ui/icon';
import {
  Between,
  Body,
  Button,
  Card,
  Chip,
  ChipRow,
  ErrorText,
  Field,
  H1,
  Row,
  Screen,
  Strong,
} from '@/ui/kit';
import { useTheme } from '@/ui/theme';

const ONLY_SAVED = 'saved';
const FIND_DELAY_MS = 600;

/**
 * Plan 59: save the places in a post or page. Paste its link (and, for Instagram, its caption);
 * the places named in it are found and ticked when sure; save them to Saved, and optionally to
 * a trip's Ideas. Opened from the Saved tab, the Ideas day, and later the share sheet (Plan 60).
 */
export default function SaveLinkScreen() {
  const { tripId, text: shared } = useLocalSearchParams<{ tripId?: string; text?: string }>();
  const router = useRouter();
  const db = useDb();
  const mutate = useMutate();
  const t = useTheme();
  const trips = useQuery((db) =>
    listTrips(db).filter((x) => x.state !== 'completed' && x.state !== 'archived'),
  );
  const [link, setLink] = useState(shared ?? '');
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [caption, setCaption] = useState('');
  const [found, setFound] = useState<FoundPlace[]>([]);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [finding, setFinding] = useState(false);
  const [extra, setExtra] = useState('');
  const [target, setTarget] = useState<string>(tripId ?? ONLY_SAVED);
  const [error, setError] = useState<string | null>(null);
  const url = firstLink(link);
  const near = target !== ONLY_SAVED ? tripCentre(db, target) : null;
  const nearKey = near ? `${near.lat},${near.lng}` : '';

  // Read the link once it's pasted.
  useEffect(() => {
    if (!url) {
      setPreview(null);
      return;
    }
    const controller = new AbortController();
    fetchPreview(url, controller.signal).then((p) => {
      if (controller.signal.aborted) return;
      setPreview(p);
      // Text shared along with the link (a caption) counts too.
      const rest = link.replace(url, '').trim();
      setCaption([p.text, rest].filter(Boolean).join('\n'));
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Find places in the caption after a pause in typing.
  useEffect(() => {
    if (!caption.trim()) {
      setFound((f) => f.filter((x) => x.key.startsWith('own:')));
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setFinding(true);
      const [lat, lng] = nearKey ? nearKey.split(',').map(Number) : [];
      const places = await findPlaces(
        caption,
        nearKey ? { lat: lat!, lng: lng! } : null,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setFound((f) => [...f.filter((x) => x.key.startsWith('own:')), ...places]);
      setOff(new Set(places.filter((p) => !p.sure).map((p) => p.key)));
      setFinding(false);
    }, FIND_DELAY_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
      setFinding(false);
    };
  }, [caption, nearKey]);

  const picked = found.filter((f) => !off.has(f.key));
  const source: SavedSource = preview?.source ?? 'typed';

  const save = () => {
    try {
      mutate((db) => {
        const ids = picked.map(
          (f) =>
            savePlace(db, {
              title: f.name,
              type: f.type,
              address: f.address,
              area: f.area,
              countryCode: f.countryCode,
              lat: f.lat,
              lng: f.lng,
              poiId: f.poiId,
              source,
              url: url ?? null,
              sourceTitle: preview?.title ?? null,
              thumbUrl: preview?.thumbUrl ?? null,
            }).id,
        );
        if (target !== ONLY_SAVED && getTrip(db, target))
          addSavedToTrip(db, ids, target, IDEAS_DAY, myMember(db, target)?.id);
      });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Between>
        <H1>Save from a link</H1>
        <Button label="Cancel" variant="link" onPress={() => router.back()} />
      </Between>
      <Field
        label="Link"
        value={link}
        onChangeText={setLink}
        placeholder="Paste a reel, video or page link"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        hint="Copy the link in the other app, then long-press here and Paste"
      />

      {preview ? (
        <Card style={{ padding: 10 }}>
          <Row style={{ alignItems: 'center' }}>
            {preview.thumbUrl ? (
              <Image
                source={{ uri: preview.thumbUrl }}
                style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: t.surface2 }}
                contentFit="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.surface2,
                }}
              >
                <Icon name="share" size={22} color={t.ink2} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Strong>{preview.title ?? SOURCE_LABELS[preview.source]}</Strong>
              <Body muted small numberOfLines={1}>
                {[preview.author, SOURCE_LABELS[preview.source]].filter(Boolean).join(' · ')}
              </Body>
            </View>
          </Row>
        </Card>
      ) : null}

      {preview && !preview.readable ? (
        <Card style={{ padding: 12, gap: 4 }}>
          <Strong>Instagram doesn’t share captions with apps</Strong>
          <Body muted small>
            Copy the caption in Instagram, then paste it below and we’ll find the places.
          </Body>
        </Card>
      ) : null}

      <Field
        label="Caption or notes"
        value={caption}
        onChangeText={setCaption}
        multiline
        placeholder="📍 Gunpowder, Assagao…"
      />

      <Between>
        <Text
          style={[type.caption, { color: t.ink2, textTransform: 'uppercase', letterSpacing: 0.6 }]}
        >
          Places found
        </Text>
        {finding ? (
          <Body muted small>
            Looking…
          </Body>
        ) : null}
      </Between>
      {found.length === 0 && !finding ? (
        <Body muted small>
          {caption.trim()
            ? 'No place names found. Add one below.'
            : 'Paste a link or caption to find its places.'}
        </Body>
      ) : null}
      {found.map((f) => {
        const on = !off.has(f.key);
        return (
          <Pressable
            key={f.key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={f.name}
            onPress={() => {
              const next = new Set(off);
              if (on) next.add(f.key);
              else next.delete(f.key);
              setOff(next);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}
          >
            <Icon name={on ? 'check' : 'circle'} size={22} color={on ? t.accent : t.ink2} />
            <Icon name={ITEM_LABELS[f.type].icon} size={18} color={t.ink2} />
            <View style={{ flex: 1 }}>
              <Text style={[type.headline, { color: t.ink }]} numberOfLines={1}>
                {f.name}
              </Text>
              <Text style={[type.caption, { color: t.ink2 }]} numberOfLines={1}>
                {f.address ?? f.area ?? 'No map spot yet'}
              </Text>
            </View>
          </Pressable>
        );
      })}
      <Row style={{ alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Add a place yourself"
            value={extra}
            onChangeText={setExtra}
            placeholder="Name"
          />
        </View>
        <Button
          label="Add"
          variant="secondary"
          disabled={!extra.trim()}
          onPress={() => {
            const name = extra.trim();
            setFound((f) => [
              ...f,
              {
                key: `own:${name}`,
                name,
                type: 'place',
                address: null,
                area: null,
                countryCode: null,
                lat: null,
                lng: null,
                poiId: null,
                sure: true,
              },
            ]);
            setExtra('');
          }}
        />
      </Row>

      <Text
        style={[type.caption, { color: t.ink2, textTransform: 'uppercase', letterSpacing: 0.6 }]}
      >
        Save to
      </Text>
      <ChipRow>
        {trips.map((x) => (
          <Chip
            key={x.id}
            label={`${x.title} · Ideas`}
            selected={target === x.id}
            onPress={() => setTarget(x.id)}
          />
        ))}
        <Chip
          label="Only Saved"
          selected={target === ONLY_SAVED}
          onPress={() => setTarget(ONLY_SAVED)}
        />
      </ChipRow>
      <ErrorText>{error}</ErrorText>
      <Button
        label={
          picked.length
            ? `Save ${picked.length} ${picked.length === 1 ? 'place' : 'places'}`
            : 'Pick a place'
        }
        disabled={!picked.length}
        onPress={save}
      />
    </Screen>
  );
}
