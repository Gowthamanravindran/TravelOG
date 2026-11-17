import { localTimeIn, tripState } from '@travelog/core';
import {
  addChecklistItem,
  deleteChecklistItem,
  getTrip,
  setCheckInNote,
  type CheckIn,
} from '@travelog/db';
import { type } from '@travelog/ui';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useDb, useMutate, useQuery } from '@/data/provider';
import { errorMessage, shortDate } from '@/lib/format';
import {
  mustDoList,
  tickMustDo,
  untickMustDo,
  type MustDo,
  type MustDoSource,
} from '@/lib/must-do';
import { useTripId } from '@/lib/use-trip-id';
import { BottomSheet } from '@/ui/bottom-sheet';
import { Icon } from '@/ui/icon';
import {
  Between,
  Body,
  Button,
  Card,
  Chip,
  ChipRow,
  Empty,
  ErrorText,
  Field,
  Row,
  Screen,
} from '@/ui/kit';
import { ProgressRing } from '@/ui/progress-ring';
import { useTheme } from '@/ui/theme';

const SOURCE: Record<MustDoSource, string> = {
  idea: 'Idea',
  star: '★ Stop',
  added: 'Added',
};

/**
 * Plan 62: Must-do (the Nearby tab until maps arrive). The trip's Ideas, starred stops,
 * and anything typed here; ticking one saves a check-in. (Saved places are hidden, Plan 69.)
 */
export default function MustDoTab() {
  const id = useTripId();
  const db = useDb();
  const mutate = useMutate();
  const t = useTheme();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  const list = useQuery((db) => mustDoList(db, id), [id]);
  const [show, setShow] = useState<'todo' | 'done'>('todo');
  const [adding, setAdding] = useState('');
  const [just, setJust] = useState<CheckIn | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!trip) return null;
  const todo = list.filter((m) => !m.done);
  const done = list.filter((m) => m.done).sort((a, b) => b.done!.at.localeCompare(a.done!.at));
  const ended = ['completed', 'archived'].includes(tripState(trip));

  const tick = async (m: MustDo) => {
    try {
      setError(null);
      const c = await tickMustDo(db, mutate, id, m);
      setNote('');
      setJust(c);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen edges={[]}>
      <Between>
        <Body muted small>
          {list.length
            ? `${done.length} of ${list.length} done`
            : 'Ideas and starred stops show here'}
        </Body>
        {list.length ? (
          <ProgressRing done={done.length} total={list.length} size={38} stroke={4} />
        ) : null}
      </Between>

      {ended && todo.length ? (
        <Card style={{ gap: 8 }}>
          <Text style={[type.headline, { color: t.ink }]}>
            {`${todo.length} left for next time`}
          </Text>
          <Body muted small>
            {todo.map((m) => m.title).join(' · ')}
          </Body>
        </Card>
      ) : null}

      <ChipRow>
        <Chip
          label={`To do ${todo.length}`}
          selected={show === 'todo'}
          onPress={() => setShow('todo')}
        />
        <Chip
          label={`Done ${done.length}`}
          selected={show === 'done'}
          onPress={() => setShow('done')}
        />
      </ChipRow>

      {list.length === 0 ? (
        <Empty
          icon="check"
          art="pin"
          artFamily="mango"
          title="What you must do here"
          body="Star stops in your plan, add ideas, or save places from reels. They all show here to tick off."
        />
      ) : null}

      {(show === 'todo' ? todo : done).map((m) => (
        <View
          key={m.key}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}
        >
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!m.done }}
            accessibilityLabel={m.title}
            hitSlop={8}
            onPress={() => (m.done ? mutate((db) => untickMustDo(db, m)) : void tick(m))}
          >
            <Icon name={m.done ? 'check' : 'circle'} size={26} color={m.done ? t.accent : t.ink2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[type.body, { color: m.done ? t.ink2 : t.ink }]} numberOfLines={2}>
              {m.title}
            </Text>
            <Text style={[type.caption, { color: t.ink2 }]} numberOfLines={1}>
              {m.done
                ? `Done ${shortDate(m.done.dayDate)} at ${localTimeIn(trip.timeZone, new Date(m.done.at))}`
                : (m.detail ?? '')}
            </Text>
          </View>
          <View
            style={{
              borderRadius: 99,
              paddingHorizontal: 8,
              paddingVertical: 2,
              backgroundColor: m.source === 'added' ? t.surface2 : t.accentSoft,
            }}
          >
            <Text style={[type.caption, { color: m.source === 'added' ? t.ink2 : t.accent }]}>
              {SOURCE[m.source]}
            </Text>
          </View>
          {m.source === 'added' && !m.done ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${m.title}`}
              hitSlop={8}
              onPress={() => mutate((db) => deleteChecklistItem(db, m.rowId!))}
            >
              <Icon name="remove" size={18} color={t.ink2} />
            </Pressable>
          ) : null}
        </View>
      ))}

      <Row style={{ alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Add something"
            value={adding}
            onChangeText={setAdding}
            placeholder="e.g. Learn to surf"
          />
        </View>
        <Button
          label="Add"
          variant="secondary"
          disabled={!adding.trim()}
          onPress={() => {
            mutate((db) => addChecklistItem(db, id, 'mustdo', { title: adding }));
            setAdding('');
          }}
        />
      </Row>
      <ErrorText>{error}</ErrorText>

      <BottomSheet visible={!!just} onClose={() => setJust(null)} closeLabel="Close">
        {just ? (
          <View style={{ gap: 12 }}>
            <Text style={[type.title, { color: t.ink }]}>{`${just.title} ✓`}</Text>
            <Body muted small>
              {`Done at ${localTimeIn(trip.timeZone, new Date(just.at))}. Saved as a check-in, so it shows in Today’s timeline.`}
            </Body>
            <Field
              label="A line about it"
              value={note}
              onChangeText={setNote}
              placeholder="Cold water, worth it"
            />
            <Button
              label="Done"
              onPress={() => {
                if (note.trim()) mutate((db) => setCheckInNote(db, just.id, note));
                setJust(null);
              }}
            />
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
