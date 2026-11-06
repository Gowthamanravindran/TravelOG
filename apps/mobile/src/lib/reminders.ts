import { getSetting, getTrip, setSetting, upcomingReminders, type Db } from '@travelog/db';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useDataVersion, useDb } from '@/data/provider';

import { tripHref } from './trip-route';

/**
 * Local reminders (docs/01 §11): planned from the database by @travelog/db and
 * scheduled on the phone. Re-planned after every change, a moment later.
 */

const SETTING = 'reminders';
const CHANNEL = 'reminders';

export function remindersEnabled(db: Db): boolean {
  return getSetting(db, SETTING) !== 'off';
}

export function setRemindersEnabled(db: Db, on: boolean): void {
  setSetting(db, SETTING, on ? 'on' : 'off');
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let lastSignature = '';

async function canNotify(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Replaces this app's scheduled reminders with the current plan. */
export async function syncReminders(db: Db): Promise<void> {
  const reminders = remindersEnabled(db) ? upcomingReminders(db) : [];
  const signature = JSON.stringify(reminders);
  if (signature === lastSignature) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  lastSignature = signature;
  // Only ask for permission once there is something worth reminding about.
  if (!reminders.length || !(await canNotify())) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Trip reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  for (const r of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.key,
      content: { title: r.title, body: r.body, data: { tripId: r.tripId } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(r.at),
        channelId: CHANNEL,
      },
    });
  }
}

/** Keeps reminders in step with the data, and opens the trip when one is tapped. */
export function useReminders(): void {
  const db = useDb();
  const version = useDataVersion();
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      syncReminders(db).catch(() => {
        // Reminders are a convenience; never block the app on them.
        lastSignature = '';
      });
    }, 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [db, version]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const tripId = response.notification.request.content.data?.tripId;
      const trip = typeof tripId === 'string' ? getTrip(db, tripId) : undefined;
      // Straight to the trip's own screen (Plan 36).
      if (trip) router.push(tripHref(trip));
    });
    return () => sub.remove();
  }, [router, db]);
}
