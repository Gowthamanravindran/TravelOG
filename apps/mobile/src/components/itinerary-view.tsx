import {
  addVariant,
  createPoll,
  ensureMainVariant,
  getTrip,
  listItems,
  listVariants,
  moveItem,
  myMember,
  setMainVariant,
  summarizeItems,
  type Item,
} from '@travelog/db';
import { datesBetween, localDateIn } from '@travelog/core';
import { type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { dayChip, errorMessage, money } from '@/lib/format';
import { ITEM_LABELS } from '@/lib/labels';
import {
  Between,
  Body,
  Button,
  Card,
  Chip,
  ChipRow,
  Empty,
  ErrorText,
  Row,
  Strong,
  WithIcon,
} from '@/ui/kit';
import { Appear } from '@/ui/motion';
import { useMode, useTheme } from '@/ui/theme';
import { Icon, type IconName } from '@/ui/icon';

export const IDEAS_DAY = 'ideas';

/** Days of a trip plus an "Ideas" bucket for things not yet placed on a day. */
export function tripDays(trip: { startDate: string | null; endDate: string | null }): string[] {
  const days = trip.startDate && trip.endDate ? datesBetween(trip.startDate, trip.endDate) : [];
  return [...days, IDEAS_DAY];
}

export function ItineraryView({ tripId, initialDay }: { tripId: string; initialDay?: string }) {
  const t = useTheme();
  const mode = useMode();
  const router = useRouter();
  const mutate = useMutate();
  const trip = useQuery((db) => getTrip(db, tripId), [tripId]);
  const days = trip ? tripDays(trip) : [IDEAS_DAY];
  const today = trip ? localDateIn(trip.timeZone) : '';
  const [day, setDay] = useState(initialDay ?? (days.includes(today) ? today : days[0]!));
  const variants = useQuery((db) => listVariants(db, tripId, day), [tripId, day]);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const variant =
    variants.find((v) => v.id === variantId) ?? variants.find((v) => v.isMain) ?? variants[0];
  const items = useQuery((db) => (variant ? listItems(db, variant.id) : []), [variant?.id]);
  const summaries = useQuery(
    (db) => variants.map((v) => ({ v, s: summarizeItems(listItems(db, v.id)) })),
    [variants.map((v) => v.id).join()],
  );
  if (!trip) return null;
  const editable = mode === 'plan';

  const run = (fn: () => void) => {
    try {
      setError(null);
      fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const addFirst = () =>
    run(() => {
      const v = mutate((db) => ensureMainVariant(db, tripId, day, myMember(db, tripId)?.id));
      router.push(`/trip/${tripId}/item?variantId=${v.id}`);
    });

  const addPlan = () =>
    run(() => {
      const v = mutate((db) =>
        addVariant(db, tripId, day, {
          copyFromVariantId: variant?.id,
          authorMemberId: myMember(db, tripId)?.id,
        }),
      );
      setVariantId(v.id);
      setCompare(false);
    });

  const putToVote = () =>
    run(() => {
      mutate((db) =>
        createPoll(db, {
          tripId,
          type: 'variant',
          question: `Which plan for ${day === IDEAS_DAY ? 'Ideas' : dayChip(day).day}?`,
          createdByMemberId: myMember(db, tripId)?.id,
          options: variants.map((v) => ({
            label: v.name,
            payload: { kind: 'variant' as const, variantId: v.id },
          })),
        }),
      );
      router.navigate(`/trip/${tripId}/plan/polls`);
    });

  return (
    <View style={{ gap: 14 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {days.map((d, i) => {
          const selected = d === day;
          const label = d === IDEAS_DAY ? { weekday: 'Ideas', day: 'Unplaced' } : dayChip(d);
          return (
            <Pressable
              key={d}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={d === IDEAS_DAY ? 'Ideas' : `Day ${i + 1}, ${label.day}`}
              onPress={() => {
                setDay(d);
                setVariantId(null);
                setCompare(false);
              }}
              style={[
                styles.dayChip,
                {
                  backgroundColor: selected ? t.accent : t.surface,
                  borderColor: selected ? t.accent : t.line,
                },
              ]}
            >
              <Text style={[type.headline, { color: selected ? t.onAccent : t.ink }]}>
                {d === IDEAS_DAY ? 'Ideas' : `Day ${i + 1}`}
              </Text>
              <Text style={[type.caption, { color: selected ? t.onAccent : t.ink2 }]}>
                {d === today ? 'Today' : label.day}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {variants.length > 0 ? (
        <Between>
          <ChipRow>
            {variants.map((v) => (
              <Chip
                key={v.id}
                label={v.isMain ? `${v.name} (main)` : v.name}
                selected={!compare && v.id === variant?.id}
                onPress={() => {
                  setVariantId(v.id);
                  setCompare(false);
                }}
              />
            ))}
            {editable ? <Chip label="Plan" icon="add" onPress={addPlan} /> : null}
          </ChipRow>
          {variants.length > 1 ? (
            <Button
              label={compare ? 'Close' : 'Compare'}
              variant="link"
              onPress={() => setCompare(!compare)}
            />
          ) : null}
        </Between>
      ) : null}
      <ErrorText>{error}</ErrorText>

      {compare ? (
        <View style={{ gap: 10 }}>
          {summaries.map(({ v, s }) => (
            <Card key={v.id}>
              <Between>
                <Strong>
                  {v.name}
                  {v.isMain ? ' · main' : ''}
                </Strong>
                {editable && !v.isMain ? (
                  <Button
                    label="Make main"
                    variant="link"
                    onPress={() => run(() => mutate((db) => setMainVariant(db, v.id)))}
                  />
                ) : null}
              </Between>
              <Body muted small>
                {s.itemCount} stops · starts {s.firstStart ?? '—'} · est.{' '}
                {money(s.estCostMinor, trip.currency)}
              </Body>
            </Card>
          ))}
          {editable ? <Button label="Let the group vote" icon="polls" onPress={putToVote} /> : null}
        </View>
      ) : !variant ? (
        <Empty
          icon={day === IDEAS_DAY ? 'idea' : 'plan'}
          title={day === IDEAS_DAY ? 'Collect ideas here' : 'Nothing planned for this day'}
          body={
            editable
              ? 'Add places, food, stays and transport. You can add a Plan B later.'
              : undefined
          }
          action={editable ? <Button label="Add the first stop" onPress={addFirst} /> : undefined}
        />
      ) : (
        <View style={{ gap: 8 }}>
          {(() => {
            const s = summarizeItems(items);
            return (
              <Body muted small>
                {s.itemCount} stops · est. {money(s.estCostMinor, trip.currency)}
              </Body>
            );
          })()}
          {items.map((item, index) => (
            <Appear key={item.id} index={index}>
              <ItemRow
                item={item}
                currency={trip.currency}
                editable={editable}
                onPress={() =>
                  router.push(`/trip/${tripId}/item?variantId=${variant.id}&itemId=${item.id}`)
                }
                onUp={
                  index > 0
                    ? () => run(() => mutate((db) => moveItem(db, item.id, index - 1)))
                    : undefined
                }
                onDown={
                  index < items.length - 1
                    ? () => run(() => mutate((db) => moveItem(db, item.id, index + 1)))
                    : undefined
                }
              />
            </Appear>
          ))}
          {editable ? (
            <Button
              label="Add stop"
              icon="add"
              variant="secondary"
              onPress={() => router.push(`/trip/${tripId}/item?variantId=${variant.id}`)}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

function ItemRow({
  item,
  currency,
  editable,
  onPress,
  onUp,
  onDown,
}: {
  item: Item;
  currency: string;
  editable: boolean;
  onPress: () => void;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const t = useTheme();
  const meta = [
    ITEM_LABELS[item.type].label,
    item.durationMin ? `${item.durationMin} min` : null,
    item.estCostMinor ? money(item.estCostMinor, item.currency ?? currency) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Row style={{ alignItems: 'stretch' }}>
      <Text style={[type.caption, { width: 44, color: t.ink2, paddingTop: 16 }]}>
        {item.startTime ?? ''}
      </Text>
      <Card
        onPress={editable ? onPress : undefined}
        style={{ flex: 1, padding: 12 }}
        accessibilityLabel={item.title}
      >
        <Between>
          <View style={{ flex: 1 }}>
            <WithIcon icon={ITEM_LABELS[item.type].icon}>
              <Strong>{item.title}</Strong>
            </WithIcon>
          </View>
          {editable ? (
            <Row style={{ gap: 4 }}>
              <SmallIcon label="Move up" icon="up" onPress={onUp} />
              <SmallIcon label="Move down" icon="down" onPress={onDown} />
            </Row>
          ) : null}
        </Between>
        <Body muted small>
          {meta}
        </Body>
        {item.notes ? (
          <Body small numberOfLines={2}>
            {item.notes}
          </Body>
        ) : null}
      </Card>
    </Row>
  );
}

function SmallIcon({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress?: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      hitSlop={6}
      style={[styles.icon, { backgroundColor: t.surface2, opacity: onPress ? 1 : 0.3 }]}
    >
      <Icon name={icon} size={16} color={t.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  icon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
