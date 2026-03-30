/**
 * __tests__/phase5.test.ts
 *
 * Phase 5 — Reminders & Notifications tests.
 *
 * What is tested:
 *   1. utils/notifications.ts
 *      - requestNotificationPermissions: calls expo API, maps status to boolean
 *      - scheduleReminder: calls scheduleNotificationAsync with correct payload,
 *        skips past dates, handles errors gracefully
 *      - cancelReminder: calls cancelScheduledNotificationAsync, no-ops on null
 *
 *   2. todoStore — notification lifecycle in store actions
 *      - toggleComplete: cancels notification when completing a todo that has one
 *      - toggleComplete: does NOT cancel when unchecking (completing→active)
 *      - toggleComplete: no-op if todo has no notificationId
 *      - deleteTodo: cancels notification for deleted todos that have one
 *      - deleteTodo: no-op if todo has no notificationId
 *      - addTodo: stores notificationId and reminderSet correctly
 *
 * Mocked modules:
 *   - expo-notifications: mocks created inline (jest.fn() inside the factory)
 *     and accessed via require() — see NOTE below about hoisting
 *   - react-native-mmkv: null-guard pattern (same as Phase 3/4 store tests)
 *
 * NOTE on jest.mock() hoisting:
 *   Babel hoists jest.mock() calls to the top of the file, BEFORE any const/let
 *   variable declarations. This means mock factories cannot safely close over
 *   variables defined with const/let — those variables are undefined at factory
 *   run time. The safe pattern is to define jest.fn() stubs inline inside the
 *   factory, then retrieve the same instances via require() in beforeAll/beforeEach.
 *
 * DEBUG TIP: If cancelScheduledNotificationAsync is called with the wrong id,
 * log target.notificationId inside the toggleComplete/deleteTodo actions to
 * verify the lookup is finding the right todo before mutation.
 */

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports
// ---------------------------------------------------------------------------

// MMKV null-guard mock (same pattern as phase3/4 store tests).
// The null-guard prevents set/getString being called on a null store during
// module initialisation (before beforeEach sets mockStore = {}).
let mockStore: Record<string, string> | null = null;

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    set: (key: string, value: string) => {
      if (mockStore != null) mockStore[key] = value;
    },
    getString: (key: string) => {
      if (mockStore == null) return undefined;
      return mockStore[key] ?? undefined;
    },
    remove: (key: string) => {
      if (mockStore != null) delete mockStore[key];
    },
  }),
}));

// expo-notifications: stubs defined INLINE inside the factory so they are
// available when Jest hoists this call to the top of the file.
// We retrieve the same instances via require() in beforeAll below.
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync:          jest.fn(),
  scheduleNotificationAsync:        jest.fn().mockResolvedValue('notif-id-123'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationHandler:           jest.fn(),
  // Required by utils/notifications.ts: SchedulableTriggerInputTypes.DATE
  // is referenced at module load time to build the typed trigger object.
  SchedulableTriggerInputTypes: {
    DATE: 'date',
  },
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import {
  requestNotificationPermissions,
  scheduleReminder,
  cancelReminder,
} from '../utils/notifications';

import { useTodoStore } from '../store/todoStore';
import { createTodo } from '../types';

// ---------------------------------------------------------------------------
// Grab mock references — must happen after imports so Jest modules are resolved
// ---------------------------------------------------------------------------

// We use require() here (not import) so we can reassign mockFn references after
// jest.mock() has been processed and the module registry is set up.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Notifications = require('expo-notifications');

// Typed references to the inline jest.fn() stubs created in the mock factory above
let mockSchedule: jest.Mock;
let mockCancel: jest.Mock;
let mockRequest: jest.Mock;

beforeAll(() => {
  // Retrieve the exact jest.fn() instances that the mock factory created
  mockSchedule = Notifications.scheduleNotificationAsync;
  mockCancel   = Notifications.cancelScheduledNotificationAsync;
  mockRequest  = Notifications.requestPermissionsAsync;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * flushAsync — lets the event loop drain one turn so that fire-and-forget
 * async calls (like cancelReminder() inside store actions) have time to
 * invoke the underlying mock before we assert.
 *
 * Why needed: toggleComplete / deleteTodo call cancelReminder() without
 * awaiting it. The underlying Notifications.cancel call is still sync
 * (jest.fn() is sync) but the async function wrapper means the call
 * happens in the next microtask/macrotask, not the current one.
 */
const flushAsync = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Creates a todo directly in the store with preset fields for test convenience. */
function seedTodo(overrides: Partial<ReturnType<typeof createTodo>> & { id: string }) {
  const base = createTodo({
    id: overrides.id,
    title: overrides.title ?? 'Test task',
    priority: overrides.priority ?? 'medium',
  });
  const merged = { ...base, ...overrides };
  useTodoStore.setState({ todos: [merged, ...useTodoStore.getState().todos] });
  return merged;
}

/** Future date — 1 hour from now */
function futureDate(): string {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

/** Past date — 1 hour ago */
function pastDate(): string {
  return new Date(Date.now() - 60 * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Initialise the in-memory MMKV store so reads/writes work
  mockStore = {};
  // Reset Zustand state between tests
  useTodoStore.setState({ todos: [] });
  // Clear all mock call history
  mockSchedule?.mockClear();
  mockCancel?.mockClear();
  mockRequest?.mockClear();
});

// ---------------------------------------------------------------------------
// 1. requestNotificationPermissions
// ---------------------------------------------------------------------------

describe('requestNotificationPermissions', () => {
  it('calls requestPermissionsAsync', async () => {
    mockRequest.mockResolvedValueOnce({ status: 'granted' });
    await requestNotificationPermissions();
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('returns true when status is granted', async () => {
    mockRequest.mockResolvedValueOnce({ status: 'granted' });
    const result = await requestNotificationPermissions();
    expect(result).toBe(true);
  });

  it('returns false when status is denied', async () => {
    mockRequest.mockResolvedValueOnce({ status: 'denied' });
    const result = await requestNotificationPermissions();
    expect(result).toBe(false);
  });

  it('returns false when status is undetermined', async () => {
    mockRequest.mockResolvedValueOnce({ status: 'undetermined' });
    const result = await requestNotificationPermissions();
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. scheduleReminder
// ---------------------------------------------------------------------------

describe('scheduleReminder', () => {
  it('calls scheduleNotificationAsync for a future date', async () => {
    const due = futureDate();
    await scheduleReminder('Buy milk', due);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
  });

  it('passes the task title as the notification body', async () => {
    const due = futureDate();
    await scheduleReminder('Walk the dog', due);
    const callArgs = mockSchedule.mock.calls[0][0];
    expect(callArgs.content.body).toBe('Walk the dog');
  });

  it('passes the correct trigger date', async () => {
    const due = futureDate();
    await scheduleReminder('Meeting prep', due);
    const callArgs = mockSchedule.mock.calls[0][0];
    // trigger is a typed DateTriggerInput — { type: 'date', date: Date }
    expect(callArgs.trigger.date).toEqual(new Date(due));
  });

  it('returns the notification id on success', async () => {
    mockSchedule.mockResolvedValueOnce('abc-notif-id');
    const id = await scheduleReminder('Task', futureDate());
    expect(id).toBe('abc-notif-id');
  });

  it('returns null for a past due date without calling the API', async () => {
    const id = await scheduleReminder('Old task', pastDate());
    expect(id).toBeNull();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('returns null when scheduleNotificationAsync throws', async () => {
    mockSchedule.mockRejectedValueOnce(new Error('Permission denied'));
    const id = await scheduleReminder('Task', futureDate());
    expect(id).toBeNull();
  });

  it('sets notification title to "Task Reminder"', async () => {
    await scheduleReminder('Buy groceries', futureDate());
    const callArgs = mockSchedule.mock.calls[0][0];
    expect(callArgs.content.title).toBe('Task Reminder');
  });
});

// ---------------------------------------------------------------------------
// 3. cancelReminder
// ---------------------------------------------------------------------------

describe('cancelReminder', () => {
  it('calls cancelScheduledNotificationAsync with the given id', async () => {
    await cancelReminder('notif-xyz');
    expect(mockCancel).toHaveBeenCalledWith('notif-xyz');
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it('does nothing when called with null', async () => {
    await cancelReminder(null);
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('does not throw when cancelScheduledNotificationAsync rejects', async () => {
    mockCancel.mockRejectedValueOnce(new Error('Already cancelled'));
    await expect(cancelReminder('some-id')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4. todoStore — notification lifecycle
// ---------------------------------------------------------------------------

describe('todoStore — notification cancellation on toggleComplete', () => {
  it('cancels the notification when completing a todo with notificationId', async () => {
    seedTodo({ id: 't1', notificationId: 'notif-t1' });
    useTodoStore.getState().toggleComplete('t1');
    await flushAsync(); // drain so fire-and-forget cancelReminder() completes
    expect(mockCancel).toHaveBeenCalledWith('notif-t1');
  });

  it('does NOT cancel when unchecking a completed todo', async () => {
    // Seed already-completed todo — unchecking should not cancel
    seedTodo({ id: 't2', notificationId: 'notif-t2', completed: true, completedAt: new Date().toISOString() });
    useTodoStore.getState().toggleComplete('t2');
    await flushAsync();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('does nothing when completing a todo with no notificationId', async () => {
    seedTodo({ id: 't3', notificationId: null });
    useTodoStore.getState().toggleComplete('t3');
    await flushAsync();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('marks the todo as completed in state after the call', async () => {
    seedTodo({ id: 't4', notificationId: 'notif-t4' });
    useTodoStore.getState().toggleComplete('t4');
    await flushAsync();
    const todo = useTodoStore.getState().todos.find((t) => t.id === 't4');
    expect(todo?.completed).toBe(true);
    expect(todo?.completedAt).not.toBeNull();
  });

  it('silently ignores unknown ids', async () => {
    expect(() => useTodoStore.getState().toggleComplete('unknown')).not.toThrow();
    await flushAsync();
    expect(mockCancel).not.toHaveBeenCalled();
  });
});

describe('todoStore — notification cancellation on deleteTodo', () => {
  it('cancels the notification when deleting a todo with notificationId', async () => {
    seedTodo({ id: 'd1', notificationId: 'notif-d1' });
    useTodoStore.getState().deleteTodo('d1');
    await flushAsync(); // drain so fire-and-forget cancelReminder() completes
    expect(mockCancel).toHaveBeenCalledWith('notif-d1');
  });

  it('does NOT call cancel when deleting a todo with no notificationId', async () => {
    seedTodo({ id: 'd2', notificationId: null });
    useTodoStore.getState().deleteTodo('d2');
    await flushAsync();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('removes the todo from state', async () => {
    seedTodo({ id: 'd3', notificationId: 'notif-d3' });
    useTodoStore.getState().deleteTodo('d3');
    await flushAsync();
    const todos = useTodoStore.getState().todos;
    expect(todos.find((t) => t.id === 'd3')).toBeUndefined();
  });

  it('silently ignores unknown ids on delete', async () => {
    expect(() => useTodoStore.getState().deleteTodo('ghost-id')).not.toThrow();
    await flushAsync();
    expect(mockCancel).not.toHaveBeenCalled();
  });
});

describe('todoStore — addTodo stores reminder fields', () => {
  it('stores notificationId when provided', () => {
    useTodoStore.getState().addTodo({
      title: 'Task with reminder',
      priority: 'high',
      dueDate: futureDate(),
      reminderSet: true,
      notificationId: 'stored-notif-id',
    });
    const todo = useTodoStore.getState().todos[0];
    expect(todo.notificationId).toBe('stored-notif-id');
    expect(todo.reminderSet).toBe(true);
  });

  it('defaults notificationId to null when not provided', () => {
    useTodoStore.getState().addTodo({ title: 'No reminder', priority: 'low' });
    const todo = useTodoStore.getState().todos[0];
    expect(todo.notificationId).toBeNull();
  });

  it('defaults reminderSet to false when not provided', () => {
    useTodoStore.getState().addTodo({ title: 'No toggle', priority: 'medium' });
    const todo = useTodoStore.getState().todos[0];
    expect(todo.reminderSet).toBe(false);
  });
});
