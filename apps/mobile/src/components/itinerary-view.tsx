import {
  addVariant,
  createPoll,
  ensureMainVariant,
  getBooking,
  getTrip,
  listAttachments,
  listItems,
  listMembers,
  listVariants,
  moveItem,
  myMember,
  setMainVariant,
  summarizeItems,
  whereInputs,
  type Item,
} from '@travelog/db';
import { datesBetween, dayBookings, localDateIn, type DayMoment } from '@travelog/core';
import { type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { dayChip, errorMessage, money } from '@/lib/format';
import { ITEM_LABELS } from '@/lib/labels';
import { dayPlaceLabel, useWhere } from '@/lib/where';
import { BookedCard, StayStrip } from './booking-moment';
import { PlanChecks } from './plan-checks';
import { RouteStrip } from './route-strip';
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
import { Appear, useMotionOk } from '@/ui/motion';
import { useMode, useTheme } from '@/ui/theme';
import { Icon, type IconName } from '@/ui/icon';

export const IDEAS_DAY = 'ideas';

/**
 * How far to scroll the day strip so a chip sits in the middle (Plan 43),
 * kept within the strip's ends so the first and last days stay at their edge.
 */
export function centreOffset(
  chipX: number,
  chipW: number,
  stripW: number,
  contentW: number,
): number {
  const ideal = chipX + chipW / 2 - stripW / 2;
  return Math.max(0, Math.min(ideal, Math.max(0, contentW - stripW)));
}

/** Days of a trip plus an "Ideas" bucket for things not yet placed on a day. */
export function tripDays(trip: { startDate: string | null; endDate: string | null }): string[] {
  const days = trip.startDate && trip.endDate ? datesBetween(trip.startDate, trip.endDate) : [];
  return [...days, IDEAS_DAY];
}

export function ItineraryView({
  tripId,
  initialDay,
  focusKey,
}: {
  tripId: string;
  initialDay?: string;
  /** Changes each time the tab comes back into view; the selected day re-centres (Plan 44). */
  focusKey?: number;
}) {
  const t = useTheme();
  const mode = useMode();
  const router = useRouter();
  const mutate = useMutate();
  const trip = useQuery((db) => getTrip(db, tripId), [tripId]);
  const where = useWhere(tripId);
  // Voting needs someone to vote with.
  const group = useQuery((db) => listMembers(db, tripId).length > 1, [tripId]);
  const days = trip ? tripDays(trip) : [IDEAS_DAY];
  const today = trip ? localDateIn(trip.timeZone) : '';
  const [day, setDay] = useState(initialDay ?? (days.includes(today) ? today : days[0]!));
  // Today's chip glides to the centre of the strip when the section opens (Plan 43).
  const motionOk = useMotionOk();
  const strip = useRef<ScrollViewInstance>(null);
  const chips = useRef(new Map<string, { x: number; w: number }>());
  const stripW = useRef(0);
  const centred = useRef(false);
  const centre = (d: string, animated: boolean) => {
    const chip = chips.current.get(d);
    if (!chip || !stripW.current) return false;
    const contentW = Math.max(...[...chips.current.values()].map((c) => c.x + c.w));
    strip.current?.scrollTo({
      x: centreOffset(chip.x, chip.w, stripW.current, contentW),
      animated,
    });
    return true;
  };
  const centreOnOpen = () => {
    if (!centred.current && centre(day, motionOk)) centred.current = true;
  };
  // Tabs stay mounted, so coming back to this one doesn't re-open it: re-centre on focus.
  const seenFocus = useRef(focusKey);
  useEffect(() => {
    if (focusKey === seenFocus.current) return;
    seenFocus.current = focusKey;
    if (centre(day, motionOk)) centred.current = true;
  });
  const variants = useQuery((db) => listVariants(db, tripId, day), [tripId, day]);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const variant =
    variants.find((v) => v.id === variantId) ?? variants.find((v) => v.isMain) ?? variants[0];
  const items = useQuery((db) => (variant ? listItems(db, variant.id) : []), [variant?.id]);
  // What's booked on this day, among the stops (Plan 42).
  const booked = useQuery(
    (db) => {
      const inputs = day === IDEAS_DAY ? null : whereInputs(db, tripId);
      if (!inputs) return null;
      const d = dayBookings(inputs, day);
      const ids = [...d.moments.map((m) => m.bookingId), d.staying?.bookingId].filter(
        (x): x is string => !!x,
      );
      const info = new Map(
        ids.map((id) => [
          id,
          { booking: getBooking(db, id)!, ticket: listAttachments(db, id)[0] ?? null },
        ]),
      );
      return { ...d, info };
    },
    [tripId, day],
  );
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

  const openBooking = (id: string) => router.push(`/trip/${tripId}/booking?bookingId=${id}`);
  const moments = booked?.moments ?? [];
  const momentCard = (m: DayMoment) => {
    const info = booked?.info.get(m.bookingId);
    if (!info?.booking) return null;
    return (
      <BookedCard
        key={`${m.kind}-${m.bookingId}`}
        moment={m}
        booking={info.booking}
        ticket={info.ticket}
        onPress={() => openBooking(m.bookingId)}
      />
    );
  };
  const stayStrip =
    booked?.staying && booked.info.get(booked.staying.bookingId)?.booking ? (
      <StayStrip
        strip={booked.staying}
        booking={booked.info.get(booked.staying.bookingId)!.booking}
        onPress={() => openBooking(booked.staying!.bookingId)}
      />
    ) : null;
  // Stops keep their own order; each booking goes before the first timed stop after it.
  const entries: ({ k: 'm'; m: DayMoment } | { k: 'i'; item: Item; index: number })[] = [];
  let next = 0;
  items.forEach((item, index) => {
    if (item.startTime)
      while (next < moments.length && moments[next]!.time && moments[next]!.time! <= item.startTime)
        entries.push({ k: 'm', m: moments[next++]! });
    entries.push({ k: 'i', item, index });
  });
  while (next < moments.length) entries.push({ k: 'm', m: moments[next++]! });

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
      {where ? (
        <RouteStrip
          tripId={tripId}
          where={where}
          onAddPlace={
            editable && trip?.startDate ? () => router.push(`/trip/${tripId}/stop`) : undefined
          }
        />
      ) : null}
      {where ? <PlanChecks tripId={tripId} where={where} /> : null}
      <ScrollView
        ref={strip}
        testID="day-strip"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
        onLayout={(e) => {
          stripW.current = e.nativeEvent.layout.width;
          centreOnOpen();
        }}
      >
        {days.map((d, i) => {
          const selected = d === day;
          const label = d === IDEAS_DAY ? { weekday: 'Ideas', day: 'Unplaced' } : dayChip(d);
          // Where you'll be that day, from the bookings (Plan 35).
          const at =
            d === IDEAS_DAY || !where
              ? null
              : dayPlaceLabel(
                  where.w.days.find((x) => x.date === d),
                  where,
                );
          return (
            <Pressable
              key={d}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={
                d === IDEAS_DAY ? 'Ideas' : `Day ${i + 1}, ${label.day}${at ? `, ${at}` : ''}`
              }
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                chips.current.set(d, { x, w: width });
                if (d === day) centreOnOpen();
              }}
              onPress={() => {
                setDay(d);
                setVariantId(null);
                setCompare(false);
                centre(d, motionOk);
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
              {at ? (
                <Text
                  style={[type.caption, { color: selected ? t.onAccent : t.ink2, maxWidth: 96 }]}
                  numberOfLines={1}
                >
                  {at}
                </Text>
              ) : null}
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
          {editable && group ? (
            <Button label="Let the group vote" icon="polls" onPress={putToVote} />
          ) : null}
        </View>
      ) : !variant && (moments.length || stayStrip) ? (
        <View style={{ gap: 8 }}>
          {stayStrip}
          {moments.map(momentCard)}
          {editable ? (
            <Button label="Add stop" icon="add" variant="secondary" onPress={addFirst} />
          ) : null}
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
          {stayStrip}
          {entries.map((e, n) =>
            e.k === 'm' ? (
              momentCard(e.m)
            ) : (
              <Appear key={e.item.id} index={n}>
                <ItemRow
                  item={e.item}
                  currency={trip.currency}
                  editable={editable}
                  onPress={() =>
                    router.push(`/trip/${tripId}/item?variantId=${variant.id}&itemId=${e.item.id}`)
                  }
                  onUp={
                    e.index > 0
                      ? () => run(() => mutate((db) => moveItem(db, e.item.id, e.index - 1)))
                      : undefined
                  }
                  onDown={
                    e.index < items.length - 1
                      ? () => run(() => mutate((db) => moveItem(db, e.item.id, e.index + 1)))
                      : undefined
                  }
                />
              </Appear>
            ),
          )}
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
