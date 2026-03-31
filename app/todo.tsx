/**
 * app/todo.tsx
 *
 * Todo screen — the prioritised task list.
 *
 * Layout (top to bottom):
 *   - Header: "Todo" title + avatar
 *   - Subtitle: "X of Y remaining" — active count / total count
 *   - Active todos section (SectionList first section)
 *   - Completed todos section (SectionList second section, only shown if any)
 *   - Action row: FAB (left) + RecordButton (right) — floating above the list
 *
 * Data flow:
 *   - Todos come from useTodoStore
 *   - Active and completed todos are separate sorted slices via store selectors
 *   - Tapping a checkbox calls toggleComplete — the todo reorders itself
 *   - FAB opens TodoCreateSheet
 *   - Delete button on each row calls deleteTodo
 *
 * Completion animation:
 *   TodoItem handles the 45 % opacity fade via Reanimated.
 *   The list re-renders with the todo moved to the completed section when the
 *   store updates — Phase 6 will add a smooth slide-to-bottom animation.
 *
 * Section headers:
 *   "Tasks" and "Completed" labels above each group.
 *   The completed section header is only rendered when completedTodos.length > 0.
 *
 * Empty state:
 *   Shown in the active section when no tasks exist yet.
 *
 * DEBUG TIP: If tapping a checkbox doesn't move the row, check that
 * useTodoStore.getActiveTodos() and getCompletedTodos() are reactive
 * (called on every render, not memoised stale closures).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TodoItem }              from '../components/TodoItem';
import { FAB }                  from '../components/FAB';
import { RecordButton }         from '../components/RecordButton';
import { UserAvatar }           from '../components/UserAvatar';
import { TodoCreateSheet }      from '../components/TodoCreateSheet';
import { VoiceProcessingSheet } from '../components/VoiceProcessingSheet';
import { useTodoStore }         from '../store/todoStore';
import { useVoiceRecorder }     from '../hooks/useVoiceRecorder';
import { scheduleReminder }     from '../utils/notifications';
import { background, ink, chrome } from '../constants/colors';
import { spacing }              from '../constants/spacing';
import { fontSize, fontWeight } from '../constants/typography';
import type { TodoStackScreenProps } from '../types/navigation';
import type { Todo, TodoPriority }   from '../types';

type Props = TodoStackScreenProps<'TodoScreen'>;

export default function TodoScreen({ navigation }: Props) {
  // ── Store ──
  const addTodo        = useTodoStore((s) => s.addTodo);
  const toggleComplete = useTodoStore((s) => s.toggleComplete);
  const deleteTodo     = useTodoStore((s) => s.deleteTodo);

  // Subscribe to the raw todos array — Zustand returns the same array
  // reference until a mutation creates a new one, so useSyncExternalStore
  // can safely compare snapshots without triggering an infinite loop.
  //
  // WHY NOT call getActiveTodos() inside the selector:
  //   useTodoStore((s) => s.getActiveTodos()) creates a new array on every
  //   render because the function always allocates a fresh filtered array.
  //   React 18's useSyncExternalStore then sees a changed snapshot every
  //   render and triggers a re-render loop.
  //
  //   Safe pattern: select the stable `todos` array, then derive slices
  //   from it inline. The derivation runs on every render but does NOT
  //   create snapshot instability.
  const todos = useTodoStore((s) => s.todos);
  const activeTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos
    .filter((t) => t.completed)
    .sort((a, b) => {
      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bTime - aTime; // most recently completed first
    });

  // ── Voice recorder ──────────────────────────────────────────────────────
  const {
    state: voiceState,
    result: voiceResult,
    startRecording,
    stopRecording,
    reset: resetVoice,
  } = useVoiceRecorder();

  // ── Bottom sheet visibility ──
  const [showCreateSheet, setShowCreateSheet]   = useState(false);
  const [showVoiceSheet, setShowVoiceSheet]     = useState(false);
  const [lastVoiceTodoId, setLastVoiceTodoId]   = useState<string | null>(null);
  const [sheetResult, setSheetResult]           = useState<typeof voiceResult>(null);

  // ── Voice result handler ─────────────────────────────────────────────────
  // Todo screen always creates a todo, regardless of Gemini's routing decision.
  useEffect(() => {
    if (!voiceResult) return;

    const todo = addTodo({
      title:    voiceResult.title,
      priority: voiceResult.priority ?? 'medium',
      summary:  voiceResult.summary,
    });
    setLastVoiceTodoId(todo.id);
    setSheetResult(voiceResult);
    setShowVoiceSheet(true);
    resetVoice();
    // DEBUG: console.debug('[todo] voice todo saved:', todo.id, voiceResult.title);
  }, [voiceResult]);

  const handleVoiceUndo = () => {
    if (lastVoiceTodoId) deleteTodo(lastVoiceTodoId);
    setShowVoiceSheet(false);
    setLastVoiceTodoId(null);
    setSheetResult(null);
  };

  const handleVoiceDismiss = () => {
    setShowVoiceSheet(false);
    setLastVoiceTodoId(null);
    setSheetResult(null);
  };

  // ── Derived counts for the "X of Y remaining" subtitle ──
  const totalCount = activeTodos.length + completedTodos.length;
  const remainingLabel =
    totalCount === 0
      ? 'No tasks yet'
      : `${activeTodos.length} of ${totalCount} remaining`;

  // ── Save new todo from the create sheet ──
  // Async because we may need to schedule a notification before creating
  // the store entry (so we can store the notificationId on the todo).
  const handleSave = async (data: {
    title: string;
    priority: TodoPriority;
    dueDate: string | null;
    reminderSet: boolean;
  }) => {
    let notificationId: string | null = null;

    // Only schedule when both reminder toggle is on AND a due date is set
    if (data.reminderSet && data.dueDate) {
      notificationId = await scheduleReminder(data.title, data.dueDate);
      // DEBUG: console.debug('[todo] scheduled reminder:', notificationId);
    }

    addTodo({ ...data, notificationId });
  };

  // ── SectionList data ──
  // We always include the active section. The completed section is only
  // included when there are completed todos to avoid an empty header.
  // SectionList only shows ListEmptyComponent when sections is an empty array —
  // not when sections have empty data. So when there are no todos at all,
  // pass an empty sections array to trigger the empty state.
  type SectionData = { title: string; data: Todo[]; testID: string };
  const sections: SectionData[] =
    totalCount === 0
      ? []
      : [
          { title: 'Tasks', data: activeTodos, testID: 'todo-section-active' },
          ...(completedTodos.length > 0
            ? [{ title: 'Completed', data: completedTodos, testID: 'todo-section-completed' }]
            : []),
        ];

  // ── Render helpers ──

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View
      testID={section.testID}
      style={styles.sectionHeader}
    >
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: Todo }) => (
    <TodoItem
      todo={item}
      onToggle={() => toggleComplete(item.id)}
      onDelete={() => deleteTodo(item.id)}
    />
  );

  const renderEmptyState = () => (
    <View testID="todo-empty-state" style={styles.emptyState}>
      <Text style={styles.emptyIcon}>✓</Text>
      <Text style={styles.emptyTitle}>All clear!</Text>
      <Text style={styles.emptySubtitle}>
        Tap + to add your first task
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.screenTitle} testID="todo-screen-title">Todo</Text>
        <UserAvatar />
      </View>

      {/* ── Remaining count subtitle ── */}
      <Text style={styles.remainingCount} testID="todo-remaining-count">
        {remainingLabel}
      </Text>

      {/* ── Task list ── */}
      <SectionList
        testID="todo-list"
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        // Empty state — shown inside the active section when no tasks exist
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          totalCount === 0 && styles.listContentEmpty,
        ]}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />

      {/* ── Floating action row ── */}
      <View style={styles.actionRow}>
        <FAB
          testID="todo-fab"
          onPress={() => setShowCreateSheet(true)}
        />
        <RecordButton
          testID="todo-record-button"
          state={voiceState}
          onPressIn={startRecording}
          onPressOut={stopRecording}
        />
      </View>

      {/* ── Create todo sheet ── */}
      <TodoCreateSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onSave={handleSave}
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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

  remainingCount: {
    fontSize: fontSize.sm,
    color: ink.secondary,
    paddingHorizontal: spacing.screenH,
    marginBottom: spacing.sm,
  },

  // ── Section headers ──
  sectionHeader: {
    paddingHorizontal: spacing.screenH,
    paddingVertical: spacing.sm,
    backgroundColor: background.primary,
  },

  sectionHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: ink.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ── List ──
  listContent: {
    paddingBottom: spacing.fabSize + spacing.xxl,
  },

  listContentEmpty: {
    flex: 1,
  },

  // ── Floating action row — same pattern as Home and Notes screens ──
  actionRow: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.screenH,
    right: spacing.screenH,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // ── Empty state ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.giant,
  },

  emptyIcon: {
    fontSize: 28,
    marginBottom: spacing.md,
    color: ink.disabled,
  },

  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: ink.secondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },

  emptySubtitle: {
    fontSize: fontSize.sm,
    color: ink.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
