import { getTrip, listMembers, recordSettlement, tripMoney } from '@travelog/db';
import { upiPayLink } from '@travelog/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { errorMessage, money } from '@/lib/format';
import { Between, Body, Button, Card, Empty, ErrorText, H1, Row, Screen, Strong } from '@/ui/kit';
import { ModeProvider } from '@/ui/theme';

export default function Settle() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: 'trip' }>();
  const router = useRouter();
  const mutate = useMutate();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  const members = useQuery((db) => listMembers(db, id), [id]);
  const { transfers } = useQuery((db) => tripMoney(db, id), [id]);
  const [error, setError] = useState<string | null>(null);
  if (!trip) return null;
  const member = (mid: string) => members.find((m) => m.id === mid);

  const markPaid = (from: string, to: string, amountMinor: number, method: 'upi' | 'cash') => {
    try {
      mutate((db) =>
        recordSettlement(db, {
          tripId: id,
          fromMemberId: from,
          toMemberId: to,
          amountMinor,
          method,
        }),
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const payByUpi = async (from: string, to: string, amountMinor: number) => {
    const payee = member(to);
    try {
      if (!payee?.upiId)
        throw new Error(`add ${payee?.displayName ?? 'their'} UPI ID first (⋯ → People)`);
      const url = upiPayLink({
        payeeVpa: payee.upiId,
        payeeName: payee.displayName,
        amountMinor,
        note: `TravelOG ${trip.title}`,
      });
      await Linking.openURL(url);
      markPaid(from, to, amountMinor, 'upi');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <ModeProvider mode={mode === 'trip' ? 'trip' : 'plan'}>
      <Screen edges={['top', 'bottom']}>
        <Between>
          <H1>Settle up</H1>
          <Button label="Done" variant="link" onPress={() => router.back()} />
        </Between>
        <Body muted>
          The fewest payments that square everyone up. Money moves in your UPI app; TravelOG never
          holds it.
        </Body>
        {transfers.length ? (
          transfers.map((x) => {
            const from = member(x.fromMemberId);
            const to = member(x.toMemberId);
            return (
              <Card key={`${x.fromMemberId}-${x.toMemberId}`}>
                <Between>
                  <Strong>
                    {from?.isMe ? 'You' : from?.displayName} → {to?.isMe ? 'you' : to?.displayName}
                  </Strong>
                  <Strong>{money(x.amountMinor, trip.currency)}</Strong>
                </Between>
                <Row>
                  {from?.isMe && trip.currency === 'INR' ? (
                    <Button
                      label="Pay with UPI"
                      small
                      onPress={() => payByUpi(x.fromMemberId, x.toMemberId, x.amountMinor)}
                    />
                  ) : null}
                  <Button
                    label="Mark as paid"
                    variant="ghost"
                    small
                    onPress={() => markPaid(x.fromMemberId, x.toMemberId, x.amountMinor, 'cash')}
                  />
                </Row>
              </Card>
            );
          })
        ) : (
          <Empty icon="🎉" title="Everyone is square" />
        )}
        <ErrorText>{error}</ErrorText>
      </Screen>
    </ModeProvider>
  );
}
