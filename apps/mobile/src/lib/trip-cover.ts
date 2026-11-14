import { getPlace, type Db } from '@travelog/db';

import { useQuery } from '@/data/provider';

import { coverFor, type DestinationPhoto } from './destinations';
import { mediaUrl } from './media';

type CoverTrip = { destination: string | null; destinationPlaceId: string | null };

/** The destination photo for a trip (Plan 53), using its place's country as a fallback. */
export function tripCover(db: Db, trip: CoverTrip): DestinationPhoto | null {
  const country = trip.destinationPlaceId
    ? (getPlace(db, trip.destinationPlaceId)?.countryCode ?? null)
    : null;
  return coverFor(trip, country);
}

/** A trip's photo and its URL for a slot `points` wide; nulls when there's no photo. */
export function useTripCover(
  trip: CoverTrip | null | undefined,
  points: number,
): { photo: DestinationPhoto | null; uri: string | null } {
  const photo = useQuery(
    (db) => (trip ? tripCover(db, trip) : null),
    [trip?.destination, trip?.destinationPlaceId],
  );
  return { photo, uri: photo ? mediaUrl(photo.key, points) : null };
}
