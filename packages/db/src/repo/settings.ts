import { eq } from 'drizzle-orm';

import type { Db } from '../db';
import { settings } from '../schema';

export function getSetting(db: Db, key: string): string | null {
  return db.select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;
}

export function setSetting(db: Db, key: string, value: string): void {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

export interface LocalProfile {
  displayName: string;
  homeCurrency: string;
  upiId: string | null;
}

/** Device-only profile used until accounts exist (Plan 12). */
export function getLocalProfile(db: Db): LocalProfile | null {
  const displayName = getSetting(db, 'profile.displayName');
  if (!displayName) return null;
  return {
    displayName,
    homeCurrency: getSetting(db, 'profile.homeCurrency') ?? 'INR',
    upiId: getSetting(db, 'profile.upiId'),
  };
}

export function saveLocalProfile(db: Db, profile: LocalProfile): void {
  const name = profile.displayName.trim();
  if (!name) throw new RangeError('please enter your name');
  if (!/^[A-Z]{3}$/.test(profile.homeCurrency))
    throw new RangeError('currency must be a 3-letter code');
  setSetting(db, 'profile.displayName', name.slice(0, 60));
  setSetting(db, 'profile.homeCurrency', profile.homeCurrency);
  if (profile.upiId) setSetting(db, 'profile.upiId', profile.upiId.trim());
}
