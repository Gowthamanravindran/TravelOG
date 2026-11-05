import {
  deleteCheckIn,
  ensureMainVariant,
  getTrip,
  listCheckIns,
  listItems,
  listVariants,
  myMember,
  tripMoney,
  listBookings,
} from '@travelog/db';
import { durationLabel, localDateIn, localTimeIn, timeline } from '@travelog/core';
import { type } from '@travelog/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { useDb, useMutate, useQuery } from '@/data/provider';
import { checkInNow } from '@/lib/check-in';
import { dateTimeIn, errorMessage, money } from '@/lib/format';
import { ITEM_LABELS } from '@/lib/labels';
import { minutesUntil, statusAt } from '@/lib/today';
import {
  Between,
  Body,
  Button,
  Card,
  Empty,
  ErrorText,
  H2,
  Row,
  Screen,
  Strong,
  WithIcon,
} from '@/ui/kit';
import { useTheme } from '@/ui/theme';
import { Icon } from '@/ui/icon';

export default function TodayTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const router = useRouter();
  const mutate = useMutate();
  const db = useDb();
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const trip = useQuery((db) => getTrip(db, id), [id]);
  const today = trip ? localDateIn(trip.timeZone, clock) : '';
  const items = useQuery(
    (db) => {
      const main = listVariants(db, id, today).find((v) => v.isMain);
      return main ? listItems(db, main.id) : [];
    },
    [id, today],
  );
  const myShareToday = useQuery(
    (db) => {
      const me = myMember(db, id);
      return me ? (tripMoney(db, id).shareByMember.get(me.id) ?? 0) : 0;
    },
    [id],
  );
  const nextBooking = useQuery(
    (db) => listBookings(db, id).find((b) => b.startsAt && new Date(b.startsAt) > clock),
    [id, clock.getTime()],
  );
  const checkIns = useQuery((db) => listCheckIns(db, id, today), [id, today]);
  if (!trip) return null;

  const checkedIn = new Map(checkIns.filter((c) => c.itemId).map((c) => [c.itemId, c]));
  const day = timeline(checkIns, clock);
  const timeOf = (iso: string) => localTimeIn(trip.timeZone, new Date(iso));

  const imHere = async (itemId: string, title: string) => {
    setCheckingIn(itemId);
    setError(null);
    try {
      await checkInNow(db, mutate, { tripId: id, itemId, title });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCheckingIn(null);
    }
  };

  const removeCheckIn = (checkInId: string) =>
    Alert.alert('Remove this check-in?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => mutate((db) => deleteCheckIn(db, checkInId)),
      },
    ]);

  const nowTime = localTimeIn(trip.timeZone, clock);
  const statuses = statusAt(items, nowTime);
  const focus =
    statuses.find((s) => s.status === 'now') ?? statuses.find((s) => s.status === 'next');

  return (
    <Screen edges={[]}>
      {focus ? (
        <View style={{ backgroundColor: t.accent, borderRadius: 24, padding: 18, gap: 8 }}>
          <Between>
            <Text style={[type.label, { color: t.onAccent }]}>
              {focus.status === 'now' ? 'NOW' : 'NEXT'} · {focus.item.startTime}
            </Text>
            {focus.status === 'next' && focus.item.startTime ? (
              <Text style={[type.label, { color: t.onAccent }]}>
                in {minutesUntil(focus.item.startTime, nowTime)} min
              </Text>
            ) : null}
          </Between>
          <WithIcon icon={ITEM_LABELS[focus.item.type].icon} color="#FFFFFF" size={26}>
            <Text style={[type.display, { color: '#FFFFFF' }]}>{focus.item.title}</Text>
          </WithIcon>
          {focus.item.notes ? (
            <Text style={[type.body, { color: t.onAccent }]}>{focus.item.notes}</Text>
          ) : null}
        </View>
      ) : (
        <Empty
          icon="today"
          title={items.length ? 'Nothing else timed today' : 'No plan for today'}
          body={items.length ? 'Enjoy the evening.' : "Add today's stops in the plan."}
          action={
            !items.length ? (
              <Button
                label="Plan today"
                onPress={() => {
                  const v = mutate((db) => ensureMainVariant(db, id, today, myMember(db, id)?.id));
                  router.push(`/trip/${id}/item?variantId=${v.id}`);
                }}
              />
            ) : undefined
          }
        />
      )}

      <Row>
        <View style={{ flex: 1 }}>
          <Button
            label="Expense"
            icon="expense"
            onPress={() => router.push(`/trip/${id}/expense?mode=trip`)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Check in"
            icon="checkIn"
            variant="ghost"
            onPress={() => router.push(`/trip/${id}/check-in`)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Tickets"
            icon="bookings"
            variant="ghost"
            onPress={() => router.push(`/trip/${id}/plan/bookings`)}
          />
        </View>
      </Row>

      <Card>
        <Between>
          <Body muted small>
            My share so far
          </Body>
          <Strong>{money(myShareToday, trip.currency)}</Strong>
        </Between>
        {nextBooking?.startsAt ? (
          <Body small muted>
            Next booking: {nextBooking.title} · {dateTimeIn(nextBooking.startsAt, trip.timeZone)}
            {nextBooking.reference ? ` · ${nextBooking.reference}` : ''}
          </Body>
        ) : null}
      </Card>

      {items.length ? <H2>Today</H2> : null}
      {statuses.map(({ item, status }) => (
        <Row key={item.id} style={{ alignItems: 'stretch', opacity: status === 'done' ? 0.5 : 1 }}>
          <Text style={[type.caption, { width: 44, color: t.ink2, paddingTop: 14 }]}>
            {item.startTime ?? ''}
          </Text>
          <Card
            style={[
              { flex: 1, padding: 12 },
              status === 'now' && { borderColor: t.accent, borderWidth: 2 },
            ]}
          >
            <Between>
              <WithIcon icon={ITEM_LABELS[item.type].icon}>
                <Strong>{item.title}</Strong>
              </WithIcon>
              {status === 'done' ? (
                <Icon name="check" size={18} color={t.accent} label="Done" />
              ) : null}
            </Between>
            {item.durationMin ? (
              <Body muted small>
                {item.durationMin} min
              </Body>
            ) : null}
            {checkedIn.get(item.id) ? (
              <WithIcon icon="check" color={t.accent} size={16}>
                <Body small style={{ color: t.accent }}>
                  Checked in at {timeOf(checkedIn.get(item.id)!.at)}
                </Body>
              </WithIcon>
            ) : status !== 'done' && status !== 'later' ? (
              <Button
                label={checkingIn === item.id ? 'Checking in…' : "I'm here"}
                icon="checkIn"
                variant="ghost"
                small
                disabled={checkingIn !== null}
                onPress={() => imHere(item.id, item.title)}
              />
            ) : null}
          </Card>
        </Row>
      ))}
      <ErrorText>{error}</ErrorText>

      {day.length ? (
        <>
          <H2>Today&apos;s timeline</H2>
          {day.map(({ checkIn, minutes, ongoing }) => (
            <Pressable
              key={checkIn.id}
              onLongPress={() => removeCheckIn(checkIn.id)}
              accessibilityRole="button"
              accessibilityHint="Long-press to remove"
            >
              <Row>
                <Text style={[type.caption, { width: 44, color: t.ink2 }]}>
                  {timeOf(checkIn.at)}
                </Text>
                <View style={{ flex: 1 }}>
                  <WithIcon icon={checkIn.lat != null ? 'located' : 'place'} color={t.accent}>
                    <Strong>{checkIn.title}</Strong>
                  </WithIcon>
                  {checkIn.note ? (
                    <Body muted small>
                      {checkIn.note}
                    </Body>
                  ) : null}
                </View>
                {minutes != null ? (
                  <Body muted small>
                    {ongoing ? `here ${durationLabel(minutes)}` : durationLabel(minutes)}
                  </Body>
                ) : null}
              </Row>
            </Pressable>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
