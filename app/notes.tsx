/**
 * app/notes.tsx
 *
 * Notes screen — the full notes library.
 *
 * Layout:
 *   - Header: "Notes" title + avatar
 *   - Search bar — filters notes in real time by title or body
 *   - Tag filter chips — "All", "Work", "Reading", "Personal", "Ideas"
 *   - 2-column grid of NoteGridCards (FlatList, numColumns=2)
 *   - Empty state when no notes match the active filter + search
 *   - Action row: FAB (left) + RecordButton (right), floating above the grid
 *
 * Data flow:
 *   - Notes come from useNotesStore via getFilteredNotes()
 *   - activeTag and searchQuery are store state (persistent during session)
 *   - Tapping a grid card navigates to Note Detail
 *   - FAB opens NoteCreateSheet
 *
 * Search behaviour:
 *   - Case-insensitive, matches title OR body
 *   - Filters in real time as user types (setSearchQuery updates store)
 *   - Tag filter and search are combined with AND logic
 *
 * Grid layout:
 *   - FlatList with numColumns=2
 *   - NoteGridCard has flex:1 so cards fill equal halves of each row
 *   - contentContainerPadding accounts for the floating action row height
 *
 * DEBUG TIP: If the grid shows only 1 column, check that FlatList has
 * numColumns={2} and that NoteGridCard has flex: 1 in its style.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteGridCard }          from '../components/NoteGridCard';
import { TagChip }               from '../components/TagChip';
import { FAB }                   from '../components/FAB';
import { RecordButton }          from '../components/RecordButton';
import { UserAvatar }            from '../components/UserAvatar';
import { NoteCreateSheet }       from '../components/NoteCreateSheet';
import { VoiceProcessingSheet }  from '../components/VoiceProcessingSheet';
import { useNotesStore }         from '../store/notesStore';
import { useVoiceRecorder }      from '../hooks/useVoiceRecorder';
import { background, ink, glass } from '../constants/colors';
import { spacing, radius }       from '../constants/spacing';
import { fontSize, fontWeight }  from '../constants/typography';
import type { NotesStackScreenProps } from '../types/navigation';
import type { Note, NoteTag }    from '../types';

type Props = NotesStackScreenProps<'NotesScreen'>;

/** All tag filter options — 'all' is the "no filter" option */
const FILTER_OPTIONS: { key: NoteTag | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'work', label: 'Work' },
  { key: 'reading', label: 'Reading' },
  { key: 'personal', label: 'Personal' },
  { key: 'ideas', label: 'Ideas' },
];

export default function NotesScreen({ navigation }: Props) {
  // Store state and actions
  const activeTag = useNotesStore((s) => s.activeTag);
  const searchQuery = useNotesStore((s) => s.searchQuery);
  const setActiveTag = useNotesStore((s) => s.setActiveTag);
  const setSearchQuery = useNotesStore((s) => s.setSearchQuery);
  const addNote = useNotesStore((s) => s.addNote);
  const getFilteredNotes = useNotesStore((s) => s.getFilteredNotes);

  // Derive filtered notes (computed on every render when store changes)
  const filteredNotes = getFilteredNotes();

  const deleteNote = useNotesStore((s) => s.deleteNote);

  // ── Voice recorder ───────────────────────────────────────────────────────
  const {
    state: voiceState,
    result: voiceResult,
    startRecording,
    stopRecording,
    reset: resetVoice,
  } = useVoiceRecorder();

  // Bottom sheet visibility
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showVoiceSheet, setShowVoiceSheet]   = useState(false);
  const [lastVoiceNoteId, setLastVoiceNoteId] = useState<string | null>(null);
  const [sheetResult, setSheetResult]         = useState<typeof voiceResult>(null);

  // ── Voice result handler ─────────────────────────────────────────────────
  // Notes screen always creates a note, regardless of Gemini's routing decision.
  // If Gemini routes as 'todo', we still save it as a note here (context is the
  // Notes screen — the user likely expects a note to be created from this screen).
  useEffect(() => {
    if (!voiceResult) return;

    const note = addNote({
      title:   voiceResult.title,
      body:    voiceResult.body ?? voiceResult.transcript,
      tag:     voiceResult.tag ?? 'ideas',
      summary: voiceResult.summary,
    });
    setLastVoiceNoteId(note.id);
    setSheetResult(voiceResult);
    setShowVoiceSheet(true);
    resetVoice();
    // DEBUG: console.debug('[notes] voice note saved:', note.id, voiceResult.title);
  }, [voiceResult]);

  const handleVoiceUndo = () => {
    if (lastVoiceNoteId) deleteNote(lastVoiceNoteId);
    setShowVoiceSheet(false);
    setLastVoiceNoteId(null);
    setSheetResult(null);
  };

  const handleVoiceDismiss = () => {
    setShowVoiceSheet(false);
    setLastVoiceNoteId(null);
    setSheetResult(null);
  };

  // Navigate to Note Detail when a grid card is tapped
  const handleCardPress = (note: Note) => {
    navigation.navigate('NoteDetail', { noteId: note.id });
  };

  // Save note from the create sheet
  const handleSaveNote = (data: { title: string; body: string; tag: NoteTag }) => {
    addNote(data);
  };

  const renderEmptyState = () => (
    <View testID="notes-empty-state" style={styles.emptyState}>
      <Text style={styles.emptyTitle}>
        {searchQuery.trim() || activeTag !== 'all'
          ? 'No notes match your filter'
          : 'No notes yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery.trim() || activeTag !== 'all'
          ? 'Try a different tag or search term'
          : 'Tap + to create your first note'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Notes</Text>
        <UserAvatar />
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          testID="notes-search-input"
          style={styles.searchInput}
          placeholder="Search notes…"
          placeholderTextColor={ink.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* ── Tag filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {FILTER_OPTIONS.map(({ key, label }) => (
          <TagChip
            key={key}
            testID={`notes-filter-${key}`}
            label={label}
            tag={key === 'all' ? undefined : (key as NoteTag)}
            isActive={activeTag === key}
            onPress={() => setActiveTag(key)}
          />
        ))}
      </ScrollView>

      {/* ── Notes grid ── */}
      <FlatList
        testID="notes-grid"
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={[
          styles.gridContent,
          filteredNotes.length === 0 && styles.gridContentEmpty,
        ]}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
          <NoteGridCard
            note={item}
            onPress={() => handleCardPress(item)}
          />
        )}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* ── Floating action row ── */}
      <View style={styles.actionRow}>
        <FAB
          testID="notes-fab"
          onPress={() => setShowCreateSheet(true)}
        />
        <RecordButton
          testID="notes-record-button"
          state={voiceState}
          onPressIn={startRecording}
          onPressOut={stopRecording}
        />
      </View>

      {/* ── Create note sheet ── */}
      <NoteCreateSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onSave={handleSaveNote}
      />

      {/* ── Voice confirmation sheet ── */}
      <VoiceProcessingSheet
        visible={showVoiceSheet}
        result={sheetResult}
        onDismiss={handleVoiceDismiss}
        onUndo={handleVoiceUndo}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.primary,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },

  screenTitle: {
    fontSize: fontSize.screenTitle,
    fontWeight: fontWeight.bold,
    color: ink.primary,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.screenH,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: glass.surface,
    borderRadius: radius.search,
    borderWidth: 1,
    borderColor: glass.border,
  },

  searchIcon: {
    fontSize: 16,
    color: ink.tertiary,
    marginRight: spacing.sm,
  },

  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    color: ink.primary,
    padding: 0,
  },

  chipScroll: {
    maxHeight: 42,
    marginBottom: spacing.md,
  },

  chipRow: {
    paddingHorizontal: spacing.screenH,
    alignItems: 'center',
  },

  gridContent: {
    paddingHorizontal: spacing.screenH - spacing.cardGap / 2,
    paddingBottom: spacing.fabSize + spacing.xxl,
  },

  gridContentEmpty: {
    flex: 1,
  },

  columnWrapper: {
    justifyContent: 'flex-start',
  },

  /** Floating action row — sits over the bottom of the grid */
  actionRow: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.screenH,
    right: spacing.screenH,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.giant,
  },

  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: ink.secondary,
    marginBottom: spacing.xs,
  },

  emptySubtitle: {
    fontSize: fontSize.sm,
    color: ink.tertiary,
    textAlign: 'center',
  },
});
