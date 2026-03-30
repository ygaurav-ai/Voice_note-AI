/**
 * __tests__/phase4.store.test.ts
 *
 * Phase 4 — Todo store tests.
 *
 * Tests every action and selector in store/todoStore.ts.
 *
 * What is tested:
 *   1. Initial state — todos loaded from MMKV, defaults
 *   2. addTodo — creates todo, prepends, returns todo, persists
 *   3. toggleComplete — sets/clears completed + completedAt, persists
 *   4. deleteTodo — removes by id, ignores unknown id, persists
 *   5. getActiveTodos — returns only incomplete todos
 *   6. getCompletedTodos — returns only completed todos, sorted by completedAt desc
 *   7. getTodoById — finds by id, returns undefined when missing / after deletion
 *   8. MMKV persistence — mutations write to mockStore, UI-only changes do not
 *
 * Reset strategy:
 *   useTodoStore.setState({ todos: [] }) before each test — same pattern as
 *   the notes store tests in phase3.store.test.ts.
 *
 * DEBUG TIP: If a test leaks state into the next, verify both mockStore and
 * the Zustand state are reset in beforeEach.
 */

// ---------------------------------------------------------------------------
// MMKV mock — must come before any import that transitively uses storage
// ---------------------------------------------------------------------------

/**
 * In-memory store simulating MMKV. Null until beforeEach initialises it so
 * that the initial loadTodos() call during notesStore module init returns []
 * safely (null-guard inside the mock methods).
 *
 * Same pattern as phase3.store.test.ts — see that file's long comment for
 * the full explanation of why null-guarding is required here.
 */
let mockStore: Record<string, string> | null = null;

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    set: (key: string, value: string) => {
      if (mockStore != null) mockStore[key] = value;
    },
    getString: (key: string): string | undefined => {
      if (mockStore == null) return undefined;
      return mockStore[key] ?? undefined;
    },
    remove: (key: string) => {
      if (mockStore != null) delete mockStore[key];
    },
  }),
}));

// ---------------------------------------------------------------------------
// Imports — after the mock
// ---------------------------------------------------------------------------

import { useTodoStore } from '../store/todoStore';
import { createTodo } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Todo fixture with sensible defaults */
function makeTodo(
  id: string,
  title: string,
  priority: 'high' | 'medium' | 'low' = 'medium',
  dueDate: string | null = null
) {
  return createTodo({ id, title, priority, dueDate });
}

/** ISO string X days from now (or past when negative) */
function daysFromNow(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Reset before every test
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Initialise the in-memory MMKV mock to a clean state
  mockStore = {};
  // Reset the Zustand store singleton to a blank slate
  useTodoStore.setState({ todos: [] });
});

// ===========================================================================
// 1. Initial state
// ===========================================================================

describe('initial state', () => {
  it('starts with an empty todos array when MMKV has no data', () => {
    expect(useTodoStore.getState().todos).toEqual([]);
  });
});

// ===========================================================================
// 2. addTodo
// ===========================================================================

describe('addTodo()', () => {
  it('adds a todo to the store', () => {
    useTodoStore.getState().addTodo({ title: 'Buy milk', priority: 'low' });
    expect(useTodoStore.getState().todos).toHaveLength(1);
    expect(useTodoStore.getState().todos[0].title).toBe('Buy milk');
  });

  it('returns the newly created todo', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Return test', priority: 'high' });
    expect(todo.title).toBe('Return test');
    expect(typeof todo.id).toBe('string');
    expect(todo.id.length).toBeGreaterThan(0);
  });

  it('prepends the new todo so it appears first in the list', () => {
    useTodoStore.getState().addTodo({ title: 'First', priority: 'low' });
    useTodoStore.getState().addTodo({ title: 'Second', priority: 'medium' });
    useTodoStore.getState().addTodo({ title: 'Third', priority: 'high' });

    const { todos } = useTodoStore.getState();
    expect(todos[0].title).toBe('Third');
    expect(todos[1].title).toBe('Second');
    expect(todos[2].title).toBe('First');
  });

  it('defaults completed to false', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Task', priority: 'medium' });
    expect(todo.completed).toBe(false);
  });

  it('defaults completedAt to null', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Task', priority: 'medium' });
    expect(todo.completedAt).toBeNull();
  });

  it('defaults reminderSet to false', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Task', priority: 'high' });
    expect(todo.reminderSet).toBe(false);
  });

  it('stores the supplied dueDate', () => {
    const due = daysFromNow(3);
    const todo = useTodoStore.getState().addTodo({ title: 'Due soon', priority: 'high', dueDate: due });
    expect(todo.dueDate).toBe(due);
  });

  it('stores null when dueDate is not supplied', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'No due date', priority: 'low' });
    expect(todo.dueDate).toBeNull();
  });

  it('assigns a unique id to each todo', () => {
    const a = useTodoStore.getState().addTodo({ title: 'A', priority: 'low' });
    const b = useTodoStore.getState().addTodo({ title: 'B', priority: 'low' });
    expect(a.id).not.toBe(b.id);
  });

  it('sets createdAt as a valid ISO string', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'TS check', priority: 'medium' });
    expect(new Date(todo.createdAt).toISOString()).toBe(todo.createdAt);
  });

  it('persists to MMKV after add', () => {
    useTodoStore.getState().addTodo({ title: 'Persist', priority: 'low' });
    expect(mockStore!['thoughts:todos']).toBeDefined();
  });

  it('adds multiple todos and keeps them all', () => {
    useTodoStore.getState().addTodo({ title: 'A', priority: 'high' });
    useTodoStore.getState().addTodo({ title: 'B', priority: 'medium' });
    useTodoStore.getState().addTodo({ title: 'C', priority: 'low' });
    expect(useTodoStore.getState().todos).toHaveLength(3);
  });
});

// ===========================================================================
// 3. toggleComplete
// ===========================================================================

describe('toggleComplete()', () => {
  it('marks an active todo as completed', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Do it', priority: 'high' });

    useTodoStore.getState().toggleComplete(todo.id);

    const updated = useTodoStore.getState().todos.find((t) => t.id === todo.id);
    expect(updated?.completed).toBe(true);
  });

  it('sets completedAt to a valid ISO string when completing', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Do it', priority: 'medium' });

    useTodoStore.getState().toggleComplete(todo.id);

    const updated = useTodoStore.getState().todos.find((t) => t.id === todo.id);
    expect(updated?.completedAt).not.toBeNull();
    expect(new Date(updated!.completedAt!).toISOString()).toBe(updated!.completedAt);
  });

  it('marks a completed todo back to active (unchecks)', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Undo me', priority: 'low' });

    useTodoStore.getState().toggleComplete(todo.id); // complete
    useTodoStore.getState().toggleComplete(todo.id); // uncheck

    const updated = useTodoStore.getState().todos.find((t) => t.id === todo.id);
    expect(updated?.completed).toBe(false);
  });

  it('clears completedAt when unchecking', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Undo', priority: 'high' });

    useTodoStore.getState().toggleComplete(todo.id); // complete
    useTodoStore.getState().toggleComplete(todo.id); // uncheck

    const updated = useTodoStore.getState().todos.find((t) => t.id === todo.id);
    expect(updated?.completedAt).toBeNull();
  });

  it('only toggles the targeted todo — others are unaffected', () => {
    const a = useTodoStore.getState().addTodo({ title: 'A', priority: 'high' });
    const b = useTodoStore.getState().addTodo({ title: 'B', priority: 'low' });

    useTodoStore.getState().toggleComplete(a.id);

    const bState = useTodoStore.getState().todos.find((t) => t.id === b.id);
    expect(bState?.completed).toBe(false);
  });

  it('silently ignores an unknown id', () => {
    useTodoStore.getState().addTodo({ title: 'Safe', priority: 'medium' });

    expect(() => {
      useTodoStore.getState().toggleComplete('nonexistent-id');
    }).not.toThrow();

    const { todos } = useTodoStore.getState();
    expect(todos[0].completed).toBe(false);
  });

  it('persists the toggle to MMKV', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Persist toggle', priority: 'high' });

    useTodoStore.getState().toggleComplete(todo.id);

    const saved = JSON.parse(mockStore!['thoughts:todos']);
    expect(saved[0].completed).toBe(true);
  });
});

// ===========================================================================
// 4. deleteTodo
// ===========================================================================

describe('deleteTodo()', () => {
  it('removes the todo from the store', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Delete me', priority: 'low' });

    useTodoStore.getState().deleteTodo(todo.id);

    expect(useTodoStore.getState().todos).toHaveLength(0);
  });

  it('removes only the targeted todo when multiple exist', () => {
    const a = useTodoStore.getState().addTodo({ title: 'Keep', priority: 'medium' });
    const b = useTodoStore.getState().addTodo({ title: 'Delete', priority: 'high' });

    useTodoStore.getState().deleteTodo(b.id);

    const { todos } = useTodoStore.getState();
    expect(todos).toHaveLength(1);
    expect(todos[0].id).toBe(a.id);
  });

  it('silently ignores an unknown id', () => {
    useTodoStore.getState().addTodo({ title: 'Survivor', priority: 'low' });

    expect(() => {
      useTodoStore.getState().deleteTodo('ghost-id-xyz');
    }).not.toThrow();

    expect(useTodoStore.getState().todos).toHaveLength(1);
  });

  it('persists the deletion to MMKV', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Gone', priority: 'high' });

    useTodoStore.getState().deleteTodo(todo.id);

    const saved = JSON.parse(mockStore!['thoughts:todos']);
    expect(saved).toHaveLength(0);
  });
});

// ===========================================================================
// 5. getActiveTodos
// ===========================================================================

describe('getActiveTodos()', () => {
  it('returns all todos when none are completed', () => {
    useTodoStore.getState().addTodo({ title: 'A', priority: 'high' });
    useTodoStore.getState().addTodo({ title: 'B', priority: 'low' });

    expect(useTodoStore.getState().getActiveTodos()).toHaveLength(2);
  });

  it('excludes completed todos', () => {
    const a = useTodoStore.getState().addTodo({ title: 'Active', priority: 'medium' });
    const b = useTodoStore.getState().addTodo({ title: 'Done', priority: 'low' });

    useTodoStore.getState().toggleComplete(b.id);

    const active = useTodoStore.getState().getActiveTodos();
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(a.id);
  });

  it('returns [] when all todos are completed', () => {
    const a = useTodoStore.getState().addTodo({ title: 'A', priority: 'high' });
    const b = useTodoStore.getState().addTodo({ title: 'B', priority: 'medium' });

    useTodoStore.getState().toggleComplete(a.id);
    useTodoStore.getState().toggleComplete(b.id);

    expect(useTodoStore.getState().getActiveTodos()).toHaveLength(0);
  });

  it('returns [] when there are no todos', () => {
    expect(useTodoStore.getState().getActiveTodos()).toHaveLength(0);
  });

  it('re-includes a todo after it is unchecked', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Back', priority: 'low' });

    useTodoStore.getState().toggleComplete(todo.id); // complete
    expect(useTodoStore.getState().getActiveTodos()).toHaveLength(0);

    useTodoStore.getState().toggleComplete(todo.id); // uncheck
    expect(useTodoStore.getState().getActiveTodos()).toHaveLength(1);
  });
});

// ===========================================================================
// 6. getCompletedTodos
// ===========================================================================

describe('getCompletedTodos()', () => {
  it('returns only completed todos', () => {
    const a = useTodoStore.getState().addTodo({ title: 'Active', priority: 'high' });
    const b = useTodoStore.getState().addTodo({ title: 'Done', priority: 'low' });

    useTodoStore.getState().toggleComplete(b.id);

    const completed = useTodoStore.getState().getCompletedTodos();
    expect(completed).toHaveLength(1);
    expect(completed[0].id).toBe(b.id);
  });

  it('returns [] when no todos are completed', () => {
    useTodoStore.getState().addTodo({ title: 'Active', priority: 'medium' });
    expect(useTodoStore.getState().getCompletedTodos()).toHaveLength(0);
  });

  it('returns [] when there are no todos', () => {
    expect(useTodoStore.getState().getCompletedTodos()).toHaveLength(0);
  });

  it('returns recently completed todos sorted most-recent first', async () => {
    const a = useTodoStore.getState().addTodo({ title: 'A', priority: 'high' });
    const b = useTodoStore.getState().addTodo({ title: 'B', priority: 'low' });

    useTodoStore.getState().toggleComplete(a.id);
    await new Promise((r) => setTimeout(r, 10)); // ensure b is completed later
    useTodoStore.getState().toggleComplete(b.id);

    const completed = useTodoStore.getState().getCompletedTodos();
    // b was completed more recently, so it should be first
    expect(completed[0].id).toBe(b.id);
    expect(completed[1].id).toBe(a.id);
  });

  it('removes a todo from completed when it is unchecked', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Undo', priority: 'medium' });

    useTodoStore.getState().toggleComplete(todo.id);
    expect(useTodoStore.getState().getCompletedTodos()).toHaveLength(1);

    useTodoStore.getState().toggleComplete(todo.id);
    expect(useTodoStore.getState().getCompletedTodos()).toHaveLength(0);
  });
});

// ===========================================================================
// 7. getTodoById
// ===========================================================================

describe('getTodoById()', () => {
  it('returns the matching todo', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Find me', priority: 'high' });

    const found = useTodoStore.getState().getTodoById(todo.id);
    expect(found).toBeDefined();
    expect(found?.title).toBe('Find me');
  });

  it('returns undefined for an unknown id', () => {
    expect(useTodoStore.getState().getTodoById('ghost')).toBeUndefined();
  });

  it('returns undefined after the todo is deleted', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Temp', priority: 'low' });

    useTodoStore.getState().deleteTodo(todo.id);

    expect(useTodoStore.getState().getTodoById(todo.id)).toBeUndefined();
  });

  it('returns the updated todo after toggleComplete', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Toggle', priority: 'medium' });

    useTodoStore.getState().toggleComplete(todo.id);

    const found = useTodoStore.getState().getTodoById(todo.id);
    expect(found?.completed).toBe(true);
  });
});

// ===========================================================================
// 8. MMKV persistence
// ===========================================================================

describe('MMKV persistence', () => {
  it('addTodo writes JSON to mockStore', () => {
    useTodoStore.getState().addTodo({ title: 'Persist', priority: 'low' });
    expect(mockStore!['thoughts:todos']).toBeDefined();
  });

  it('the serialised JSON matches the stored todo', () => {
    useTodoStore.getState().addTodo({ title: 'Serialised', priority: 'high' });

    const parsed = JSON.parse(mockStore!['thoughts:todos']);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('Serialised');
    expect(parsed[0].priority).toBe('high');
    expect(parsed[0].completed).toBe(false);
  });

  it('toggleComplete writes updated JSON to mockStore', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Toggle', priority: 'medium' });

    useTodoStore.getState().toggleComplete(todo.id);

    const parsed = JSON.parse(mockStore!['thoughts:todos']);
    expect(parsed[0].completed).toBe(true);
    expect(parsed[0].completedAt).not.toBeNull();
  });

  it('deleteTodo writes the reduced array to mockStore', () => {
    const todo = useTodoStore.getState().addTodo({ title: 'Bye', priority: 'low' });

    useTodoStore.getState().deleteTodo(todo.id);

    const parsed = JSON.parse(mockStore!['thoughts:todos']);
    expect(parsed).toHaveLength(0);
  });

  it('stores dueDate correctly in JSON', () => {
    const due = daysFromNow(5);
    useTodoStore.getState().addTodo({ title: 'Due soon', priority: 'high', dueDate: due });

    const parsed = JSON.parse(mockStore!['thoughts:todos']);
    expect(parsed[0].dueDate).toBe(due);
  });
});
