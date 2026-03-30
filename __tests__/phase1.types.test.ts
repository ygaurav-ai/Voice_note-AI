/**
 * __tests__/phase1.types.test.ts
 *
 * Phase 1 — TypeScript types tests.
 *
 * Tests the Note and Todo interfaces plus the createNote() and createTodo()
 * factory helpers defined in types/index.ts.
 *
 * These tests verify:
 *   - Factory helpers produce correctly shaped objects
 *   - Default values are populated (completed = false, notificationId = null, etc.)
 *   - Timestamps are valid ISO strings
 *   - Tag and priority union types are correctly enforced at the value level
 */

import { createNote, createTodo, Note, Todo, NoteTag, TodoPriority } from '../types';

// ---------------------------------------------------------------------------
// createNote tests
// ---------------------------------------------------------------------------

describe('createNote()', () => {
  const BASE_ID = 'test-note-id-001';

  it('returns an object with the correct shape', () => {
    const note = createNote({ id: BASE_ID, title: 'Hello', body: 'World', tag: 'work' });

    // All required Note fields must be present
    expect(note).toHaveProperty('id');
    expect(note).toHaveProperty('title');
    expect(note).toHaveProperty('body');
    expect(note).toHaveProperty('tag');
    expect(note).toHaveProperty('createdAt');
    expect(note).toHaveProperty('updatedAt');
  });

  it('preserves the supplied id, title, body, and tag', () => {
    const note = createNote({ id: BASE_ID, title: 'My Note', body: 'Note body', tag: 'reading' });

    expect(note.id).toBe(BASE_ID);
    expect(note.title).toBe('My Note');
    expect(note.body).toBe('Note body');
    expect(note.tag).toBe('reading');
  });

  it('sets createdAt and updatedAt to the same ISO string on creation', () => {
    const before = new Date().toISOString();
    const note = createNote({ id: BASE_ID, title: 'Test', body: '', tag: 'ideas' });
    const after = new Date().toISOString();

    // Timestamps must be valid ISO strings
    expect(() => new Date(note.createdAt)).not.toThrow();
    expect(() => new Date(note.updatedAt)).not.toThrow();

    // Timestamps must be between before and after this test ran
    expect(note.createdAt >= before).toBe(true);
    expect(note.createdAt <= after).toBe(true);

    // On creation, both timestamps should be equal
    expect(note.createdAt).toBe(note.updatedAt);
  });

  it('accepts all valid NoteTag values', () => {
    const validTags: NoteTag[] = ['work', 'reading', 'personal', 'ideas'];

    validTags.forEach((tag) => {
      const note = createNote({ id: `id-${tag}`, title: tag, body: '', tag });
      expect(note.tag).toBe(tag);
    });
  });

  it('creates notes with empty body without throwing', () => {
    expect(() =>
      createNote({ id: BASE_ID, title: 'Empty body note', body: '', tag: 'personal' })
    ).not.toThrow();
  });

  it('creates notes with multi-line body', () => {
    const body = 'Line 1\nLine 2\nLine 3';
    const note = createNote({ id: BASE_ID, title: 'Multi-line', body, tag: 'work' });
    expect(note.body).toBe(body);
  });
});

// ---------------------------------------------------------------------------
// createTodo tests
// ---------------------------------------------------------------------------

describe('createTodo()', () => {
  const BASE_ID = 'test-todo-id-001';

  it('returns an object with the correct shape', () => {
    const todo = createTodo({ id: BASE_ID, title: 'Buy milk', priority: 'low' });

    expect(todo).toHaveProperty('id');
    expect(todo).toHaveProperty('title');
    expect(todo).toHaveProperty('priority');
    expect(todo).toHaveProperty('dueDate');
    expect(todo).toHaveProperty('completed');
    expect(todo).toHaveProperty('completedAt');
    expect(todo).toHaveProperty('reminderSet');
    expect(todo).toHaveProperty('notificationId');
    expect(todo).toHaveProperty('createdAt');
  });

  it('sets completed to false by default', () => {
    const todo = createTodo({ id: BASE_ID, title: 'Task', priority: 'high' });
    expect(todo.completed).toBe(false);
  });

  it('sets completedAt to null by default', () => {
    const todo = createTodo({ id: BASE_ID, title: 'Task', priority: 'medium' });
    expect(todo.completedAt).toBeNull();
  });

  it('sets notificationId to null by default', () => {
    const todo = createTodo({ id: BASE_ID, title: 'Task', priority: 'low' });
    expect(todo.notificationId).toBeNull();
  });

  it('sets reminderSet to false by default', () => {
    const todo = createTodo({ id: BASE_ID, title: 'Task', priority: 'low' });
    expect(todo.reminderSet).toBe(false);
  });

  it('sets dueDate to null by default', () => {
    const todo = createTodo({ id: BASE_ID, title: 'No due date', priority: 'low' });
    expect(todo.dueDate).toBeNull();
  });

  it('accepts and stores a dueDate ISO string', () => {
    const dueDate = '2026-04-01T09:00:00.000Z';
    const todo = createTodo({ id: BASE_ID, title: 'Due soon', priority: 'high', dueDate });
    expect(todo.dueDate).toBe(dueDate);
  });

  it('accepts and stores reminderSet = true', () => {
    const todo = createTodo({ id: BASE_ID, title: 'Remind me', priority: 'medium', reminderSet: true });
    expect(todo.reminderSet).toBe(true);
  });

  it('sets createdAt to a valid ISO string', () => {
    const before = new Date().toISOString();
    const todo = createTodo({ id: BASE_ID, title: 'Task', priority: 'low' });
    const after = new Date().toISOString();

    expect(() => new Date(todo.createdAt)).not.toThrow();
    expect(todo.createdAt >= before).toBe(true);
    expect(todo.createdAt <= after).toBe(true);
  });

  it('accepts all valid TodoPriority values', () => {
    const priorities: TodoPriority[] = ['high', 'medium', 'low'];

    priorities.forEach((priority) => {
      const todo = createTodo({ id: `id-${priority}`, title: `${priority} task`, priority });
      expect(todo.priority).toBe(priority);
    });
  });

  it('preserves the supplied id and title', () => {
    const todo = createTodo({ id: 'abc-123', title: 'My important task', priority: 'high' });
    expect(todo.id).toBe('abc-123');
    expect(todo.title).toBe('My important task');
  });
});

// ---------------------------------------------------------------------------
// Type guard tests — confirm objects satisfy the interface shape at runtime
// ---------------------------------------------------------------------------

describe('Note and Todo type conformance', () => {
  it('Note object satisfies the Note interface', () => {
    const note: Note = createNote({ id: 'n1', title: 'Test', body: 'Body', tag: 'ideas' });

    // TypeScript would catch this at compile time; here we confirm runtime shape
    const keys: Array<keyof Note> = ['id', 'title', 'body', 'tag', 'createdAt', 'updatedAt'];
    keys.forEach((key) => {
      expect(note[key]).toBeDefined();
    });
  });

  it('Todo object satisfies the Todo interface', () => {
    const todo: Todo = createTodo({ id: 't1', title: 'Task', priority: 'medium' });

    const keys: Array<keyof Todo> = [
      'id', 'title', 'priority', 'dueDate', 'completed',
      'completedAt', 'reminderSet', 'notificationId', 'createdAt',
    ];
    keys.forEach((key) => {
      // null values are defined — check key existence
      expect(key in todo).toBe(true);
    });
  });
});
