import {
  ensureMainVariant,
  getTrip,
  listItems,
  listVariants,
  myMember,
  tripMoney,
  listBookings,
} from '@travelog/db';
import { localDateIn, localTimeIn } from '@travelog/core';
import { type } from '@travelog/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { dateTimeIn, money } from '@/lib/format';
import { ITEM_LABELS } from '@/lib/labels';
import { minutesUntil, statusAt } from '@/lib/today';
import { Between, Body, Button, Card, Empty, H2, Row, Screen, Strong } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

export default function TodayTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const router = useRouter();
  const mutate = useMutate();
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
  if (!trip) return null;

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
          <Text style={[type.display, { color: '#FFFFFF' }]}>
            {ITEM_LABELS[focus.item.type].icon} {focus.item.title}
          </Text>
          {focus.item.notes ? (
            <Text style={[type.body, { color: t.onAccent }]}>{focus.item.notes}</Text>
          ) : null}
        </View>
      ) : (
        <Empty
          icon="☀️"
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
          <Button label="💸 Expense" onPress={() => router.push(`/trip/${id}/expense?mode=trip`)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="🎫 Tickets"
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
            <Strong>
              {ITEM_LABELS[item.type].icon} {item.title}
              {status === 'done' ? '  ✓' : ''}
            </Strong>
            {item.durationMin ? (
              <Body muted small>
                {item.durationMin} min
              </Body>
            ) : null}
          </Card>
        </Row>
      ))}
    </Screen>
  );
}
