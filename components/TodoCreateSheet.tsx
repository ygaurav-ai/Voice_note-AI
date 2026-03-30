/**
 * components/TodoCreateSheet.tsx
 *
 * Bottom sheet for creating a new todo.
 *
 * Triggered by tapping the FAB (+) on the Todo screen.
 * Implemented as a Modal with animationType="slide" — same pattern as
 * NoteCreateSheet so the UX is consistent across both creation flows.
 *
 * Layout (bottom to top inside the sheet):
 *   - Handle bar
 *   - Sheet header: "New Task" title + close (✕) button
 *   - Title input
 *   - Priority selector: High / Medium / Low pill buttons
 *   - Due date quick-select: None / Today / Tomorrow / In 3 days / Next week
 *   - Reminder toggle (only shown when a due date is selected)
 *   - Save button (disabled when title is empty)
 *
 * Due date picker:
 *   No native date-picker library is required. Instead, we offer five quick
 *   options covering the most common use cases. This approach is also
 *   friendlier on small screens.
 *
 * Behaviour:
 *   - Save is disabled when title is empty
 *   - State resets to defaults each time the sheet opens (visible → true)
 *   - KeyboardAvoidingView pushes the sheet up when keyboard appears
 *
 * Props:
 *   visible  — controls sheet visibility
 *   onClose  — called when the sheet should dismiss without saving
 *   onSave   — called with { title, priority, dueDate } when Save is tapped
 *
 * DEBUG TIP: On Android, if the sheet slides behind the keyboard, change
 * KeyboardAvoidingView behavior from 'height' to 'padding'.
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
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { background, ink, accent, glass, priority as priorityColors, chrome } from '../constants/colors';
import { spacing, radius } from '../constants/spacing';
import { fontSize, fontWeight } from '../constants/typography';
import type { TodoPriority } from '../types';

// ---------------------------------------------------------------------------
// Priority options
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS: { key: TodoPriority; label: string }[] = [
  { key: 'high',   label: 'High'   },
  { key: 'medium', label: 'Medium' },
  { key: 'low',    label: 'Low'    },
];

// ---------------------------------------------------------------------------
// Due date quick-select options
// ---------------------------------------------------------------------------

/**
 * Returns an ISO string for midnight (local time) of today + offsetDays.
 * Using local midnight so formatTodoDate()'s day comparison works correctly.
 */
function dueDateFrom(offsetDays: number): string {
  const d = new Date();
  // Set to start of today in local time, then offset
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

const DATE_OPTIONS: { label: string; value: string | null }[] = [
  { label: 'None',       value: null               },
  { label: 'Today',      value: dueDateFrom(0)     },
  { label: 'Tomorrow',   value: dueDateFrom(1)     },
  { label: 'In 3 days',  value: dueDateFrom(3)     },
  { label: 'Next week',  value: dueDateFrom(7)     },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TodoCreateSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Called when the sheet should dismiss without saving */
  onClose: () => void;
  /** Called with new todo data when Save is tapped */
  onSave: (data: {
    title: string;
    priority: TodoPriority;
    dueDate: string | null;
    reminderSet: boolean;
  }) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TodoCreateSheet({ visible, onClose, onSave }: TodoCreateSheetProps) {
  const insets = useSafeAreaInsets();

  // ---- Form state ----
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const [dueDate, setDueDate] = useState<string | null>(null);
  // Reminder toggle — only meaningful when dueDate is set.
  // Auto-clears when dueDate is removed so stale state doesn't leak.
  const [reminderEnabled, setReminderEnabled] = useState(false);

  // Reset form each time the sheet opens
  useEffect(() => {
    if (visible) {
      setTitle('');
      setPriority('medium');
      setDueDate(null);
      setReminderEnabled(false);
    }
  }, [visible]);

  // Clear reminder toggle when due date is removed (selecting "None")
  const handleSetDueDate = (value: string | null) => {
    setDueDate(value);
    if (value === null) setReminderEnabled(false);
  };

  const canSave = title.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ title: title.trim(), priority, dueDate, reminderSet: reminderEnabled });
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
      {/* KeyboardAvoidingView lifts the sheet when the keyboard appears */}
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Overlay — tap to dismiss */}
        <Pressable
          testID="todo-sheet-overlay"
          style={styles.overlay}
          onPress={onClose}
        />

        {/* Sheet container */}
        <View
          testID="todo-create-sheet"
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.xl) },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>New Task</Text>
            <TouchableOpacity
              testID="todo-sheet-close"
              onPress={onClose}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Title input ── */}
          <TextInput
            testID="todo-title-input"
            style={styles.titleInput}
            placeholder="Task title"
            placeholderTextColor={ink.disabled}
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
            autoFocus
            maxLength={200}
          />

          {/* ── Priority selector ── */}
          <Text style={styles.sectionLabel}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITY_OPTIONS.map(({ key, label }) => {
              const isActive = priority === key;
              const dotColor = priorityColors[key].dot;
              return (
                <TouchableOpacity
                  key={key}
                  testID={`todo-priority-${key}`}
                  onPress={() => setPriority(key)}
                  style={[
                    styles.priorityChip,
                    isActive && styles.priorityChipActive,
                    isActive && { borderColor: dotColor },
                  ]}
                  activeOpacity={0.7}
                >
                  {/* Colour dot */}
                  <View style={[styles.chipDot, { backgroundColor: dotColor }]} />
                  <Text
                    style={[
                      styles.priorityChipLabel,
                      isActive && { color: dotColor },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Due date quick-select ── */}
          <Text style={styles.sectionLabel}>Due date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateScroll}
            contentContainerStyle={styles.dateScrollContent}
          >
            {DATE_OPTIONS.map(({ label, value }) => {
              const isActive = dueDate === value;
              return (
                <TouchableOpacity
                  key={label}
                  testID={`todo-date-${label.toLowerCase().replace(/\s/g, '-')}`}
                  onPress={() => handleSetDueDate(value)}
                  style={[
                    styles.dateChip,
                    isActive && styles.dateChipActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dateChipLabel,
                      isActive && styles.dateChipLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Reminder toggle ── Only visible when a due date is selected.
               Allows the user to opt in to a local notification at the due time. */}
          {dueDate !== null && (
            <View style={styles.reminderRow} testID="todo-reminder-row">
              <View style={styles.reminderLabelGroup}>
                {/* Bell icon + label */}
                <Text style={styles.reminderIcon}>🔔</Text>
                <Text style={styles.reminderLabel}>Remind me</Text>
              </View>
              <Switch
                testID="todo-reminder-toggle"
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                // Use the app accent colour for the on-state thumb track
                trackColor={{ false: 'rgba(0,0,0,0.12)', true: 'rgba(240,180,41,0.5)' }}
                thumbColor={reminderEnabled ? '#F0B429' : '#FFFFFF'}
              />
            </View>
          )}

          {/* ── Save button ── */}
          <TouchableOpacity
            testID="todo-save-button"
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            activeOpacity={0.85}
          >
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
              Save Task
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  sheet: {
    backgroundColor: background.secondary,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },

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
    marginBottom: spacing.lg,
  },

  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: ink.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },

  // ── Priority chips ──
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: 'rgba(255,255,255,0.5)',
    gap: spacing.xs,
  },

  priorityChipActive: {
    backgroundColor: 'rgba(255,255,255,0.8)',
  },

  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  priorityChipLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: ink.secondary,
  },

  // ── Due date chips ──
  dateScroll: {
    marginBottom: spacing.xl,
  },

  dateScrollContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },

  dateChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  dateChipActive: {
    backgroundColor: accent.primary,
    borderColor: accent.primary,
  },

  dateChipLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: ink.secondary,
  },

  dateChipLabelActive: {
    color: '#FFFFFF',
  },

  // ── Reminder row ──
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },

  reminderLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  reminderIcon: {
    fontSize: fontSize.body,
  },

  reminderLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: ink.primary,
  },

  // ── Save button ──
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
