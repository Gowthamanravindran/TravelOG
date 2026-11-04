import { checkIn, getSetting, setSetting, type CheckInInput, type Db } from '@travelog/db';
import * as Location from 'expo-location';

/**
 * Check-ins (docs/01 §7 #4). Location is optional, asked for once when the person
 * turns it on, read once per check-in while the app is open, and never tracked.
 */

const SETTING = 'checkin-location';

export function checkInLocationOn(db: Db): boolean {
  return getSetting(db, SETTING) === 'on';
}

export function setCheckInLocation(db: Db, on: boolean): void {
  setSetting(db, SETTING, on ? 'on' : 'off');
}

/** Current position, or null if not allowed or not found within 10 s. */
export async function currentPosition(): Promise<CheckInInput['position']> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return null;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
    ]);
    if (!pos) return null;
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracyM: pos.coords.accuracy,
    };
  } catch {
    return null;
  }
}

/**
 * Saves a check-in at the moment of the tap. With location on, it waits up to 10 s
 * for a position and saves without one if none comes.
 */
export async function checkInNow(
  db: Db,
  mutate: <T>(fn: (db: Db) => T) => T,
  input: Omit<CheckInInput, 'position'>,
  withLocation: boolean = checkInLocationOn(db),
): Promise<void> {
  const at = input.at ?? new Date().toISOString();
  const position = withLocation ? await currentPosition() : null;
  mutate((db) => checkIn(db, { ...input, position, at }));
}
