import { type PlanCheck } from '@travelog/core';
import { type, type TileFamily } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMutate } from '@/data/provider';
import { shortDate } from '@/lib/format';
import { dismissCheck, nightsText, placeName, type Where } from '@/lib/where';
import { Icon, type IconName } from '@/ui/icon';
import { Body, Button, Card, Divider, IconTile, Strong } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

/**
 * "Check your plan" (Plans 35, 37): gentle questions about gaps and clashes in the
 * bookings. Each question has a title, one line of detail, its actions as small
 * outlined pills, and a ✕ to dismiss it. Shown only when there is something to ask.
 */
export function PlanChecks({ tripId, where }: { tripId: string; where: Where }) {
  const t = useTheme();
  const router = useRouter();
  const mutate = useMutate();
  if (!where.checks.length) return null;
  const dismiss = (c: PlanCheck) => mutate((db) => dismissCheck(db, tripId, c.key));
  const name = (id: string | null) => placeName(where.places, id);
  const count = where.checks.length;

  return (
    <Card>
      {/* A small label, so each question's title leads (Plan 37). */}
      <Text style={[type.label, styles.eyebrow, { color: t.ink2 }]}>
        Check your plan · {count} {count === 1 ? 'question' : 'questions'}
      </Text>
      {where.checks.map((c, i) => (
        <View key={c.key} style={{ gap: 12 }}>
          {i > 0 ? <Divider /> : null}
          {c.kind === 'noStay' ? (
            <CheckItem
              icon="stay"
              family="clay"
              title={`No stay for ${nightsText(c.startDate, c.endDate)}`}
              line={`${name(c.placeId) ? `You'll probably be in ${name(c.placeId)}. ` : ''}Where will you sleep?`}
              onDismiss={() => dismiss(c)}
            >
              <Button
                label="Add stay"
                icon="add"
                variant="secondary"
                small
                onPress={() =>
                  router.push(
                    `/trip/${tripId}/booking?type=stay&start=${c.startDate}&end=${c.endDate}`,
                  )
                }
              />
              <Button
                label="I'm sorted"
                variant="secondary"
                small
                onPress={() =>
                  router.push(
                    `/trip/${tripId}/stop?kind=stay&start=${c.startDate}&end=${c.endDate}${
                      c.placeId ? `&placeId=${encodeURIComponent(c.placeId)}` : ''
                    }`,
                  )
                }
              />
            </CheckItem>
          ) : c.kind === 'arrivalMismatch' ? (
            <CheckItem
              icon="route"
              family="sea"
              title={`Landing in ${name(c.arrivePlaceId)}, sleeping in ${name(c.stayPlaceId)}`}
              line={`On ${shortDate(c.date)}. Is that right?`}
            >
              <Button
                label="That's right"
                icon="check"
                variant="secondary"
                small
                onPress={() => dismiss(c)}
              />
              <Button
                label="Open booking"
                variant="secondary"
                small
                onPress={() => router.push(`/trip/${tripId}/booking?bookingId=${c.bookingId}`)}
              />
            </CheckItem>
          ) : (
            <CheckItem
              icon="stay"
              family="clay"
              title={`Two stays on ${shortDate(c.date)}`}
              line="Is one of them cancelled?"
              onDismiss={() => dismiss(c)}
            >
              {c.sourceIds.slice(0, 2).map((id, n) => (
                <Button
                  key={id}
                  label={n === 0 ? 'Open first' : 'Open second'}
                  variant="secondary"
                  small
                  onPress={() => router.push(`/trip/${tripId}/booking?bookingId=${id}`)}
                />
              ))}
            </CheckItem>
          )}
        </View>
      ))}
    </Card>
  );
}

function CheckItem({
  icon,
  family,
  title,
  line,
  onDismiss,
  children,
}: {
  icon: IconName;
  family: TileFamily;
  title: string;
  line: string;
  onDismiss?: () => void;
  children: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={styles.item}>
      <IconTile icon={icon} family={family} size={32} />
      <View style={styles.text}>
        <Strong>{title}</Strong>
        <Body muted small>
          {line}
        </Body>
        <View style={styles.actions}>{children}</View>
      </View>
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onDismiss}
          hitSlop={10}
          style={({ pressed }) => [styles.close, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name="close" size={18} color={t.ink2} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.8 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  text: { flex: 1, gap: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  // 24 pt visible, 44 pt to tap with the hit slop.
  close: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
});
