/**
 * __tests__/phase1.storage.test.ts
 *
 * Phase 1 — Storage helper tests.
 *
 * Tests the saveNotes / loadNotes / saveTodos / loadTodos helpers in
 * storage/storage.ts.
 *
 * We mock react-native-mmkv so these tests run in the Jest (Node.js) environment
 * without a React Native runtime.
 *
 * What is tested:
 *   - loadNotes/loadTodos returns [] when nothing is saved
 *   - saveNotes/saveTodos persists data and loadNotes/loadTodos retrieves it
 *   - Round-trip (save then load) produces identical objects
 *   - Saving an empty array returns [] on load
 *   - Corrupted data returns [] instead of crashing
 *   - clearAll removes both notes and todos
 */

// ---------------------------------------------------------------------------
// Mock react-native-mmkv — simulate in-memory store for tests
// ---------------------------------------------------------------------------

// Internal in-memory store that the mock MMKV reads/writes
const mockStore: Record<string, string> = {};

// react-native-mmkv v4: mock createMMKV() factory (not the MMKV class constructor)
jest.mock('react-native-mmkv', () => {
  return {
    createMMKV: jest.fn().mockReturnValue({
      set: (key: string, value: string) => {
        mockStore[key] = value;
      },
      getString: (key: string): string | undefined => {
        return mockStore[key] ?? undefined;
      },
      // v4 uses remove() — delete() was removed
      remove: (key: string) => {
        delete mockStore[key];
      },
    }),
  };
});

// ---------------------------------------------------------------------------
// Import storage helpers AFTER the mock is set up
// ---------------------------------------------------------------------------

import { saveNotes, loadNotes, saveTodos, loadTodos, clearAll } from '../storage/storage';
import { createNote, createTodo } from '../types';

// Helper to reset the mock store before each test
beforeEach(() => {
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
});

// ---------------------------------------------------------------------------
// Notes — loadNotes
// ---------------------------------------------------------------------------

describe('loadNotes()', () => {
  it('returns an empty array when nothing is saved', () => {
    const result = loadNotes();
    expect(result).toEqual([]);
  });

  it('returns an empty array when saved data is an empty array', () => {
    saveNotes([]);
    const result = loadNotes();
    expect(result).toEqual([]);
  });

  it('returns [] and does not throw when stored data is malformed JSON', () => {
    // Manually insert bad data into the mock store
    mockStore['thoughts:notes'] = 'THIS IS NOT JSON {{{';
    expect(() => loadNotes()).not.toThrow();
    expect(loadNotes()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Notes — saveNotes + loadNotes round-trip
// ---------------------------------------------------------------------------

describe('saveNotes() + loadNotes() round-trip', () => {
  it('saves and retrieves a single note', () => {
    const note = createNote({ id: 'n1', title: 'Hello', body: 'World', tag: 'work' });
    saveNotes([note]);
    const loaded = loadNotes();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('n1');
    expect(loaded[0].title).toBe('Hello');
    expect(loaded[0].body).toBe('World');
    expect(loaded[0].tag).toBe('work');
  });

  it('saves and retrieves multiple notes preserving order', () => {
    const notes = [
      createNote({ id: 'n1', title: 'Note 1', body: '', tag: 'work' }),
      createNote({ id: 'n2', title: 'Note 2', body: '', tag: 'reading' }),
      createNote({ id: 'n3', title: 'Note 3', body: '', tag: 'personal' }),
    ];
    saveNotes(notes);
    const loaded = loadNotes();

    expect(loaded).toHaveLength(3);
    expect(loaded[0].id).toBe('n1');
    expect(loaded[1].id).toBe('n2');
    expect(loaded[2].id).toBe('n3');
  });

  it('overwrites previous save with new array', () => {
    const note1 = createNote({ id: 'n1', title: 'Old note', body: '', tag: 'ideas' });
    saveNotes([note1]);

    const note2 = createNote({ id: 'n2', title: 'New note', body: '', tag: 'personal' });
    saveNotes([note2]);

    const loaded = loadNotes();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('n2');
  });

  it('preserves all Note fields through serialisation round-trip', () => {
    const note = createNote({ id: 'n-rt', title: 'Round trip', body: 'Body text', tag: 'reading' });
    saveNotes([note]);
    const [loaded] = loadNotes();

    expect(loaded.id).toBe(note.id);
    expect(loaded.title).toBe(note.title);
    expect(loaded.body).toBe(note.body);
    expect(loaded.tag).toBe(note.tag);
    expect(loaded.createdAt).toBe(note.createdAt);
    expect(loaded.updatedAt).toBe(note.updatedAt);
  });
});

// ---------------------------------------------------------------------------
// Todos — loadTodos
// ---------------------------------------------------------------------------

describe('loadTodos()', () => {
  it('returns an empty array when nothing is saved', () => {
    const result = loadTodos();
    expect(result).toEqual([]);
  });

  it('returns [] and does not throw when stored data is malformed JSON', () => {
    mockStore['thoughts:todos'] = ']]BROKEN[[';
    expect(() => loadTodos()).not.toThrow();
    expect(loadTodos()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Todos — saveTodos + loadTodos round-trip
// ---------------------------------------------------------------------------

describe('saveTodos() + loadTodos() round-trip', () => {
  it('saves and retrieves a single todo', () => {
    const todo = createTodo({ id: 't1', title: 'Buy milk', priority: 'low' });
    saveTodos([todo]);
    const loaded = loadTodos();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('t1');
    expect(loaded[0].title).toBe('Buy milk');
    expect(loaded[0].priority).toBe('low');
  });

  it('preserves all Todo fields through serialisation round-trip', () => {
    const todo = createTodo({
      id: 't-rt',
      title: 'Important task',
      priority: 'high',
      dueDate: '2026-05-01T10:00:00.000Z',
      reminderSet: true,
    });
    saveTodos([todo]);
    const [loaded] = loadTodos();

    expect(loaded.id).toBe(todo.id);
    expect(loaded.title).toBe(todo.title);
    expect(loaded.priority).toBe(todo.priority);
    expect(loaded.dueDate).toBe(todo.dueDate);
    expect(loaded.completed).toBe(false);
    expect(loaded.completedAt).toBeNull();
    expect(loaded.reminderSet).toBe(true);
    expect(loaded.notificationId).toBeNull();
    expect(loaded.createdAt).toBe(todo.createdAt);
  });

  it('saves and retrieves multiple todos preserving order', () => {
    const todos = [
      createTodo({ id: 't1', title: 'Task 1', priority: 'high' }),
      createTodo({ id: 't2', title: 'Task 2', priority: 'medium' }),
      createTodo({ id: 't3', title: 'Task 3', priority: 'low' }),
    ];
    saveTodos(todos);
    const loaded = loadTodos();

    expect(loaded).toHaveLength(3);
    expect(loaded.map((t) => t.id)).toEqual(['t1', 't2', 't3']);
  });
});

// ---------------------------------------------------------------------------
// clearAll
// ---------------------------------------------------------------------------

describe('clearAll()', () => {
  it('clears both notes and todos', () => {
    saveNotes([createNote({ id: 'n1', title: 'Note', body: '', tag: 'work' })]);
    saveTodos([createTodo({ id: 't1', title: 'Todo', priority: 'low' })]);

    clearAll();

    expect(loadNotes()).toEqual([]);
    expect(loadTodos()).toEqual([]);
  });

  it('does not throw when called on an already-empty store', () => {
    expect(() => clearAll()).not.toThrow();
  });
});
