import { type PlanCheck } from '@travelog/core';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useMutate } from '@/data/provider';
import { shortDate } from '@/lib/format';
import { dismissCheck, nightsText, placeName, type Where } from '@/lib/where';
import { Body, Button, Card, Row, Strong, WithIcon } from '@/ui/kit';

/**
 * "Check your plan" (Plan 35): gentle questions about gaps and clashes in the
 * bookings. Shown only when there is something to ask; each can be dismissed.
 */
export function PlanChecks({ tripId, where }: { tripId: string; where: Where }) {
  const router = useRouter();
  const mutate = useMutate();
  if (!where.checks.length) return null;
  const dismiss = (c: PlanCheck) => mutate((db) => dismissCheck(db, tripId, c.key));
  const name = (id: string | null) => placeName(where.places, id);

  return (
    <Card>
      <WithIcon icon="question" size={18}>
        <Strong>Check your plan</Strong>
      </WithIcon>
      {where.checks.map((c) => (
        <View key={c.key} style={{ gap: 4 }}>
          {c.kind === 'noStay' ? (
            <>
              <Body>
                {`No stay booked for ${nightsCount(c) > 1 ? 'the nights' : 'the night'} of ${nightsText(
                  c.startDate,
                  c.endDate,
                )}${name(c.placeId) ? ` (probably in ${name(c.placeId)})` : ''}. Where will you sleep?`}
              </Body>
              <Row style={{ flexWrap: 'wrap', gap: 4 }}>
                <Button
                  label="Add stay"
                  variant="link"
                  onPress={() =>
                    router.push(
                      `/trip/${tripId}/booking?type=stay&start=${c.startDate}&end=${c.endDate}`,
                    )
                  }
                />
                <Button
                  label="I'm sorted"
                  variant="link"
                  onPress={() =>
                    router.push(
                      `/trip/${tripId}/stop?kind=stay&start=${c.startDate}&end=${c.endDate}${
                        c.placeId ? `&placeId=${encodeURIComponent(c.placeId)}` : ''
                      }`,
                    )
                  }
                />
                <Button label="Dismiss" variant="link" onPress={() => dismiss(c)} />
              </Row>
            </>
          ) : c.kind === 'arrivalMismatch' ? (
            <>
              <Body>
                You arrive in {name(c.arrivePlaceId)} on {shortDate(c.date)}, but that night&apos;s
                stay is in {name(c.stayPlaceId)}. Is that right?
              </Body>
              <Row style={{ flexWrap: 'wrap', gap: 4 }}>
                <Button label="Yes, that's right" variant="link" onPress={() => dismiss(c)} />
                <Button
                  label="Open the booking"
                  variant="link"
                  onPress={() => router.push(`/trip/${tripId}/booking?bookingId=${c.bookingId}`)}
                />
              </Row>
            </>
          ) : (
            <>
              <Body>Two stays are booked for the night of {shortDate(c.date)}.</Body>
              <Row style={{ flexWrap: 'wrap', gap: 4 }}>
                {c.sourceIds.map((id, i) => (
                  <Button
                    key={id}
                    label={`Open stay ${i + 1}`}
                    variant="link"
                    onPress={() => router.push(`/trip/${tripId}/booking?bookingId=${id}`)}
                  />
                ))}
                <Button label="Dismiss" variant="link" onPress={() => dismiss(c)} />
              </Row>
            </>
          )}
        </View>
      ))}
    </Card>
  );
}

const nightsCount = (c: { startDate: string; endDate: string }) =>
  Math.round((Date.parse(c.endDate) - Date.parse(c.startDate)) / 86_400_000);
