/**
 * app/note-detail.tsx
 *
 * Note Detail / Editor screen.
 *
 * Displays a single note's full content and allows inline editing:
 *   - Title: single-line TextInput
 *   - Body: multi-line TextInput that grows with content
 *   - Tag selector: row of 4 tag chip buttons
 *   - Timestamp: shows when the note was last updated
 *   - Delete button: removes the note and navigates back
 *
 * Auto-save behaviour:
 *   The note is saved automatically via a navigation 'beforeRemove' listener.
 *   When the user presses Back (hardware back or swipe gesture), changes are
 *   written to the store before the screen unmounts. No "Save" button needed.
 *
 * Empty title handling:
 *   If the title is blank when navigating away, we still save (the store
 *   treats empty titles as valid). The note will show "Untitled" on cards.
 *
 * DEBUG TIP: If changes don't persist after pressing back, verify that the
 *   'beforeRemove' listener is registering correctly. Log 'saving note' inside
 *   the handler to confirm it fires.
 *
 * DEBUG TIP: If noteId is undefined, it means the calling screen didn't pass
 *   params correctly to navigation.navigate('NoteDetail', { noteId: ... }).
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TagChip } from '../components/TagChip';
import { useNotesStore } from '../store/notesStore';
import { background, ink, accent, tag as tagColors } from '../constants/colors';
import { spacing, radius } from '../constants/spacing';
import { fontSize, fontWeight } from '../constants/typography';
import { formatNoteDate } from '../utils/date';
import type { HomeStackScreenProps } from '../types/navigation';
import type { NoteTag } from '../types';

type Props = HomeStackScreenProps<'NoteDetail'>;

const TAG_OPTIONS: { key: NoteTag; label: string }[] = [
  { key: 'work', label: 'Work' },
  { key: 'reading', label: 'Reading' },
  { key: 'personal', label: 'Personal' },
  { key: 'ideas', label: 'Ideas' },
];

export default function NoteDetailScreen({ route, navigation }: Props) {
  const { noteId } = route.params;

  // Load note from store
  const getNoteById = useNotesStore((s) => s.getNoteById);
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);

  const note = getNoteById(noteId);

  // Local editing state — mirrors the note's current values
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [tag, setTag] = useState<NoteTag>(note?.tag ?? 'ideas');

  // Track whether any change has been made to avoid unnecessary saves
  const [isDirty, setIsDirty] = useState(false);

  // If note was deleted while screen is open, navigate back
  useEffect(() => {
    if (!note) {
      navigation.goBack();
    }
  }, [note]);

  // Mark as dirty whenever the user edits anything
  useEffect(() => {
    if (note) {
      const changed =
        title !== note.title || body !== note.body || tag !== note.tag;
      setIsDirty(changed);
    }
  }, [title, body, tag]);

  /**
   * Auto-save on back navigation.
   * The 'beforeRemove' event fires before the screen is removed from the stack,
   * giving us a window to persist changes.
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (isDirty && note) {
        // DEBUG: console.debug('[NoteDetail] auto-saving note', noteId);
        updateNote(noteId, { title, body, tag });
      }
    });

    return unsubscribe;
  }, [navigation, isDirty, title, body, tag, noteId, note]);

  /**
   * Set up the header back button — we use the default React Navigation back
   * button and rely on beforeRemove for auto-save. No custom header needed.
   */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false, // Our screen has its own header
    });
  }, [navigation]);

  const handleDelete = () => {
    Alert.alert('Delete Note', 'This note will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteNote(noteId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!note) {
    // Note not found — should navigate back via useEffect above
    return null;
  }

  const updatedLabel = isDirty ? 'Unsaved changes' : `Updated ${formatNoteDate(note.updatedAt)}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Custom header row ── */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="note-detail-back"
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        {/* Delete button */}
        <TouchableOpacity
          testID="note-detail-delete"
          onPress={handleDelete}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Tag selector ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagRow}
          style={styles.tagScroll}
        >
          {TAG_OPTIONS.map(({ key, label }) => (
            <TagChip
              key={key}
              testID={`detail-tag-${key}`}
              label={label}
              tag={key}
              isActive={tag === key}
              onPress={() => {
                setTag(key);
                setIsDirty(true);
              }}
            />
          ))}
        </ScrollView>

        {/* ── Editable title ── */}
        <TextInput
          testID="note-detail-title-input"
          style={styles.titleInput}
          value={title}
          onChangeText={(t) => { setTitle(t); setIsDirty(true); }}
          placeholder="Note title"
          placeholderTextColor={ink.disabled}
          multiline={false}
          returnKeyType="next"
          blurOnSubmit={false}
          maxLength={120}
        />

        {/* ── Timestamp / dirty indicator ── */}
        <Text style={styles.timestamp} testID="note-detail-timestamp">
          {updatedLabel}
        </Text>

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Editable body ── */}
        <TextInput
          testID="note-detail-body-input"
          style={styles.bodyInput}
          value={body}
          onChangeText={(t) => { setBody(t); setIsDirty(true); }}
          placeholder="Start writing…"
          placeholderTextColor={ink.disabled}
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
          maxLength={10000}
        />

        {/* ── AI Summary (voice notes only) ── */}
        {/* Only shown when summary is non-null — manual notes always have null. */}
        {note.summary ? (
          <View style={styles.summaryCard} testID="note-detail-summary-card">
            <Text style={styles.summaryLabel}>AI SUMMARY</Text>
            <Text style={styles.summaryText} testID="note-detail-summary-text">
              {note.summary}
            </Text>
          </View>
        ) : null}
      </ScrollView>
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
    paddingVertical: spacing.md,
  },

  backButton: {
    paddingVertical: spacing.xs,
  },

  backText: {
    fontSize: fontSize.body,
    color: accent.primary,
    fontWeight: fontWeight.medium,
  },

  deleteText: {
    fontSize: fontSize.sm,
    color: '#EF4444',
    fontWeight: fontWeight.medium,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: spacing.screenH,
    paddingBottom: spacing.giant,
  },

  tagScroll: {
    marginBottom: spacing.lg,
  },

  tagRow: {
    paddingVertical: spacing.xs,
  },

  titleInput: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: ink.primary,
    padding: 0,
    marginBottom: spacing.sm,
    lineHeight: 34,
  },

  timestamp: {
    fontSize: fontSize.xs,
    color: ink.tertiary,
    marginBottom: spacing.md,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: spacing.lg,
  },

  bodyInput: {
    fontSize: fontSize.body,
    color: ink.secondary,
    padding: 0,
    lineHeight: 24,
    minHeight: 200,
  },

  // ── AI summary card (voice notes only) ──────────────────────────────────

  summaryCard: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: 'rgba(240, 180, 41, 0.10)',
    borderRadius: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#E8B820',
  },

  summaryLabel: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: '#8B6914',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },

  summaryText: {
    fontSize: fontSize.sm,
    color: ink.secondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
