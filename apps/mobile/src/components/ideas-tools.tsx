import { spreadOverDays } from '@travelog/core';
import {
  addSavedToTrip,
  getPlace,
  getTrip,
  listItems,
  listVariants,
  moveItemsToDays,
  myMember,
  savedNear,
  savedOnTrip,
  type Item,
} from '@travelog/db';
import { type } from '@travelog/ui';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { dayChip } from '@/lib/format';
import { ITEM_LABELS } from '@/lib/labels';
import { tripCentre } from '@/lib/stop-search';
import { BottomSheet } from '@/ui/bottom-sheet';
import { Icon } from '@/ui/icon';
import { Body, Button, Card, Strong } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

import { pointOf } from './travel';

/**
 * Plan 58: on a trip's Ideas day, the Saved places near it that aren't on the trip yet.
 * Add opens a list to pick from; all are ticked to start with.
 */
export function SavedForTrip({ tripId, day }: { tripId: string; day: string }) {
  const t = useTheme();
  const mutate = useMutate();
  const found = useQuery(
    (db) => {
      const trip = getTrip(db, tripId);
      const dest = trip?.destinationPlaceId ? getPlace(db, trip.destinationPlaceId) : undefined;
      const on = savedOnTrip(db, tripId);
      const places = savedNear(db, {
        centre: tripCentre(db, tripId),
        countryCode: dest?.countryCode,
      }).filter((s) => !on.has(s.id));
      return { places, where: dest?.name ?? trip?.destination ?? 'this trip' };
    },
    [tripId],
  );
  const [open, setOpen] = useState(false);
  const [off, setOff] = useState<Set<string>>(new Set());
  if (!found.places.length) return null;
  const n = found.places.length;
  const picked = found.places.filter((p) => !off.has(p.id));

  return (
    <>
      <Card style={{ padding: 12, backgroundColor: t.accentSoft, borderColor: t.accentSoft }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name="saved" size={22} color={t.accent} />
          <View style={{ flex: 1 }}>
            <Strong>{`${n} saved ${n === 1 ? 'place' : 'places'} near ${found.where}`}</Strong>
            <Body muted small>
              From your Saved list
            </Body>
          </View>
          <Button label="Add" small onPress={() => setOpen(true)} />
        </View>
      </Card>
      <BottomSheet visible={open} onClose={() => setOpen(false)} closeLabel="Close saved places">
        <View style={{ gap: 12 }}>
          <Text style={[type.title, { color: t.ink }]}>Add to Ideas</Text>
          {found.places.map((p) => {
            const on = !off.has(p.id);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={p.title}
                onPress={() => {
                  const next = new Set(off);
                  if (on) next.add(p.id);
                  else next.delete(p.id);
                  setOff(next);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}
              >
                <Icon name={on ? 'check' : 'circle'} size={22} color={on ? t.accent : t.ink2} />
                <Icon name={ITEM_LABELS[p.type].icon} size={18} color={t.ink2} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.headline, { color: t.ink }]} numberOfLines={1}>
                    {p.title}
                  </Text>
                  {p.address || p.area ? (
                    <Text style={[type.caption, { color: t.ink2 }]} numberOfLines={1}>
                      {p.address ?? p.area}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
          <Button
            label={picked.length ? `Add ${picked.length} to Ideas` : 'Pick a place'}
            disabled={!picked.length}
            onPress={() => {
              mutate((db) =>
                addSavedToTrip(
                  db,
                  picked.map((p) => p.id),
                  tripId,
                  day,
                  myMember(db, tripId)?.id,
                ),
              );
              setOpen(false);
              setOff(new Set());
            }}
          />
        </View>
      </BottomSheet>
    </>
  );
}

/**
 * Plan 58: spreads the Ideas over the trip's days, grouped by area (core `spreadOverDays`).
 * A preview first; nothing moves until Add to days.
 */
export function PlanIdeas({
  tripId,
  days,
  ideas,
}: {
  tripId: string;
  days: readonly string[];
  ideas: readonly Item[];
}) {
  const t = useTheme();
  const mutate = useMutate();
  const [open, setOpen] = useState(false);
  const loads = useQuery(
    (db) =>
      days.map((d) => {
        const v = listVariants(db, tripId, d).find((x) => x.isMain);
        return { day: d, load: v ? listItems(db, v.id).length : 0 };
      }),
    [tripId, days.join()],
  );
  if (!days.length || !ideas.some((i) => pointOf(i))) return null;
  const spread = spreadOverDays(
    ideas.map((i) => ({ id: i.id, point: pointOf(i) })),
    loads,
  );
  const byId = new Map(ideas.map((i) => [i.id, i]));
  const moving = spread.plan.reduce((n, p) => n + p.ids.length, 0);

  return (
    <>
      <Button label="Plan these ideas" icon="dates" onPress={() => setOpen(true)} />
      <BottomSheet visible={open} onClose={() => setOpen(false)} closeLabel="Close plan ideas">
        <View style={{ gap: 12 }}>
          <Text style={[type.title, { color: t.ink }]}>Plan these ideas</Text>
          <Body muted small>
            Grouped by area, so each day stays close by. Emptier days get more.
          </Body>
          {spread.plan.map((p) => (
            <Card key={p.day} style={{ padding: 10, gap: 2 }}>
              <Strong>{`${dayChip(p.day).day} · +${p.ids.length}`}</Strong>
              <Body muted small numberOfLines={2}>
                {p.ids.map((id) => byId.get(id)?.title).join(' · ')}
              </Body>
            </Card>
          ))}
          {spread.left.length ? (
            <Card style={{ padding: 10, gap: 2 }}>
              <Strong>{`Stay in Ideas · ${spread.left.length}`}</Strong>
              <Body muted small numberOfLines={2}>
                {spread.left.map((id) => byId.get(id)?.title).join(' · ')} (no place yet)
              </Body>
            </Card>
          ) : null}
          <Button
            label={`Add ${moving} to days`}
            disabled={!moving}
            onPress={() => {
              mutate((db) => moveItemsToDays(db, tripId, spread.plan, myMember(db, tripId)?.id));
              setOpen(false);
            }}
          />
          <Button label="Cancel" variant="secondary" onPress={() => setOpen(false)} />
        </View>
      </BottomSheet>
    </>
  );
}
