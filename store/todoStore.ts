/**
 * store/todoStore.ts
 *
 * Zustand store for todos state.
 *
 * Responsibilities:
 *   - Holds the full todos array in memory
 *   - Persists every change to MMKV via storage helpers
 *   - Provides actions: addTodo, toggleComplete, deleteTodo
 *   - Provides selectors: getActiveTodos, getCompletedTodos, getTodoById
 *
 * Sort order:
 *   Active todos always appear before completed ones. Within each group,
 *   order is newest-first (addTodo prepends to the array, and getActiveTodos /
 *   getCompletedTodos preserve that insertion order).
 *
 * toggleComplete behaviour:
 *   When a todo is completed, completedAt is set to the current ISO time.
 *   When unchecked, completedAt is cleared back to null.
 *   The todo stays in the todos array — sorting is done by the selectors.
 *
 * Usage in screens:
 *   const addTodo = useTodoStore(s => s.addTodo);
 *   const activeTodos = useTodoStore(s => s.getActiveTodos());
 *
 * Usage in tests:
 *   useTodoStore.setState({ todos: [] });
 *
 * DEBUG TIP: Call console.debug inside actions to trace mutations during
 * development. Remove before shipping.
 */

import { create } from 'zustand';
import { Todo, TodoPriority, createTodo } from '../types';
import { loadTodos, saveTodos } from '../storage/storage';
import { generateId } from '../utils/id';
import { cancelReminder } from '../utils/notifications';

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface TodoState {
  // ---- State ----

  /** Full array of all todos, newest first within each completion group. */
  todos: Todo[];

  // ---- Actions ----

  /**
   * addTodo — creates a new todo and prepends it to the list.
   * Returns the created Todo so callers can reference it if needed.
   *
   * notificationId: pass the id returned by scheduleReminder if the user
   * turned on the reminder toggle. The store just stores it so it can be
   * cancelled later — scheduling is the caller's responsibility.
   */
  addTodo: (data: {
    title: string;
    priority: TodoPriority;
    dueDate?: string | null;
    reminderSet?: boolean;
    notificationId?: string | null;
  }) => Todo;

  /**
   * toggleComplete — flips the completed flag.
   * Sets completedAt to now when completing, clears it when unchecking.
   * Silently ignores unknown ids.
   */
  toggleComplete: (id: string) => void;

  /**
   * deleteTodo — permanently removes a todo by id.
   * Silently ignores unknown ids.
   */
  deleteTodo: (id: string) => void;

  // ---- Selectors ----

  /**
   * getActiveTodos — todos that have NOT been completed, newest first.
   * Used for the top section of the Todo screen.
   */
  getActiveTodos: () => Todo[];

  /**
   * getCompletedTodos — todos that have been completed, newest-completed first
   * (sorted by completedAt descending so recently completed appear first).
   * Used for the bottom section of the Todo screen.
   */
  getCompletedTodos: () => Todo[];

  /**
   * getTodoById — finds a single todo by its id.
   * Returns undefined if not found.
   */
  getTodoById: (id: string) => Todo | undefined;
}

// ---------------------------------------------------------------------------
// Store creation
// ---------------------------------------------------------------------------

export const useTodoStore = create<TodoState>()((set, get) => ({
  // ---- Initial state ----

  // Synchronous rehydration from MMKV on store creation.
  // Returns [] on first launch (nothing persisted yet).
  todos: loadTodos(),

  // ---- Actions ----

  addTodo: ({ title, priority, dueDate, reminderSet, notificationId }) => {
    const newTodo = createTodo({
      id: generateId(),
      title,
      priority,
      dueDate: dueDate ?? null,
      reminderSet: reminderSet ?? false,
      notificationId: notificationId ?? null,
    });

    // Prepend so the new todo is first in the active list
    const todos = [newTodo, ...get().todos];

    // Persist before state update for safety
    saveTodos(todos);
    set({ todos });

    // DEBUG: console.debug('[todoStore] addTodo:', newTodo.id, title);
    return newTodo;
  },

  toggleComplete: (id) => {
    // Find the todo first so we can check its notificationId before mutating
    const target = get().todos.find((t) => t.id === id);

    const todos = get().todos.map((todo) => {
      if (todo.id !== id) return todo;

      const completed = !todo.completed;
      return {
        ...todo,
        completed,
        // Set timestamp when completing, clear when unchecking
        completedAt: completed ? new Date().toISOString() : null,
      };
    });

    saveTodos(todos);
    set({ todos });

    // Cancel the scheduled notification when a todo is marked complete.
    // We only cancel on completion (not on un-check) — the reminder has
    // already passed in most cases, and rescheduling is out of scope here.
    if (target && !target.completed && target.notificationId) {
      // Fire-and-forget: state is already updated; notification cancel is async
      cancelReminder(target.notificationId);
      // DEBUG: console.debug('[todoStore] cancelled notification on complete:', target.notificationId);
    }

    // DEBUG: console.debug('[todoStore] toggleComplete:', id);
  },

  deleteTodo: (id) => {
    // Grab the notification id before removing from state
    const target = get().todos.find((t) => t.id === id);

    const todos = get().todos.filter((todo) => todo.id !== id);
    saveTodos(todos);
    set({ todos });

    // Cancel any pending reminder for deleted todos so stale notifications
    // don't fire for tasks the user has removed
    if (target?.notificationId) {
      cancelReminder(target.notificationId);
      // DEBUG: console.debug('[todoStore] cancelled notification on delete:', target.notificationId);
    }

    // DEBUG: console.debug('[todoStore] deleteTodo:', id);
  },

  // ---- Selectors ----

  getActiveTodos: () => {
    // Filter to incomplete todos — order is already newest-first from addTodo
    return get().todos.filter((todo) => !todo.completed);
  },

  getCompletedTodos: () => {
    // Filter to completed todos, then sort by completedAt descending
    // so the most recently completed appears first in the completed section
    return get()
      .todos.filter((todo) => todo.completed)
      .sort((a, b) => {
        const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bTime - aTime; // descending — most recently completed first
      });
  },

  getTodoById: (id) => {
    return get().todos.find((todo) => todo.id === id);
  },
}));
