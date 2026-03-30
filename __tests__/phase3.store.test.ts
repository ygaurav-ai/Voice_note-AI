/**
 * __tests__/phase3.store.test.ts
 *
 * Phase 3 — Notes store tests.
 *
 * Tests every action and selector in store/notesStore.ts.
 *
 * What is tested:
 *   1. Initial state — notes loaded from MMKV, UI state defaults
 *   2. addNote — creates note, prepends to list, returns the new note
 *   3. updateNote — merges changes, refreshes updatedAt, ignores unknown id
 *   4. deleteNote — removes note by id, ignores unknown id
 *   5. setActiveTag / setSearchQuery — UI state mutations
 *   6. getFilteredNotes — tag filter, search filter, combined AND, edge cases
 *   7. getTodayNotes — returns only notes created today
 *   8. getNoteById — finds by id, returns undefined when missing
 *   9. MMKV persistence — saveNotes is called after every mutation
 *
 * Reset strategy:
 *   The store is a module singleton. Between tests we reset state with
 *   useNotesStore.setState() so every test starts with a clean slate.
 *   The MMKV mock store is also cleared in beforeEach.
 *
 * DEBUG TIP: If a test leaks state into the next one, verify that beforeEach
 * resets BOTH the mockStore object AND the Zustand state.
 */

// ---------------------------------------------------------------------------
// MMKV mock — must be declared before any import that uses storage
// ---------------------------------------------------------------------------

/**
 * In-memory store that simulates MMKV's getString/set/remove behaviour.
 *
 * WHY the null-guard pattern:
 *   jest.mock() is hoisted by Babel to run BEFORE any variable assignment in
 *   the file. TypeScript/Babel compiles declarations to `var`, so `mockStore`
 *   is hoisted as `var mockStore = undefined` — the `= {}` assignment hasn't
 *   run yet when the mock factory is registered.
 *
 *   Unlike storage.test.ts (Phase 1), notesStore.ts calls `loadNotes()` →
 *   `getString()` synchronously during module initialisation (inside Zustand's
 *   `create()` call). This means getString() is invoked BEFORE `mockStore = {}`
 *   has executed, so `mockStore` is still `undefined`.
 *
 *   Fix: null-guard every method. JavaScript's loose inequality means
 *   `undefined != null` is FALSE, so the guards protect against both `null`
 *   and `undefined`. getString() safely returns `undefined` (= "no saved data")
 *   during module init, which is correct behaviour for a fresh store.
 *
 *   mockStore is then initialised to `{}` in beforeEach so all test bodies
 *   get a clean, properly initialised store to read and write.
 */
let mockStore: Record<string, string> | null = null; // null until beforeEach initialises it

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    set: (key: string, value: string) => {
      // Guard: mockStore is null/undefined during module initialisation
      if (mockStore != null) mockStore[key] = value;
    },
    getString: (key: string): string | undefined => {
      // Return undefined during module init (signals "no saved data" — correct)
      if (mockStore == null) return undefined;
      return mockStore[key] ?? undefined;
    },
    // v4 API uses remove(), not delete()
    remove: (key: string) => {
      if (mockStore != null) delete mockStore[key];
    },
  }),
}));

// ---------------------------------------------------------------------------
// Imports — after the mock is registered
// ---------------------------------------------------------------------------

import { useNotesStore } from '../store/notesStore';
import { createNote } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a simple Note object seeded with preset data.
 * Allows tests to be precise about id/title/tag without needing
 * to call addNote (which goes through the real store machinery).
 */
function makeNote(
  id: string,
  title: string,
  tag: 'work' | 'reading' | 'personal' | 'ideas' = 'ideas',
  body = '',
  createdAt?: string
) {
  const note = createNote({ id, title, body, tag });
  // Allow overriding createdAt for getTodayNotes / date tests
  if (createdAt) {
    return { ...note, createdAt, updatedAt: createdAt };
  }
  return note;
}

/** ISO string for yesterday — used to test that old notes are excluded from getTodayNotes */
function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Reset before every test
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Initialise (or reset) the mockStore to an empty object.
  // This also turns on the null-guards in set/getString/remove so writes
  // are captured for persistence assertions.
  mockStore = {};

  // Reset the Zustand store to a clean baseline state.
  // We use setState rather than re-importing because the store is a singleton.
  useNotesStore.setState({ notes: [], activeTag: 'all', searchQuery: '' });
});

// ---------------------------------------------------------------------------
// 1. Initial state
// ---------------------------------------------------------------------------

describe('initial state', () => {
  it('starts with an empty notes array when MMKV has no data', () => {
    const { notes } = useNotesStore.getState();
    expect(notes).toEqual([]);
  });

  it('defaults activeTag to "all"', () => {
    const { activeTag } = useNotesStore.getState();
    expect(activeTag).toBe('all');
  });

  it('defaults searchQuery to an empty string', () => {
    const { searchQuery } = useNotesStore.getState();
    expect(searchQuery).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 2. addNote
// ---------------------------------------------------------------------------

describe('addNote()', () => {
  it('adds a note to the store', () => {
    useNotesStore.getState().addNote({ title: 'Hello', body: 'World', tag: 'work' });
    const { notes } = useNotesStore.getState();
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe('Hello');
  });

  it('returns the newly created note', () => {
    const newNote = useNotesStore
      .getState()
      .addNote({ title: 'Return test', body: '', tag: 'ideas' });
    expect(newNote.title).toBe('Return test');
    expect(typeof newNote.id).toBe('string');
    expect(newNote.id.length).toBeGreaterThan(0);
  });

  it('prepends the note so newest appears first', () => {
    useNotesStore.getState().addNote({ title: 'First', body: '', tag: 'work' });
    useNotesStore.getState().addNote({ title: 'Second', body: '', tag: 'reading' });
    useNotesStore.getState().addNote({ title: 'Third', body: '', tag: 'personal' });

    const { notes } = useNotesStore.getState();
    expect(notes[0].title).toBe('Third');
    expect(notes[1].title).toBe('Second');
    expect(notes[2].title).toBe('First');
  });

  it('assigns a unique id to each note', () => {
    const n1 = useNotesStore.getState().addNote({ title: 'A', body: '', tag: 'work' });
    const n2 = useNotesStore.getState().addNote({ title: 'B', body: '', tag: 'work' });
    expect(n1.id).not.toBe(n2.id);
  });

  it('sets createdAt and updatedAt as ISO strings', () => {
    const note = useNotesStore.getState().addNote({ title: 'Timestamps', body: '', tag: 'ideas' });
    // Both should be valid ISO 8601 strings
    expect(new Date(note.createdAt).toISOString()).toBe(note.createdAt);
    expect(new Date(note.updatedAt).toISOString()).toBe(note.updatedAt);
  });

  it('persists to MMKV (mockStore has the notes key after addNote)', () => {
    useNotesStore.getState().addNote({ title: 'Persist test', body: '', tag: 'personal' });
    // saveNotes writes to mockStore via mmkv.set — verify the key exists
    // Non-null assertion (!) is safe: beforeEach always initialises mockStore to {}
    expect(mockStore!['thoughts:notes']).toBeDefined();
    expect(typeof mockStore!['thoughts:notes']).toBe('string');
  });

  it('adds multiple notes and keeps them all', () => {
    useNotesStore.getState().addNote({ title: 'A', body: '', tag: 'work' });
    useNotesStore.getState().addNote({ title: 'B', body: '', tag: 'reading' });
    useNotesStore.getState().addNote({ title: 'C', body: '', tag: 'personal' });

    const { notes } = useNotesStore.getState();
    expect(notes).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 3. updateNote
// ---------------------------------------------------------------------------

describe('updateNote()', () => {
  it('updates the title of a note', () => {
    const note = useNotesStore.getState().addNote({ title: 'Old title', body: '', tag: 'work' });

    useNotesStore.getState().updateNote(note.id, { title: 'New title' });

    const updated = useNotesStore.getState().notes.find((n) => n.id === note.id);
    expect(updated?.title).toBe('New title');
  });

  it('updates the body of a note', () => {
    const note = useNotesStore.getState().addNote({ title: 'Note', body: 'old body', tag: 'ideas' });

    useNotesStore.getState().updateNote(note.id, { body: 'new body' });

    const updated = useNotesStore.getState().notes.find((n) => n.id === note.id);
    expect(updated?.body).toBe('new body');
  });

  it('updates the tag of a note', () => {
    const note = useNotesStore.getState().addNote({ title: 'Note', body: '', tag: 'work' });

    useNotesStore.getState().updateNote(note.id, { tag: 'reading' });

    const updated = useNotesStore.getState().notes.find((n) => n.id === note.id);
    expect(updated?.tag).toBe('reading');
  });

  it('updates multiple fields at once', () => {
    const note = useNotesStore.getState().addNote({ title: 'Old', body: 'Old body', tag: 'work' });

    useNotesStore.getState().updateNote(note.id, { title: 'New', body: 'New body', tag: 'personal' });

    const updated = useNotesStore.getState().notes.find((n) => n.id === note.id);
    expect(updated?.title).toBe('New');
    expect(updated?.body).toBe('New body');
    expect(updated?.tag).toBe('personal');
  });

  it('refreshes updatedAt to a newer timestamp', async () => {
    const note = useNotesStore.getState().addNote({ title: 'Note', body: '', tag: 'work' });
    const originalUpdatedAt = note.updatedAt;

    // Small delay to ensure the new timestamp is different
    await new Promise((r) => setTimeout(r, 5));
    useNotesStore.getState().updateNote(note.id, { title: 'Updated' });

    const updated = useNotesStore.getState().notes.find((n) => n.id === note.id);
    expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
    expect(new Date(updated!.updatedAt) > new Date(originalUpdatedAt)).toBe(true);
  });

  it('does not change createdAt when updating', () => {
    const note = useNotesStore.getState().addNote({ title: 'Note', body: '', tag: 'work' });
    const originalCreatedAt = note.createdAt;

    useNotesStore.getState().updateNote(note.id, { title: 'Updated' });

    const updated = useNotesStore.getState().notes.find((n) => n.id === note.id);
    expect(updated?.createdAt).toBe(originalCreatedAt);
  });

  it('silently ignores an unknown id', () => {
    useNotesStore.getState().addNote({ title: 'Real note', body: '', tag: 'work' });

    // Should not throw
    expect(() => {
      useNotesStore.getState().updateNote('nonexistent-id-999', { title: 'Ghost' });
    }).not.toThrow();

    // The real note should be unchanged
    const { notes } = useNotesStore.getState();
    expect(notes[0].title).toBe('Real note');
  });

  it('persists changes to MMKV (mockStore reflects the updated title)', () => {
    const note = useNotesStore.getState().addNote({ title: 'Before', body: '', tag: 'work' });

    useNotesStore.getState().updateNote(note.id, { title: 'After' });

    // The saved JSON should now contain the updated title
    const saved = JSON.parse(mockStore!['thoughts:notes']);
    expect(saved[0].title).toBe('After');
  });
});

// ---------------------------------------------------------------------------
// 4. deleteNote
// ---------------------------------------------------------------------------

describe('deleteNote()', () => {
  it('removes the note from the store', () => {
    const note = useNotesStore.getState().addNote({ title: 'Delete me', body: '', tag: 'work' });

    useNotesStore.getState().deleteNote(note.id);

    const { notes } = useNotesStore.getState();
    expect(notes).toHaveLength(0);
  });

  it('removes only the targeted note when multiple notes exist', () => {
    const n1 = useNotesStore.getState().addNote({ title: 'Keep', body: '', tag: 'work' });
    const n2 = useNotesStore.getState().addNote({ title: 'Delete', body: '', tag: 'reading' });

    useNotesStore.getState().deleteNote(n2.id);

    const { notes } = useNotesStore.getState();
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe(n1.id);
  });

  it('silently ignores an unknown id', () => {
    useNotesStore.getState().addNote({ title: 'Survivor', body: '', tag: 'ideas' });

    expect(() => {
      useNotesStore.getState().deleteNote('nonexistent-id-000');
    }).not.toThrow();

    const { notes } = useNotesStore.getState();
    expect(notes).toHaveLength(1);
  });

  it('persists the deletion to MMKV (mockStore reflects empty array)', () => {
    const note = useNotesStore.getState().addNote({ title: 'Gone', body: '', tag: 'work' });

    useNotesStore.getState().deleteNote(note.id);

    const saved = JSON.parse(mockStore!['thoughts:notes']);
    expect(saved).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. setActiveTag / setSearchQuery
// ---------------------------------------------------------------------------

describe('setActiveTag()', () => {
  it('sets the active tag to a specific tag', () => {
    useNotesStore.getState().setActiveTag('work');
    expect(useNotesStore.getState().activeTag).toBe('work');
  });

  it('sets activeTag to "all"', () => {
    useNotesStore.getState().setActiveTag('work'); // first set to something else
    useNotesStore.getState().setActiveTag('all');
    expect(useNotesStore.getState().activeTag).toBe('all');
  });

  it('accepts every valid tag', () => {
    const tags = ['work', 'reading', 'personal', 'ideas', 'all'] as const;
    for (const tag of tags) {
      useNotesStore.getState().setActiveTag(tag);
      expect(useNotesStore.getState().activeTag).toBe(tag);
    }
  });
});

describe('setSearchQuery()', () => {
  it('updates the search query', () => {
    useNotesStore.getState().setSearchQuery('hello');
    expect(useNotesStore.getState().searchQuery).toBe('hello');
  });

  it('clears the search query with an empty string', () => {
    useNotesStore.getState().setSearchQuery('hello');
    useNotesStore.getState().setSearchQuery('');
    expect(useNotesStore.getState().searchQuery).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 6. getFilteredNotes
// ---------------------------------------------------------------------------

describe('getFilteredNotes()', () => {
  beforeEach(() => {
    // Seed a variety of notes in the store
    useNotesStore.setState({
      notes: [
        makeNote('n1', 'Work meeting notes', 'work', 'quarterly review discussion'),
        makeNote('n2', 'Book list', 'reading', 'science fiction picks'),
        makeNote('n3', 'Personal goals', 'personal', 'exercise and diet plan'),
        makeNote('n4', 'Startup ideas', 'ideas', 'app concepts and sketches'),
        makeNote('n5', 'Another work item', 'work', 'follow up on project X'),
      ],
    });
  });

  it('returns all notes when activeTag is "all" and searchQuery is empty', () => {
    useNotesStore.setState({ activeTag: 'all', searchQuery: '' });
    const result = useNotesStore.getState().getFilteredNotes();
    expect(result).toHaveLength(5);
  });

  it('filters by tag', () => {
    useNotesStore.setState({ activeTag: 'work', searchQuery: '' });
    const result = useNotesStore.getState().getFilteredNotes();
    expect(result).toHaveLength(2);
    expect(result.every((n) => n.tag === 'work')).toBe(true);
  });

  it('returns [] when no notes match the tag', () => {
    // No notes with tag 'personal' match (we have one but let's use a fresh state)
    useNotesStore.setState({ notes: [makeNote('n1', 'Work note', 'work')], activeTag: 'reading', searchQuery: '' });
    const result = useNotesStore.getState().getFilteredNotes();
    expect(result).toHaveLength(0);
  });

  it('filters by search query — matches title', () => {
    useNotesStore.setState({ activeTag: 'all', searchQuery: 'book' });
    const result = useNotesStore.getState().getFilteredNotes();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('n2');
  });

  it('filters by search query — matches body', () => {
    useNotesStore.setState({ activeTag: 'all', searchQuery: 'sketches' });
    const result = useNotesStore.getState().getFilteredNotes();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('n4');
  });

  it('search is case-insensitive', () => {
    useNotesStore.setState({ activeTag: 'all', searchQuery: 'WORK' });
    const result = useNotesStore.getState().getFilteredNotes();
    // Matches title 'Work meeting notes', 'Another work item' and body 'follow up on project X' doesn't match WORK
    // 'Work meeting notes' (title) + 'Another work item' (title) + 'quarterly review discussion' (no) = 2
    expect(result.length).toBeGreaterThanOrEqual(2);
    // All results should contain 'work' in title or body (case-insensitive)
    result.forEach((n) => {
      const lower = (n.title + ' ' + n.body).toLowerCase();
      expect(lower).toContain('work');
    });
  });

  it('combines tag filter AND search query (both must match)', () => {
    useNotesStore.setState({ activeTag: 'work', searchQuery: 'meeting' });
    const result = useNotesStore.getState().getFilteredNotes();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('n1');
  });

  it('returns [] when tag matches but search does not', () => {
    useNotesStore.setState({ activeTag: 'work', searchQuery: 'nonexistentterm' });
    const result = useNotesStore.getState().getFilteredNotes();
    expect(result).toHaveLength(0);
  });

  it('ignores leading/trailing whitespace in search query', () => {
    useNotesStore.setState({ activeTag: 'all', searchQuery: '  book  ' });
    const result = useNotesStore.getState().getFilteredNotes();
    expect(result).toHaveLength(1);
  });

  it('returns [] for an empty notes array', () => {
    useNotesStore.setState({ notes: [], activeTag: 'all', searchQuery: 'anything' });
    const result = useNotesStore.getState().getFilteredNotes();
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 7. getTodayNotes
// ---------------------------------------------------------------------------

describe('getTodayNotes()', () => {
  it('returns notes created today', () => {
    // createNote uses new Date() — so these will be "today"
    useNotesStore.getState().addNote({ title: 'Today note 1', body: '', tag: 'work' });
    useNotesStore.getState().addNote({ title: 'Today note 2', body: '', tag: 'ideas' });

    const today = useNotesStore.getState().getTodayNotes();
    expect(today).toHaveLength(2);
  });

  it('excludes notes created yesterday', () => {
    const oldNote = makeNote('old', 'Old note', 'work', '', yesterday());
    const todayNote = makeNote('new', 'Today note', 'ideas', '', new Date().toISOString());

    useNotesStore.setState({ notes: [oldNote, todayNote] });

    const today = useNotesStore.getState().getTodayNotes();
    expect(today).toHaveLength(1);
    expect(today[0].id).toBe('new');
  });

  it('returns [] when there are no notes at all', () => {
    const today = useNotesStore.getState().getTodayNotes();
    expect(today).toHaveLength(0);
  });

  it('returns [] when all notes are from yesterday', () => {
    useNotesStore.setState({
      notes: [
        makeNote('n1', 'Old 1', 'work', '', yesterday()),
        makeNote('n2', 'Old 2', 'ideas', '', yesterday()),
      ],
    });
    const today = useNotesStore.getState().getTodayNotes();
    expect(today).toHaveLength(0);
  });

  it('returns today notes in newest-first order (as added)', () => {
    const n1 = useNotesStore.getState().addNote({ title: 'First', body: '', tag: 'work' });
    const n2 = useNotesStore.getState().addNote({ title: 'Second', body: '', tag: 'reading' });

    // addNote prepends, so n2 is at index 0 in notes array
    const today = useNotesStore.getState().getTodayNotes();
    expect(today[0].id).toBe(n2.id);
    expect(today[1].id).toBe(n1.id);
  });
});

// ---------------------------------------------------------------------------
// 8. getNoteById
// ---------------------------------------------------------------------------

describe('getNoteById()', () => {
  it('returns the note with the matching id', () => {
    const added = useNotesStore.getState().addNote({ title: 'Find me', body: 'body', tag: 'ideas' });

    const found = useNotesStore.getState().getNoteById(added.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(added.id);
    expect(found?.title).toBe('Find me');
  });

  it('returns undefined when the id does not exist', () => {
    const found = useNotesStore.getState().getNoteById('ghost-id-xyz');
    expect(found).toBeUndefined();
  });

  it('returns undefined after the note has been deleted', () => {
    const note = useNotesStore.getState().addNote({ title: 'Temp', body: '', tag: 'work' });

    useNotesStore.getState().deleteNote(note.id);

    const found = useNotesStore.getState().getNoteById(note.id);
    expect(found).toBeUndefined();
  });

  it('returns the updated note after updateNote()', () => {
    const note = useNotesStore.getState().addNote({ title: 'Original', body: '', tag: 'work' });

    useNotesStore.getState().updateNote(note.id, { title: 'Modified' });

    const found = useNotesStore.getState().getNoteById(note.id);
    expect(found?.title).toBe('Modified');
  });
});

// ---------------------------------------------------------------------------
// 9. MMKV persistence
// ---------------------------------------------------------------------------

describe('MMKV persistence', () => {
  // Non-null assertion (!) is safe in all test bodies below:
  // beforeEach always sets mockStore = {}, so it is never null when tests run.

  it('addNote writes JSON to mockStore with the correct notes key', () => {
    useNotesStore.getState().addNote({ title: 'Persist', body: '', tag: 'work' });
    expect(mockStore!['thoughts:notes']).toBeDefined();
  });

  it('updateNote writes updated JSON to mockStore', () => {
    const note = useNotesStore.getState().addNote({ title: 'Before', body: '', tag: 'work' });

    useNotesStore.getState().updateNote(note.id, { title: 'After' });

    const saved = JSON.parse(mockStore!['thoughts:notes']);
    expect(saved[0].title).toBe('After');
  });

  it('deleteNote writes the reduced array JSON to mockStore', () => {
    const note = useNotesStore.getState().addNote({ title: 'Bye', body: '', tag: 'ideas' });

    useNotesStore.getState().deleteNote(note.id);

    const saved = JSON.parse(mockStore!['thoughts:notes']);
    expect(saved).toHaveLength(0);
  });

  it('the JSON saved to mockStore matches all note fields', () => {
    useNotesStore.getState().addNote({ title: 'Serialised', body: 'body text', tag: 'reading' });

    const savedJson = mockStore!['thoughts:notes'];
    expect(savedJson).toBeDefined();

    const parsed = JSON.parse(savedJson);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('Serialised');
    expect(parsed[0].body).toBe('body text');
    expect(parsed[0].tag).toBe('reading');
  });

  it('setActiveTag does NOT write to mockStore (UI state is not persisted)', () => {
    // Start fresh so there's nothing in mockStore
    const keysBefore = Object.keys(mockStore!).length;

    useNotesStore.getState().setActiveTag('work');

    // No new keys should have been added
    expect(Object.keys(mockStore!).length).toBe(keysBefore);
  });

  it('setSearchQuery does NOT write to mockStore (UI state is not persisted)', () => {
    const keysBefore = Object.keys(mockStore!).length;

    useNotesStore.getState().setSearchQuery('hello');

    expect(Object.keys(mockStore!).length).toBe(keysBefore);
  });
});
