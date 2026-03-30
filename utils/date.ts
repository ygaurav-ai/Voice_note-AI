/**
 * utils/date.ts
 *
 * Date formatting helpers for the Thoughts app.
 *
 * All note and todo timestamps are stored as ISO strings (e.g. "2026-03-28T14:30:00.000Z").
 * These helpers convert them to human-readable strings for display in cards and headers.
 *
 * DEBUG TIP: If a timestamp shows as "NaN" or "Invalid Date", the stored ISO string
 * is likely malformed. Check that createNote() / createTodo() factories used
 * new Date().toISOString() not new Date().toString().
 */

/**
 * formatNoteDate — formats a note's createdAt timestamp for display on cards.
 *
 * Rules:
 *   < 1 minute ago  → "Just now"
 *   < 60 minutes    → "Xm ago"
 *   < 24 hours      → "Xh ago"
 *   Yesterday       → "Yesterday"
 *   Same year       → "Mar 28"
 *   Different year  → "Mar 28, 2025"
 *
 * @param dateStr — ISO 8601 date string (from Note.createdAt or updatedAt)
 * @returns human-readable relative or absolute date string
 */
export function formatNoteDate(dateStr: string): string {
  const date = new Date(dateStr);

  // Guard against invalid dates — return raw string rather than crashing
  if (isNaN(date.getTime())) {
    return dateStr;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';

  // Same calendar year — omit the year for brevity
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Older notes — include the year
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * formatTodoDate — formats a todo's dueDate for the task list row.
 * Shows the date relative to today.
 *
 * @param dateStr — ISO 8601 date string (from Todo.dueDate)
 * @returns human-readable due date, or empty string if null/invalid
 */
export function formatTodoDate(dateStr: string | null): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) return `Overdue · ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays < 7) return `${diffDays} days`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * isToday — returns true if the given ISO string represents a date that falls on today.
 * Used to filter today's notes for the Home screen.
 *
 * @param dateStr — ISO 8601 date string
 */
export function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * formatHeaderDate — returns the full date string for the Home screen header.
 * e.g. "Saturday, Mar 28"
 */
export function formatHeaderDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}
