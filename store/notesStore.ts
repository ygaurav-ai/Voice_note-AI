/**
 * store/notesStore.ts
 *
 * Zustand store for notes state.
 *
 * Responsibilities:
 *   - Holds the full notes array in memory
 *   - Persists every change to MMKV via storage helpers
 *   - Provides actions: addNote, updateNote, deleteNote
 *   - Holds UI state: activeTag filter and searchQuery
 *   - Provides selectors: getFilteredNotes, getTodayNotes, getNoteById
 *
 * Why Zustand?
 *   Lightweight — no reducers, no boilerplate, no context providers.
 *   Components subscribe to only the state slice they need, so unrelated
 *   changes don't cause unnecessary re-renders.
 *
 * Persistence strategy:
 *   Every write action (add, update, delete) calls saveNotes() immediately.
 *   On store initialisation, notes are loaded synchronously from MMKV via
 *   loadNotes(). This means the app has data on the first render — no loading
 *   states needed for local data.
 *
 * Usage in screens:
 *   const notes = useNotesStore(s => s.notes);
 *   const addNote = useNotesStore(s => s.addNote);
 *
 * Usage in test:
 *   useNotesStore.setState({ notes: [], activeTag: 'all', searchQuery: '' });
 *
 * DEBUG TIP: Add console.debug lines inside actions to trace state mutations.
 * Remove before shipping.
 */

import { create } from 'zustand';
import { Note, NoteTag, createNote } from '../types';
import { loadNotes, saveNotes } from '../storage/storage';
import { generateId } from '../utils/id';
import { isToday } from '../utils/date';

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface NotesState {
  // ---- State ----

  /** Full array of all notes, newest first. Loaded from MMKV at init. */
  notes: Note[];

  /** The currently selected tag filter on the Notes screen. 'all' = no filter. */
  activeTag: NoteTag | 'all';

  /** Current search string on the Notes screen. Empty = no search filter. */
  searchQuery: string;

  // ---- Actions ----

  /**
   * addNote — creates a new note and prepends it to the list.
   * Returns the newly created Note so callers can navigate to it if needed.
   */
  addNote: (data: { title: string; body: string; tag: NoteTag }) => Note;

  /**
   * updateNote — applies partial changes to a note and refreshes updatedAt.
   * Silently ignores calls with an unknown id.
   */
  updateNote: (
    id: string,
    changes: Partial<Pick<Note, 'title' | 'body' | 'tag'>>
  ) => void;

  /**
   * deleteNote — removes a note by id.
   * Silently ignores calls with an unknown id.
   */
  deleteNote: (id: string) => void;

  /**
   * setActiveTag — updates the tag filter. Use 'all' to show all notes.
   */
  setActiveTag: (tag: NoteTag | 'all') => void;

  /**
   * setSearchQuery — updates the live search string.
   * An empty string clears the search filter.
   */
  setSearchQuery: (query: string) => void;

  // ---- Selectors (functions that return derived data) ----

  /**
   * getFilteredNotes — returns notes filtered by activeTag and searchQuery.
   * Results are always newest-first.
   *
   * Search is case-insensitive and matches partial words in title OR body.
   * Tag filter and search are combined (AND logic — both must match).
   */
  getFilteredNotes: () => Note[];

  /**
   * getTodayNotes — returns only notes created today, newest first.
   * Used by the Home screen for the swipeable card stack.
   */
  getTodayNotes: () => Note[];

  /**
   * getNoteById — finds a single note by its id.
   * Returns undefined if not found (e.g. after deletion).
   */
  getNoteById: (id: string) => Note | undefined;
}

// ---------------------------------------------------------------------------
// Store creation
// ---------------------------------------------------------------------------

export const useNotesStore = create<NotesState>()((set, get) => ({
  // ---- Initial state ----

  // Load persisted notes synchronously from MMKV on store creation.
  // On first launch this returns [] (no data yet).
  notes: loadNotes(),

  // UI state — not persisted (resets on every app launch, which is fine)
  activeTag: 'all',
  searchQuery: '',

  // ---- Actions ----

  addNote: ({ title, body, tag }) => {
    const newNote = createNote({ id: generateId(), title, body, tag });

    // Prepend so the new note is first (newest-first order)
    const notes = [newNote, ...get().notes];

    // Persist before updating state so data is safe even if the app crashes
    saveNotes(notes);
    set({ notes });

    // DEBUG: console.debug('[notesStore] addNote:', newNote.id, title);
    return newNote;
  },

  updateNote: (id, changes) => {
    const notes = get().notes.map((note) => {
      if (note.id !== id) return note;

      // Merge changes and refresh the updatedAt timestamp
      return {
        ...note,
        ...changes,
        updatedAt: new Date().toISOString(),
      };
    });

    saveNotes(notes);
    set({ notes });
    // DEBUG: console.debug('[notesStore] updateNote:', id, changes);
  },

  deleteNote: (id) => {
    const notes = get().notes.filter((note) => note.id !== id);
    saveNotes(notes);
    set({ notes });
    // DEBUG: console.debug('[notesStore] deleteNote:', id);
  },

  setActiveTag: (tag) => set({ activeTag: tag }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  // ---- Selectors ----

  getFilteredNotes: () => {
    const { notes, activeTag, searchQuery } = get();

    let filtered = notes; // notes is already newest-first from addNote

    // Apply tag filter — 'all' means no filtering
    if (activeTag !== 'all') {
      filtered = filtered.filter((note) => note.tag === activeTag);
    }

    // Apply search query — case-insensitive, title OR body match
    const trimmed = searchQuery.trim().toLowerCase();
    if (trimmed) {
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(trimmed) ||
          note.body.toLowerCase().includes(trimmed)
      );
    }

    return filtered;
  },

  getTodayNotes: () => {
    // Filter to notes created today using the isToday date helper
    return get().notes.filter((note) => isToday(note.createdAt));
  },

  getNoteById: (id) => {
    return get().notes.find((note) => note.id === id);
  },
}));
