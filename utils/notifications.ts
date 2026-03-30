/**
 * utils/notifications.ts
 *
 * Thin wrapper around expo-notifications for the Thoughts app.
 *
 * Three public functions:
 *   requestNotificationPermissions — ask the OS for permission once at startup.
 *     iOS shows the system prompt only the first time; subsequent calls are
 *     safe no-ops that just return the already-granted status.
 *
 *   scheduleReminder — schedule a local notification for a task title + due date.
 *     Returns the Expo notification identifier string, or null if scheduling
 *     fails (past date, permissions denied, or Expo error).
 *
 *   cancelReminder — cancel a previously scheduled notification by its id.
 *     Safe to call with null — just returns immediately.
 *
 * All three are async because expo-notifications itself is async.
 *
 * Usage in store actions and screen handlers:
 *   const id = await scheduleReminder('Buy milk', dueDate);
 *   addTodo({ title, priority, dueDate, notificationId: id });
 *
 *   cancelReminder(todo.notificationId);  // fire-and-forget is fine
 *
 * DEBUG TIP: On iOS simulator, notifications only fire when the app is in the
 * background or closed. Use a real device to test the full notification flow.
 */

import * as Notifications from 'expo-notifications';
// SchedulableTriggerInputTypes was added in expo-notifications v0.28 (SDK 51+)
// It provides the typed enum for trigger type discriminants.
const { SchedulableTriggerInputTypes } = Notifications;

// ---------------------------------------------------------------------------
// Permission request
// ---------------------------------------------------------------------------

/**
 * requestNotificationPermissions
 *
 * Asks the OS for notification permission. Call once on app startup.
 * Returns true if permission was granted, false otherwise.
 *
 * iOS: shows system alert the first time, returns cached status afterwards.
 * Android: always returns true (permissions granted automatically pre-API 33).
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Guard: some test environments / platforms return undefined — treat as denied
  const result = await Notifications.requestPermissionsAsync();
  // DEBUG: console.debug('[notifications] permission status:', result?.status);
  return result?.status === 'granted';
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

/**
 * scheduleReminder
 *
 * Schedules a local notification to fire at the given dueDate.
 *
 * Returns:
 *   - The notification identifier string on success (store this on the Todo)
 *   - null if the date is in the past (nothing to schedule)
 *   - null if Expo throws for any reason (permissions denied, invalid trigger)
 *
 * The notification fires even when the app is in the background or closed.
 *
 * @param title   — The task title, used as the notification body text
 * @param dueDate — ISO string of when the reminder should fire
 */
export async function scheduleReminder(
  title: string,
  dueDate: string,
): Promise<string | null> {
  // Don't schedule reminders for dates that have already passed
  const triggerDate = new Date(dueDate);
  if (triggerDate.getTime() <= Date.now()) {
    // DEBUG: console.debug('[notifications] scheduleReminder: date is in the past, skipping');
    return null;
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Task Reminder',  // notification title in the system tray
        body: title,             // the task name as the body text
        sound: true,             // play default notification sound
      },
      // DATE trigger — fires once at exactly this date/time.
      // Typed form required by expo-notifications v0.28+ TypeScript definitions.
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    // DEBUG: console.debug('[notifications] scheduled:', id, 'for', dueDate);
    return id;
  } catch (e) {
    // Catch and swallow — scheduling failures should not crash the app.
    // Common causes: permissions not granted, invalid trigger date.
    // DEBUG: console.error('[notifications] scheduleReminder failed:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

/**
 * cancelReminder
 *
 * Cancels a previously scheduled notification.
 * Safe to call with null — returns immediately without error.
 *
 * Call this when:
 *   - A todo is marked complete before its reminder fires
 *   - A todo is deleted
 *   - The due date is removed from a todo
 *
 * @param notificationId — the identifier returned by scheduleReminder
 */
export async function cancelReminder(
  notificationId: string | null,
): Promise<void> {
  // Guard: no-op when there's nothing to cancel
  if (!notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    // DEBUG: console.debug('[notifications] cancelled:', notificationId);
  } catch (e) {
    // Swallow — notification may have already fired or been cancelled.
    // DEBUG: console.error('[notifications] cancelReminder failed:', e);
  }
}
