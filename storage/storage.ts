/**
 * storage/storage.ts
 *
 * MMKV-backed key-value storage helpers for the Thoughts app.
 *
 * Why MMKV over AsyncStorage?
 *   - Synchronous reads — no await, no loading states for on-device data
 *   - ~10× faster than AsyncStorage for large data sets
 *   - Reliable on both iOS and Android
 *
 * All store persistence goes through this file.
 * The store calls saveNotes() / loadNotes() etc; nothing else
 * should touch MMKV directly.
 *
 * Storage keys — keep them as constants here to avoid typos.
 *
 * DEBUG TIP: During development you can call storage.clearAll() from
 * a debug button to wipe all persisted data and start fresh.
 */

// react-native-mmkv v4 uses createMMKV() factory instead of `new MMKV()`
// MMKV is now a TypeScript interface (type-only), not a class.
import { createMMKV, type MMKV } from 'react-native-mmkv';
import { Note, Todo } from '../types';

// ---------------------------------------------------------------------------
// MMKV instance — single shared instance for the whole app
// ---------------------------------------------------------------------------

/**
 * The MMKV instance.
 * We use a named ID so it is easier to identify in debugging tools.
 *
 * NOTE: react-native-mmkv v4 changed from `new MMKV()` to `createMMKV()`.
 * The MMKV type is now an interface — only importable as `type MMKV`.
 */
export const storage: MMKV = createMMKV({ id: 'thoughts-storage' });

// ---------------------------------------------------------------------------
// Storage keys — centralised to prevent typos across the codebase
// ---------------------------------------------------------------------------
const KEYS = {
  NOTES: 'thoughts:notes',
  TODOS: 'thoughts:todos',
} as const;

// ---------------------------------------------------------------------------
// Notes persistence helpers
// ---------------------------------------------------------------------------

/**
 * saveNotes — serialise and persist the full notes array to MMKV.
 * Called by notesStore whenever state changes.
 *
 * @param notes - The current full array of Note objects from the store
 */
export function saveNotes(notes: Note[]): void {
  // DEBUG: log count on save so we can see persistence activity in Metro
  // console.debug('[storage] saveNotes — saving', notes.length, 'notes');
  storage.set(KEYS.NOTES, JSON.stringify(notes));
}

/**
 * loadNotes — deserialise notes from MMKV.
 * Returns an empty array if nothing has been saved yet.
 * Called once on app start to rehydrate the notes store.
 *
 * @returns Note[] — may be empty on first launch
 */
export function loadNotes(): Note[] {
  const raw = storage.getString(KEYS.NOTES);
  if (!raw) {
    // First launch — no saved notes yet
    return [];
  }
  try {
    return JSON.parse(raw) as Note[];
  } catch (error) {
    // Corrupted data — return empty rather than crash
    console.error('[storage] loadNotes — failed to parse saved notes:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Todos persistence helpers
// ---------------------------------------------------------------------------

/**
 * saveTodos — serialise and persist the full todos array to MMKV.
 * Called by todoStore whenever state changes.
 *
 * @param todos - The current full array of Todo objects from the store
 */
export function saveTodos(todos: Todo[]): void {
  // DEBUG: log count on save
  // console.debug('[storage] saveTodos — saving', todos.length, 'todos');
  storage.set(KEYS.TODOS, JSON.stringify(todos));
}

/**
 * loadTodos — deserialise todos from MMKV.
 * Returns an empty array if nothing has been saved yet.
 * Called once on app start to rehydrate the todos store.
 *
 * @returns Todo[] — may be empty on first launch
 */
export function loadTodos(): Todo[] {
  const raw = storage.getString(KEYS.TODOS);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as Todo[];
  } catch (error) {
    console.error('[storage] loadTodos — failed to parse saved todos:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Debug helper — wipe all stored data (use only in development)
// ---------------------------------------------------------------------------

/**
 * clearAll — wipes every key written by this app from MMKV.
 * Only use this from a dev/debug screen. Never call in production code.
 */
export function clearAll(): void {
  // v4 API uses remove() — delete() no longer exists
  storage.remove(KEYS.NOTES);
  storage.remove(KEYS.TODOS);
  console.warn('[storage] clearAll — all persisted data has been cleared');
}
