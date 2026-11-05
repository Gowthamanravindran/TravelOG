import {
  addMember,
  deleteTrip,
  endTrip,
  getTrip,
  listMembers,
  removeMember,
  updateMember,
  updateTrip,
} from '@travelog/db';
import { tripState } from '@travelog/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { toTripInput, TripForm, type TripFormValue } from '@/components/trip-form';
import { useMutate, useQuery } from '@/data/provider';
import { errorMessage } from '@/lib/format';
import {
  Between,
  Body,
  Button,
  Card,
  ErrorText,
  Field,
  H1,
  H2,
  Row,
  Screen,
  Strong,
} from '@/ui/kit';
import { ModeProvider } from '@/ui/theme';

export default function EditTrip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mutate = useMutate();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  const members = useQuery((db) => listMembers(db, id), [id]);
  const [form, setForm] = useState<TripFormValue | null>(
    trip
      ? {
          title: trip.title,
          emoji: trip.emoji,
          destination: trip.destination ?? '',
          destinationPlaceId: trip.destinationPlaceId ?? null,
          startDate: trip.startDate ?? '',
          endDate: trip.endDate ?? '',
          currency: trip.currency,
          timeZone: trip.timeZone,
        }
      : null,
  );
  const [newName, setNewName] = useState('');
  const [newUpi, setNewUpi] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!trip || !form) return null;

  const run = (fn: () => void) => {
    try {
      setError(null);
      fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <ModeProvider mode="plan">
      <Screen edges={['top', 'bottom']}>
        <Between>
          <H1>Trip settings</H1>
          <Button label="Done" variant="link" onPress={() => router.back()} />
        </Between>
        <TripForm value={form} onChange={setForm} />
        <Button
          label="Save trip details"
          onPress={() =>
            run(() => {
              mutate((db) => updateTrip(db, id, toTripInput(form)));
              router.back();
            })
          }
        />

        <H2>People on this trip</H2>
        <Body muted small>
          Add friends by name so you can plan, split costs and record their votes. When sign-in
          arrives they can join from their own phones.
        </Body>
        {members.map((m) => (
          <Card key={m.id}>
            <Between>
              <Strong>{m.isMe ? `${m.displayName} (you)` : m.displayName}</Strong>
              {!m.isMe ? (
                <Button
                  label="Remove"
                  variant="link"
                  danger
                  onPress={() => run(() => mutate((db) => removeMember(db, m.id)))}
                />
              ) : null}
            </Between>
            <Field
              label="UPI ID"
              defaultValue={m.upiId ?? ''}
              placeholder="name@okaxis"
              autoCapitalize="none"
              onEndEditing={(e) =>
                run(() =>
                  mutate((db) =>
                    updateMember(db, m.id, { upiId: e.nativeEvent.text.trim() || null }),
                  ),
                )
              }
            />
          </Card>
        ))}
        <Card>
          <Field label="Name" value={newName} onChangeText={setNewName} placeholder="Riya" />
          <Field
            label="UPI ID (optional)"
            value={newUpi}
            onChangeText={setNewUpi}
            autoCapitalize="none"
          />
          <Button
            label="Add person"
            icon="personAdd"
            variant="secondary"
            disabled={!newName.trim()}
            onPress={() =>
              run(() => {
                mutate((db) => addMember(db, id, newName, newUpi || null));
                setNewName('');
                setNewUpi('');
              })
            }
          />
        </Card>
        <ErrorText>{error}</ErrorText>

        <H2>Danger zone</H2>
        {tripState(trip) === 'live' ? (
          <Button
            label="End trip now"
            variant="secondary"
            onPress={() => run(() => mutate((db) => endTrip(db, id)))}
          />
        ) : null}
        {confirmDelete ? (
          <Row>
            <View style={{ flex: 1 }}>
              <Button label="Keep it" variant="secondary" onPress={() => setConfirmDelete(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Delete for good"
                danger
                onPress={() =>
                  run(() => {
                    mutate((db) => deleteTrip(db, id));
                    router.navigate('/');
                  })
                }
              />
            </View>
          </Row>
        ) : (
          <Button
            label="Delete trip"
            variant="secondary"
            danger
            onPress={() => setConfirmDelete(true)}
          />
        )}
      </Screen>
    </ModeProvider>
  );
}
