import {
  addAttachment,
  deleteAttachment,
  listTripAttachments,
  type TripDocument,
} from '@travelog/db';
import { type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { dateTimeIn, errorMessage } from '@/lib/format';
import { fileOnPhone, MAX_UPLOADS, openAttachment, pickAttachments } from '@/lib/files';
import { BOOKING_LABELS } from '@/lib/labels';
import { Icon } from '@/ui/icon';
import {
  Body,
  Button,
  Card,
  Divider,
  Empty,
  ErrorText,
  IconTile,
  Section,
  WithIcon,
} from '@/ui/kit';
import { useTheme } from '@/ui/theme';

/**
 * Every file in the trip in one place (Plan 40): trip documents (passport,
 * insurance…) first, then each booking's tickets in date order. Files are kept
 * on the phone, so they open without signal.
 */
export function DocumentsView({ tripId, timeZone }: { tripId: string; timeZone: string }) {
  const mutate = useMutate();
  const docs = useQuery((db) => listTripAttachments(db, tripId), [tripId]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setError(null);
    try {
      setBusy(true);
      const picked = await pickAttachments();
      if (!picked) return;
      mutate((db) => {
        for (const f of picked.files) addAttachment(db, { tripId, bookingId: null, ...f });
      });
      if (picked.truncated) setError(`Only the first ${MAX_UPLOADS} files were added.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!docs.length) {
    return (
      <View style={{ gap: 12 }}>
        <Empty
          icon="document"
          title="No documents yet"
          body="Tickets, vouchers, passport and insurance copies. Kept on this phone, so they open without signal."
          action={<Button label="Add documents" icon="upload" onPress={add} disabled={busy} />}
        />
        <ErrorText>{error}</ErrorText>
      </View>
    );
  }

  // Group: trip documents, then one group per booking, in the list's order.
  const groups: { key: string; doc: TripDocument; files: TripDocument[] }[] = [];
  for (const d of docs) {
    const key = d.bookingId ?? 'trip';
    const g = groups.find((x) => x.key === key);
    if (g) g.files.push(d);
    else groups.push({ key, doc: d, files: [d] });
  }

  return (
    <View style={{ gap: 16 }}>
      <WithIcon icon="check" size={16}>
        <Body muted small>
          Saved on this phone · opens without signal
        </Body>
      </WithIcon>
      <Button
        label="Add documents"
        icon="upload"
        variant="secondary"
        onPress={add}
        disabled={busy}
      />
      <ErrorText>{error}</ErrorText>
      {groups.map((g) => (
        <Section key={g.key} title={g.doc.booking ? g.doc.booking.title : 'Trip documents'}>
          {g.doc.booking?.startsAt ? (
            <Body muted small>
              {BOOKING_LABELS[g.doc.booking.type].label} ·{' '}
              {dateTimeIn(g.doc.booking.startsAt, timeZone)}
            </Body>
          ) : null}
          <Card>
            {g.files.map((d, i) => (
              <View key={d.id} style={{ gap: 0 }}>
                {i > 0 ? <Divider /> : null}
                <DocumentRow
                  doc={d}
                  tripId={tripId}
                  onError={setError}
                  onRemove={() => mutate((db) => deleteAttachment(db, d.id))}
                />
              </View>
            ))}
          </Card>
        </Section>
      ))}
    </View>
  );
}

function DocumentRow({
  doc,
  tripId,
  onError,
  onRemove,
}: {
  doc: TripDocument;
  tripId: string;
  onError: (e: string) => void;
  onRemove: () => void;
}) {
  const t = useTheme();
  const router = useRouter();
  const here = !!doc.localUri && fileOnPhone(doc.localUri);
  const image = doc.mimeType?.startsWith('image/');
  const open = () => {
    if (!doc.localUri || !here) return;
    openAttachment({ localUri: doc.localUri, mimeType: doc.mimeType, name: doc.name }).catch((e) =>
      onError(errorMessage(e)),
    );
  };
  const more = () =>
    Alert.alert(doc.name, undefined, [
      ...(doc.booking
        ? [
            {
              text: 'Open booking',
              onPress: () => router.push(`/trip/${tripId}/booking?bookingId=${doc.booking!.id}`),
            },
          ]
        : []),
      { text: 'Remove', style: 'destructive' as const, onPress: onRemove },
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={here ? `Open ${doc.name}` : `${doc.name}, not on this phone yet`}
        onPress={open}
        disabled={!here}
        style={({ pressed }) => [styles.open, { opacity: pressed ? 0.7 : 1 }]}
      >
        <IconTile icon={image ? 'camera' : 'document'} size={36} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[type.body, { color: t.ink }]} numberOfLines={1}>
            {doc.name}
          </Text>
          <Text style={[type.caption, { color: t.ink2 }]} numberOfLines={1}>
            {here ? sizeText(doc.sizeBytes) : 'Not on this phone yet'}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`More for ${doc.name}`}
        onPress={more}
        hitSlop={10}
        style={styles.more}
      >
        <Icon name="more" size={20} color={t.ink2} />
      </Pressable>
    </View>
  );
}

function sizeText(bytes: number | null): string {
  if (!bytes) return 'Tap to open';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB · tap to open`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB · tap to open`;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52 },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  more: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
});
