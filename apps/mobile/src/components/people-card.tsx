import { addMember, listMembers } from '@travelog/db';
import { useState } from 'react';
import { View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { errorMessage } from '@/lib/format';
import { Body, Button, Card, Chip, ChipRow, ErrorText, Field, Row, Strong } from '@/ui/kit';

/**
 * Who's on the trip, with an inline "Add person" (name + optional UPI ID for
 * settle-up). Used in the Budget tab and the trip setup card.
 */
export function PeopleCard({ tripId, startOpen = false }: { tripId: string; startOpen?: boolean }) {
  const mutate = useMutate();
  const members = useQuery((db) => listMembers(db, tripId), [tripId]);
  const [adding, setAdding] = useState(startOpen);
  const [name, setName] = useState('');
  const [upi, setUpi] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    try {
      mutate((db) => addMember(db, tripId, name, upi.trim() || null));
      setName('');
      setUpi('');
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Strong>People · {members.length}</Strong>
        {!adding ? (
          <Button
            label="Add person"
            icon="personAdd"
            variant="link"
            onPress={() => setAdding(true)}
          />
        ) : null}
      </Row>
      <ChipRow>
        {members.map((m) => (
          <Chip key={m.id} label={m.isMe ? `${m.displayName} (you)` : m.displayName} />
        ))}
      </ChipRow>
      {members.length < 2 && !adding ? (
        <Body muted small>
          Add the people you travel with to split expenses and vote on plans.
        </Body>
      ) : null}
      {adding ? (
        <View style={{ gap: 8 }}>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Riya" />
          <Field
            label="UPI ID (optional)"
            value={upi}
            onChangeText={setUpi}
            autoCapitalize="none"
            placeholder="riya@okbank"
          />
          <ErrorText>{error}</ErrorText>
          <Row>
            <View style={{ flex: 1 }}>
              <Button label="Done" variant="secondary" onPress={() => setAdding(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Add" onPress={add} disabled={!name.trim()} />
            </View>
          </Row>
        </View>
      ) : null}
    </Card>
  );
}
