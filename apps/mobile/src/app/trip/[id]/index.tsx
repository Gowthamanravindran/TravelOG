import { getTrip } from '@travelog/db';
import { tripState } from '@travelog/core';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { useQuery } from '@/data/provider';

/** Opens the right place for the trip: Trip mode while live, Memories once it's over, else Plan mode. */
export default function TripEntry() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  if (!trip) return <Redirect href="/" />;
  const state = tripState(trip);
  if (state === 'live') return <Redirect href={`/trip/${id}/live`} />;
  if (state === 'completed' || state === 'archived')
    return <Redirect href={`/trip/${id}/plan/memories`} />;
  return <Redirect href={`/trip/${id}/plan`} />;
}
