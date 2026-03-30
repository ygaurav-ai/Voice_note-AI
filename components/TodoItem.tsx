/**
 * components/TodoItem.tsx
 *
 * A single row in the Todo screen's task list.
 *
 * Layout (left to right):
 *   [Checkbox]  [Title + optional due date]  [Priority dot]
 *
 * Completion state:
 *   - Checkbox fills amber with a dark ✓ checkmark
 *   - Title gets a strikethrough and fades to ink.disabled colour
 *   - Entire row animates to 45 % opacity via Reanimated withTiming
 *   - Tapping the checkbox again reverses all of the above
 *
 * Props:
 *   todo     — the Todo object to display
 *   onToggle — called when the checkbox is pressed (caller triggers store update)
 *   onDelete — called when the delete button is pressed (shown on long press or
 *              as a swipe-to-delete affordance — currently a simple button for
 *              Phase 4; Phase 6 will add swipe gesture support)
 *   testID   — optional override for the root container testID
 *
 * Animation:
 *   Uses react-native-reanimated withTiming for smooth opacity transition.
 *   Phase 6 will add a spring-based slide for the reorder effect.
 *
 * DEBUG TIP: If the opacity animation doesn't run, confirm react-native-reanimated
 * plugin is last in babel.config.js and the module is installed correctly.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { ink, accent, priority as priorityColors, chrome, glass } from '../constants/colors';
import { spacing, radius } from '../constants/spacing';
import { fontSize, fontWeight } from '../constants/typography';
import { formatTodoDate } from '../utils/date';
import type { Todo } from '../types';

interface TodoItemProps {
  /** The todo task to display */
  todo: Todo;
  /** Called when the checkbox is tapped — parent handles store toggle */
  onToggle: () => void;
  /** Called when the delete affordance is tapped */
  onDelete: () => void;
  /** Optional testID override for the root row element */
  testID?: string;
}

export function TodoItem({ todo, onToggle, onDelete, testID }: TodoItemProps) {
  // Animated opacity — 1.0 for active tasks, 0.45 for completed ones
  // Initialised directly from todo.completed so pre-existing completed todos
  // start at the right opacity without an animation on mount.
  const opacity = useSharedValue(todo.completed ? 0.45 : 1.0);

  // Re-animate whenever todo.completed changes (i.e. after a toggle)
  React.useEffect(() => {
    opacity.value = withTiming(todo.completed ? 0.45 : 1.0, { duration: 200 });
  }, [todo.completed]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Priority dot colour — red / amber / green
  const dotColor = priorityColors[todo.priority].dot;

  const formattedDue = formatTodoDate(todo.dueDate);

  return (
    <Animated.View
      testID={testID ?? `todo-item-${todo.id}`}
      style={[styles.row, animatedStyle]}
    >
      {/* ── Glass background — frosted on iOS, fallback on Android ──
           absoluteFill so it covers the whole row without affecting layout. */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={50}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidBg]} />
      )}

      {/* ── Checkbox ── */}
      <TouchableOpacity
        testID={`todo-checkbox-${todo.id}`}
        onPress={onToggle}
        activeOpacity={0.7}
        style={[
          styles.checkbox,
          todo.completed ? styles.checkboxChecked : styles.checkboxEmpty,
        ]}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: todo.completed }}
        accessibilityLabel={`Mark "${todo.title}" ${todo.completed ? 'incomplete' : 'complete'}`}
      >
        {todo.completed && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </TouchableOpacity>

      {/* ── Title + due date ── */}
      <View style={styles.content}>
        <Text
          testID={`todo-title-${todo.id}`}
          style={[
            styles.title,
            todo.completed && styles.titleCompleted,
          ]}
          numberOfLines={2}
        >
          {todo.title}
        </Text>

        {/* Due date — only rendered when present */}
        {formattedDue ? (
          <Text
            testID={`todo-due-${todo.id}`}
            style={[
              styles.dueDate,
              // Highlight overdue tasks in a warmer red-ish tone
              formattedDue.startsWith('Overdue') && styles.dueDateOverdue,
            ]}
          >
            {formattedDue}
          </Text>
        ) : null}
      </View>

      {/* ── Priority dot ── */}
      <View
        testID={`todo-priority-${todo.id}`}
        style={[styles.priorityDot, { backgroundColor: dotColor }]}
      />

      {/* ── Delete button — subtle tap target on the far right ── */}
      <TouchableOpacity
        testID={`todo-delete-${todo.id}`}
        onPress={onDelete}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        style={styles.deleteButton}
        accessibilityLabel={`Delete "${todo.title}"`}
        accessibilityRole="button"
      >
        <Text style={styles.deleteText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const CHECKBOX_SIZE = 22;
const DOT_SIZE = 10;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.screenH,
    // Subtle bottom border as a section divider
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    // overflow: hidden clips the BlurView to the row bounds
    overflow: 'hidden',
  },

  /** Android fallback for BlurView — semi-transparent warm surface */
  androidBg: {
    backgroundColor: glass.fallback,
  },

  // ── Checkbox ──
  checkbox: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: CHECKBOX_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },

  checkboxEmpty: {
    borderWidth: 2,
    borderColor: chrome.checkboxEmpty,
    backgroundColor: 'transparent',
  },

  checkboxChecked: {
    backgroundColor: chrome.checkboxFilled, // amber fill
    borderWidth: 0,
  },

  checkmark: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    color: '#1A1612', // dark mark on amber background
    lineHeight: 16,
  },

  // ── Content ──
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },

  title: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: ink.primary,
    lineHeight: 22,
  },

  titleCompleted: {
    // Strikethrough + muted colour for completed tasks
    textDecorationLine: 'line-through',
    color: ink.disabled,
  },

  dueDate: {
    fontSize: fontSize.xs,
    color: ink.tertiary,
    marginTop: 2,
  },

  dueDateOverdue: {
    // Overdue tasks are highlighted in a subtle warm red
    color: '#EF4444',
  },

  // ── Priority dot ──
  priorityDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginRight: spacing.sm,
    flexShrink: 0,
  },

  // ── Delete button ──
  deleteButton: {
    padding: spacing.xs,
  },

  deleteText: {
    fontSize: 20,
    color: ink.disabled,
    lineHeight: 22,
  },
});
