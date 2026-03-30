/**
 * types/index.ts
 *
 * Central TypeScript type definitions for the Thoughts app.
 *
 * All data shapes used in the store, storage, and components are defined here.
 * Nothing else in the codebase should define its own Note or Todo shape —
 * always import from this file.
 *
 * DEBUG TIP: If a component receives unexpected undefined fields, check that
 * the object was created with createNote() / createTodo() factory helpers
 * below, which guarantee all required fields are present.
 */

// ---------------------------------------------------------------------------
// Note — a single captured thought / text note
// ---------------------------------------------------------------------------

/** Valid categories for a note */
export type NoteTag = 'work' | 'reading' | 'personal' | 'ideas';

export interface Note {
  /** Unique identifier — UUID v4 string generated at creation time */
  id: string;
  /** Short descriptive title shown on cards and in the library */
  title: string;
  /** Full note body text — may be multiple paragraphs */
  body: string;
  /** Category tag — controls card tint colour and filter chip behaviour */
  tag: NoteTag;
  /** ISO string of when the note was originally created */
  createdAt: string;
  /** ISO string of the last time the note content was saved */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Todo — a single task with priority and optional reminder
// ---------------------------------------------------------------------------

/** Priority levels shown as colour dots on each task row */
export type TodoPriority = 'high' | 'medium' | 'low';

export interface Todo {
  /** Unique identifier — UUID v4 string generated at creation time */
  id: string;
  /** Short task description shown in the list */
  title: string;
  /** Visual priority level — high = red, medium = amber, low = green */
  priority: TodoPriority;
  /** ISO string of the optional due date, null if no due date is set */
  dueDate: string | null;
  /** Whether the task has been checked off */
  completed: boolean;
  /** ISO string of when the task was completed, null if still active */
  completedAt: string | null;
  /** Whether the user has toggled the reminder switch on */
  reminderSet: boolean;
  /**
   * Expo Notifications identifier returned when a notification is scheduled.
   * Stored so we can cancel the notification if the todo is completed early
   * or the due date is removed.
   * null when no notification is currently scheduled.
   */
  notificationId: string | null;
  /** ISO string of when this todo was created */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Factory helpers — create objects with all required fields set to defaults.
// Use these in the store actions instead of constructing objects manually.
// ---------------------------------------------------------------------------

/**
 * createNote — builds a new Note object with safe defaults.
 * Caller must supply title, body, and tag; everything else is auto-filled.
 *
 * Usage:
 *   const note = createNote({ title: 'Meeting notes', body: '', tag: 'work' });
 */
export function createNote(
  partial: Pick<Note, 'title' | 'body' | 'tag'> & { id: string }
): Note {
  const now = new Date().toISOString();
  return {
    id: partial.id,
    title: partial.title,
    body: partial.body,
    tag: partial.tag,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * createTodo — builds a new Todo object with safe defaults.
 * Caller must supply title and priority; everything else is auto-filled.
 *
 * Usage:
 *   const todo = createTodo({ title: 'Buy groceries', priority: 'low', id: uuid });
 */
export function createTodo(
  partial: Pick<Todo, 'title' | 'priority'> & {
    id: string;
    dueDate?: string | null;
    completed?: boolean;
    completedAt?: string | null;
    reminderSet?: boolean;
    notificationId?: string | null;
  }
): Todo {
  const now = new Date().toISOString();
  return {
    id: partial.id,
    title: partial.title,
    priority: partial.priority,
    dueDate: partial.dueDate ?? null,
    completed: partial.completed ?? false,
    completedAt: partial.completedAt ?? null,
    reminderSet: partial.reminderSet ?? false,
    notificationId: partial.notificationId ?? null,
    createdAt: now,
  };
}
