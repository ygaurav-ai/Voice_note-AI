/**
 * components/NoteCreateSheet.tsx
 *
 * Bottom sheet for creating a new note.
 *
 * Triggered by tapping the FAB on the Home or Notes screen.
 * Implemented as a React Native Modal with animationType="slide" so it
 * slides up from the bottom — no third-party library needed.
 *
 * Layout (bottom to top):
 *   - Semi-transparent overlay (tapping it dismisses the sheet)
 *   - Sheet container with rounded top corners
 *     - Handle bar at the top
 *     - Title field
 *     - Body field (multiline, expands)
 *     - Tag selector row (4 tag pill buttons)
 *     - Save button
 *
 * Behaviour:
 *   - Save is disabled when the title is empty
 *   - State resets to defaults when the sheet closes
 *   - KeyboardAvoidingView pushes the sheet up when keyboard appears
 *
 * Props:
 *   visible   — controls sheet visibility
 *   onClose   — called when the sheet should close (overlay tap, Save, cancel)
 *   onSave    — called with { title, body, tag } when Save is tapped
 *
 * DEBUG TIP: On Android, if the sheet jumps behind the keyboard, try
 * changing KeyboardAvoidingView behavior from 'height' to 'padding'.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TagChip } from './TagChip';
import { background, ink, accent, glass, tag as tagColors } from '../constants/colors';
import { spacing, radius } from '../constants/spacing';
import { fontSize, fontWeight } from '../constants/typography';
import type { NoteTag } from '../types';

/** The tag options available in the sheet selector */
const TAG_OPTIONS: { key: NoteTag; label: string }[] = [
  { key: 'work', label: 'Work' },
  { key: 'reading', label: 'Reading' },
  { key: 'personal', label: 'Personal' },
  { key: 'ideas', label: 'Ideas' },
];

interface NoteCreateSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Called when the sheet should dismiss without saving */
  onClose: () => void;
  /** Called with the note data when Save is tapped */
  onSave: (data: { title: string; body: string; tag: NoteTag }) => void;
}

export function NoteCreateSheet({ visible, onClose, onSave }: NoteCreateSheetProps) {
  const insets = useSafeAreaInsets();

  // Local form state — reset each time the sheet opens
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState<NoteTag>('ideas');

  // Reset form state whenever the sheet opens
  useEffect(() => {
    if (visible) {
      setTitle('');
      setBody('');
      setTag('ideas');
    }
  }, [visible]);

  const canSave = title.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ title: title.trim(), body: body.trim(), tag });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/*
        KeyboardAvoidingView as root so the sheet lifts when keyboard appears.
        'padding' on iOS, 'height' on Android works best in most cases.
      */}
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Overlay — tap to dismiss */}
        <Pressable
          testID="sheet-overlay"
          style={styles.overlay}
          onPress={onClose}
        />

        {/* Sheet container */}
        <View
          testID="note-create-sheet"
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.xl) },
          ]}
        >
          {/* Handle bar — visual affordance for drag-to-dismiss (Phase 6) */}
          <View style={styles.handle} />

          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>New Note</Text>
            <TouchableOpacity
              testID="sheet-close-button"
              onPress={onClose}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Title input */}
          <TextInput
            testID="note-title-input"
            style={styles.titleInput}
            placeholder="Note title"
            placeholderTextColor={ink.disabled}
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
            autoFocus
            maxLength={120}
          />

          {/* Body input */}
          <TextInput
            testID="note-body-input"
            style={styles.bodyInput}
            placeholder="Start writing..."
            placeholderTextColor={ink.disabled}
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
            maxLength={5000}
          />

          {/* Tag selector */}
          <Text style={styles.sectionLabel}>Tag</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagRow}
            contentContainerStyle={styles.tagRowContent}
          >
            {TAG_OPTIONS.map(({ key, label }) => (
              <TagChip
                key={key}
                testID={`sheet-tag-${key}`}
                label={label}
                tag={key}
                isActive={tag === key}
                onPress={() => setTag(key)}
              />
            ))}
          </ScrollView>

          {/* Save button */}
          <TouchableOpacity
            testID="note-save-button"
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            activeOpacity={0.85}
          >
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
              Save Note
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /** Full-screen root — transparent so overlay shows through */
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  /** Semi-transparent dark overlay behind the sheet */
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  /** The sheet itself — anchored to the bottom */
  sheet: {
    backgroundColor: background.secondary,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },

  /** Visual drag handle */
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: ink.disabled,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },

  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: ink.primary,
  },

  closeText: {
    fontSize: fontSize.body,
    color: ink.tertiary,
  },

  titleInput: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: ink.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },

  bodyInput: {
    fontSize: fontSize.body,
    color: ink.secondary,
    minHeight: 80,
    maxHeight: 140,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },

  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: ink.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },

  tagRow: {
    marginBottom: spacing.xl,
  },

  tagRowContent: {
    paddingVertical: spacing.xs,
  },

  saveButton: {
    backgroundColor: accent.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },

  saveButtonDisabled: {
    backgroundColor: 'rgba(240, 180, 41, 0.35)',
  },

  saveText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },

  saveTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
});
