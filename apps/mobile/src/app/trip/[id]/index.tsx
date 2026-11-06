import { getTrip } from '@travelog/db';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { useQuery } from '@/data/provider';
import { tripHref } from '@/lib/trip-route';

/**
 * For links that open /trip/<id> directly: goes to the right place for the trip.
 * The app's own screens go straight there with tripHref (Plan 36).
 */
export default function TripEntry() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  if (!trip) return <Redirect href="/" />;
  return <Redirect href={tripHref(trip)} />;
}
