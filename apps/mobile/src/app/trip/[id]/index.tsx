import { getTrip } from '@travelog/db';
import { tripState } from '@travelog/core';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { useQuery } from '@/data/provider';

/** Opens the right mode for the trip: Trip mode while it's live, Plan mode otherwise. */
export default function TripEntry() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  if (!trip) return <Redirect href="/" />;
  return <Redirect href={tripState(trip) === 'live' ? `/trip/${id}/live` : `/trip/${id}/plan`} />;
}
