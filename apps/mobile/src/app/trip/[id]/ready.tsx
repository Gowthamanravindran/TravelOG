import {
  addChecklistItem,
  deleteChecklistItem,
  ensureMainVariant,
  getTrip,
  myMember,
  seedChecklist,
  setChecklistDone,
  updateChecklistItem,
  type ChecklistItem,
  type ChecklistSection,
} from '@travelog/db';
import type { AutoItem } from '@travelog/core';
import { type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { IDEAS_DAY } from '@/components/itinerary-view';
import { useMutate, useQuery } from '@/data/provider';
import { errorMessage, shortDate } from '@/lib/format';
import { useTripReadiness } from '@/lib/readiness';
import { useTripId } from '@/lib/use-trip-id';
import { BottomSheet } from '@/ui/bottom-sheet';
import { DateField } from '@/ui/date-field';
import { Icon } from '@/ui/icon';
import { Between, Body, Button, Card, ErrorText, Field, H1, Row, Screen } from '@/ui/kit';
import { ProgressRing } from '@/ui/progress-ring';
import { ModeProvider, useTheme } from '@/ui/theme';

const SECTIONS: { key: ChecklistSection; title: string }[] = [
  { key: 'documents', title: 'Documents' },
  { key: 'money', title: 'Money and phone' },
  { key: 'packing', title: 'Packing' },
  { key: 'other', title: 'Other' },
];

/** Plan 61: the whole Get ready list. Bookings items tick themselves; the rest are yours. */
export default function ReadyScreen() {
  const id = useTripId();
  const router = useRouter();
  const mutate = useMutate();
  const t = useTheme();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  const r = useTripReadiness(id);
  const [adding, setAdding] = useState('');
  const [editing, setEditing] = useState<ChecklistItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!trip || !r) return null;

  const run = (fn: () => void) => {
    try {
      setError(null);
      fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  // The budget and bookings are tabs of the trip already open under this sheet: go back to
  // them, rather than open the trip a second time on top (Plan 91).
  const openAuto = (a: AutoItem) => {
    if (a.key === 'budget') router.dismissTo(`/trip/${id}/plan/budget?edit=1`);
    else if (a.key === 'plan') {
      const v = mutate((db) =>
        ensureMainVariant(db, id, trip.startDate ?? IDEAS_DAY, myMember(db, id)?.id),
      );
      router.push(`/trip/${id}/item?variantId=${v.id}`);
    } else router.dismissTo(`/trip/${id}/plan/bookings`);
  };

  return (
    <ModeProvider mode="plan">
      <Screen edges={['top', 'bottom']}>
        <Between>
          <H1>Get ready</H1>
          <Row style={{ alignItems: 'center' }}>
            <ProgressRing done={r.summary.done} total={r.summary.total} size={38} stroke={4} />
            <Button label="Done" variant="link" onPress={() => router.back()} />
          </Row>
        </Between>

        <SectionTitle title="Bookings" note="ticked from your trip" />
        {r.auto.map((a) => (
          <CheckRow
            key={a.key}
            title={a.title}
            detail={a.detail}
            done={a.done}
            auto
            onPress={() => openAuto(a)}
          />
        ))}

        {r.manual.length === 0 ? (
          <Card style={{ gap: 8 }}>
            <Text style={[type.headline, { color: t.ink }]}>Start your checklist</Text>
            <Body muted small>
              {r.suggestions.map((s) => s.title).join(' · ')}
            </Body>
            <Button
              label={`Use these ${r.suggestions.length}`}
              onPress={() =>
                run(() => mutate((db) => seedChecklist(db, id, 'ready', r.suggestions)))
              }
            />
            <Body muted small>
              Or add your own below.
            </Body>
          </Card>
        ) : null}

        {SECTIONS.map((s) => {
          const items = r.manual.filter((m) => m.section === s.key);
          if (!items.length) return null;
          return (
            <View key={s.key} style={{ gap: 2 }}>
              <SectionTitle title={s.title} />
              {items.map((m) => (
                <CheckRow
                  key={m.id}
                  title={m.title}
                  detail={m.note}
                  due={m.dueDate}
                  done={!!m.doneAt}
                  onToggle={() => run(() => mutate((db) => setChecklistDone(db, m.id, !m.doneAt)))}
                  onPress={() => setEditing(m)}
                />
              ))}
            </View>
          );
        })}

        <Row style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Add an item"
              value={adding}
              onChangeText={setAdding}
              placeholder="e.g. Book airport cab"
            />
          </View>
          <Button
            label="Add"
            variant="secondary"
            disabled={!adding.trim()}
            onPress={() =>
              run(() => {
                mutate((db) => addChecklistItem(db, id, 'ready', { title: adding }));
                setAdding('');
              })
            }
          />
        </Row>
        <ErrorText>{error}</ErrorText>
        <ItemSheet item={editing} onClose={() => setEditing(null)} onError={setError} />
      </Screen>
    </ModeProvider>
  );
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
      <Text style={[type.headline, { color: t.ink }]}>{title}</Text>
      {note ? <Text style={[type.caption, { color: t.ink2 }]}>{note}</Text> : null}
    </View>
  );
}

function CheckRow({
  title,
  detail,
  due,
  done,
  auto,
  onToggle,
  onPress,
}: {
  title: string;
  detail?: string | null;
  due?: string | null;
  done: boolean;
  auto?: boolean;
  onToggle?: () => void;
  onPress?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done, disabled: auto }}
        accessibilityLabel={title}
        disabled={auto}
        hitSlop={8}
        onPress={onToggle}
      >
        <Icon
          name={done ? 'check' : 'circle'}
          size={24}
          color={done ? (auto ? t.success : t.accent) : t.ink2}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title} details`}
        onPress={onPress}
        style={{ flex: 1 }}
      >
        <Text style={[type.body, { color: done ? t.ink2 : t.ink }]} numberOfLines={2}>
          {title}
        </Text>
        {detail ? (
          <Text style={[type.caption, { color: t.ink2 }]} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </Pressable>
      {auto ? (
        <Text style={[type.caption, { color: t.success }]}>Auto</Text>
      ) : due ? (
        <Text style={[type.caption, { color: done ? t.ink2 : t.danger }]}>{shortDate(due)}</Text>
      ) : null}
    </View>
  );
}

/** An item: due date, Remind me, note, Mark done, Remove. */
function ItemSheet({
  item,
  onClose,
  onError,
}: {
  item: ChecklistItem | null;
  onClose: () => void;
  onError: (e: string) => void;
}) {
  const t = useTheme();
  const mutate = useMutate();
  const [due, setDue] = useState('');
  const [remind, setRemind] = useState(false);
  const [note, setNote] = useState('');
  const [for_, setFor] = useState<string | null>(null);
  if (item && for_ !== item.id) {
    setFor(item.id);
    setDue(item.dueDate ?? '');
    setRemind(item.remind);
    setNote(item.note ?? '');
  }
  const save = (patch: { done?: boolean } = {}) => {
    if (!item) return;
    try {
      mutate((db) => {
        updateChecklistItem(db, item.id, { dueDate: due || null, remind: !!due && remind, note });
        if (patch.done !== undefined) setChecklistDone(db, item.id, patch.done);
      });
      onClose();
    } catch (e) {
      onError(errorMessage(e));
    }
  };
  return (
    <BottomSheet visible={!!item} onClose={() => save()} closeLabel="Close item">
      {item ? (
        <View style={{ gap: 12 }}>
          <Text style={[type.title, { color: t.ink }]}>{item.title}</Text>
          <DateField label="Due" value={due} onChange={setDue} placeholder="No due date" />
          <Between>
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { color: t.ink }]}>Remind me</Text>
              <Text style={[type.caption, { color: t.ink2 }]}>3 days before it’s due, at 9:00</Text>
            </View>
            <Switch
              accessibilityLabel="Remind me"
              value={!!due && remind}
              disabled={!due}
              onValueChange={setRemind}
            />
          </Between>
          <Field label="Note" value={note} onChangeText={setNote} multiline />
          <Row>
            <View style={{ flex: 1 }}>
              <Button
                label="Remove"
                variant="secondary"
                danger
                onPress={() => {
                  mutate((db) => deleteChecklistItem(db, item.id));
                  onClose();
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={item.doneAt ? 'Not done' : 'Mark done'}
                onPress={() => save({ done: !item.doneAt })}
              />
            </View>
          </Row>
        </View>
      ) : null}
    </BottomSheet>
  );
}
