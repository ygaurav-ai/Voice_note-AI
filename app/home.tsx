/**
 * app/home.tsx
 *
 * Home screen — redesigned dashboard layout.
 *
 * Layout (top to bottom):
 *   1. Header: date + time-aware greeting on left, user avatar on right
 *   2. ProgressCard: animated progress bar + 4 live stat columns
 *   3. Priority Tasks: top 3 active todos sorted by urgency, inline toggle
 *   4. Recent Notes: 3 most recent notes as horizontal swipeable cards
 *   5. Action row: FAB (left) + RecordButton (right) — pinned to bottom
 *
 * Data flow:
 *   - useTodoStore provides allTodos + toggleComplete action
 *   - useNotesStore provides allNotes + addNote action
 *   - Progress bar animates whenever completedCount / totalCount changes
 *   - Priority tasks re-sort reactively as todos are toggled
 *   - "See all →" buttons navigate to Notes / Todo tabs via tab navigation
 *
 * Animations:
 *   - Progress bar: fill width animates over 600ms ease via Reanimated withTiming
 *   - Note dot indicator: active pill expands 4→12dp over 250ms
 *   - FAB + RecordButton: spring scale on press (Phase 6, unchanged)
 *
 * DEBUG TIP: If the progress bar doesn't animate, confirm that onLayout
 * fires before the useEffect that sets barRatio — the trackWidthSv must
 * be set first so the fill has a non-zero parent width to scale against.
 *
 * DEBUG TIP: If "See all →" navigation throws a type error, the navigation
 * prop is CompositeScreenProps which includes both stack and tab nav — so
 * navigation.navigate('Notes') and navigation.navigate('Todo') are valid.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteCard }        from '../components/NoteCard';
import { TodoItem }        from '../components/TodoItem';
import { FAB }             from '../components/FAB';
import { RecordButton }    from '../components/RecordButton';
import { UserAvatar }      from '../components/UserAvatar';
import { NoteCreateSheet } from '../components/NoteCreateSheet';
import { useNotesStore }   from '../store/notesStore';
import { useTodoStore }    from '../store/todoStore';
import { background, ink } from '../constants/colors';
import { spacing, radius } from '../constants/spacing';
import { fontSize, fontWeight } from '../constants/typography';
import { formatHeaderDate } from '../utils/date';
import type { HomeStackScreenProps } from '../types/navigation';
import type { Note, NoteTag, Todo } from '../types';

type Props = HomeStackScreenProps<'HomeScreen'>;

// ---------------------------------------------------------------------------
// Greeting helpers
// ---------------------------------------------------------------------------

/**
 * Returns a time-aware greeting title and subtitle.
 * Called once per render — the greeting updates naturally on each visit.
 *   Before 12:00  → "Good morning"   / "Here's your day"
 *   12:00–16:59   → "Good afternoon" / "How's it going?"
 *   17:00+        → "Good evening"   / "Wrapping up?"
 */
function getGreeting(): { title: string; subtitle: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { title: 'Good morning',   subtitle: "Here's your day" };
  if (hour < 17) return { title: 'Good afternoon', subtitle: "How's it going?" };
  return             { title: 'Good evening',   subtitle: 'Wrapping up?' };
}

// ---------------------------------------------------------------------------
// Date / urgency helpers (used for stats and priority sorting)
// ---------------------------------------------------------------------------

/** True when dueDate is strictly before today (task is overdue). */
function isOverdue(dueDate: string): boolean {
  const now    = new Date();
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due    = new Date(dueDate);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return dueDay < today;
}

/** True when dueDate falls on today. */
function isDueToday(dueDate: string): boolean {
  const now    = new Date();
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due    = new Date(dueDate);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return dueDay.getTime() === today.getTime();
}

/** True when createdAt is within the last 7 calendar days. */
function isThisWeek(createdAt: string): boolean {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return new Date(createdAt) >= weekAgo;
}

// ---------------------------------------------------------------------------
// Priority sort
// ---------------------------------------------------------------------------

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Sorts active todos for the Priority Tasks section:
 *   1. Overdue tasks first (most critical)
 *   2. Priority: high → medium → low
 *   3. Due date ascending (earliest deadline first)
 *   4. Tasks with no due date fall to the bottom
 */
function sortPriorityTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    // Overdue first
    const aOverdue = a.dueDate && isOverdue(a.dueDate) ? 1 : 0;
    const bOverdue = b.dueDate && isOverdue(b.dueDate) ? 1 : 0;
    if (bOverdue !== aOverdue) return bOverdue - aOverdue;

    // Priority rank
    const aPriority = PRIORITY_RANK[a.priority] ?? 2;
    const bPriority = PRIORITY_RANK[b.priority] ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;

    // Due date ascending; no due date sorts last
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return  1;
    return 0;
  });
}

// ---------------------------------------------------------------------------
// NotesDot — dot indicator for the Recent Notes horizontal list
//
// Spec: inactive 4×4dp rgba(180,170,150,0.4), active 12×4dp pill #E8B820
// Width transitions over 250ms — same technique as the previous AnimatedDot.
// ---------------------------------------------------------------------------
function NotesDot({ isActive }: { isActive: boolean }) {
  // Initialise at the correct width so the first render has no flash
  const width = useSharedValue(isActive ? 12 : 4);

  useEffect(() => {
    width.value = withTiming(isActive ? 12 : 4, { duration: 250 });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <Animated.View
      style={[
        styles.notesDot,
        isActive ? styles.notesDotActive : styles.notesDotInactive,
        animatedStyle,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// ProgressCard
//
// Shows today's todo progress with:
//   - Top row: "TODAY'S PROGRESS" label + "X / Y done" fraction
//   - Animated fill bar (width = ratio * trackWidth, 600ms ease)
//   - Stats row: 4 columns separated by hairline dividers
//
// Receives all counts as props; owns only the animation shared values.
// ---------------------------------------------------------------------------

interface ProgressCardProps {
  completedCount:    number;
  totalCount:        number;
  overdueCount:      number;
  dueTodayCount:     number;
  notesThisWeekCount: number;
}

function ProgressCard({
  completedCount,
  totalCount,
  overdueCount,
  dueTodayCount,
  notesThisWeekCount,
}: ProgressCardProps) {
  // trackWidthSv holds the measured pixel width of the bar track (set via onLayout).
  // barRatio holds the current fill ratio [0, 1] and drives the animated width.
  const trackWidthSv = useSharedValue(0);
  const barRatio     = useSharedValue(0);

  // Animate the bar whenever the completed / total counts change.
  // 600ms ease matches the spec; the bar also smoothly shrinks if a todo
  // is un-checked (though the UI prevents that on the home screen for now).
  useEffect(() => {
    const ratio = totalCount > 0 ? completedCount / totalCount : 0;
    barRatio.value = withTiming(ratio, { duration: 600 });
  }, [completedCount, totalCount]);

  // Fill width = ratio × track width — both are shared values so this runs
  // on the UI thread without causing JS re-renders.
  const barFillStyle = useAnimatedStyle(() => ({
    width: barRatio.value * trackWidthSv.value,
  }));

  return (
    <View style={styles.progressCard}>

      {/* Top row: label left, fraction right */}
      <View style={styles.progressTopRow}>
        <Text style={styles.progressLabel}>TODAY'S PROGRESS</Text>
        <Text style={styles.progressFraction}>
          {completedCount} / {totalCount} done
        </Text>
      </View>

      {/* Animated progress bar track + fill */}
      <View
        style={styles.progressTrack}
        onLayout={(e) => {
          // Capture track width the first time the bar is laid out.
          // Also set barRatio without animation for the initial render
          // so the bar shows the correct position instantly on mount.
          trackWidthSv.value = e.nativeEvent.layout.width;
          barRatio.value = totalCount > 0 ? completedCount / totalCount : 0;
        }}
      >
        <Animated.View style={[styles.progressFill, barFillStyle]} />
      </View>

      {/* Stats row — 4 columns separated by hairline dividers */}
      <View style={styles.statsRow}>
        <StatColumn label="Overdue"    value={overdueCount}        valueColor="#8B1A1A" />
        <View style={styles.statsDivider} />
        <StatColumn label="Due today"  value={dueTodayCount}       valueColor="#8B5A00" />
        <View style={styles.statsDivider} />
        <StatColumn label="This week"  value={notesThisWeekCount}  valueColor="#5A5242" />
        <View style={styles.statsDivider} />
        <StatColumn label="Done"       value={completedCount}      valueColor="#2A5209" />
      </View>

    </View>
  );
}

/** Single stat column: large coloured number above a small uppercase label. */
function StatColumn({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: number;
  valueColor: string;
}) {
  return (
    <View style={styles.statColumn}>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader — shared between Priority Tasks and Recent Notes sections
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity
        onPress={onSeeAll}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`See all ${title.toLowerCase()}`}
      >
        <Text style={styles.seeAll}>See all →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

export default function HomeScreen({ navigation }: Props) {
  const { width: screenWidth } = useWindowDimensions();

  // Card width for recent notes list — full width minus screen margins
  const cardWidth = screenWidth - spacing.screenH * 2;

  // ── Store subscriptions ──────────────────────────────────────────────────

  // Subscribe to the raw todos array so the component re-renders on every
  // toggle — this keeps the progress bar and stats in sync without manual
  // invalidation. toggleComplete is the single action used in this screen.
  const allTodos       = useTodoStore((s) => s.todos);
  const toggleComplete = useTodoStore((s) => s.toggleComplete);

  // notes array (newest-first from the store) and addNote for the create sheet
  const allNotes = useNotesStore((s) => s.notes);
  const addNote  = useNotesStore((s) => s.addNote);

  // ── Local UI state ────────────────────────────────────────────────────────

  const [showCreateSheet, setShowCreateSheet] = useState(false);

  // Tracks which recent note card is visible for the dot indicator
  const [activeNoteIndex, setActiveNoteIndex] = useState(0);

  // Stable viewability config ref — must not be recreated on each render
  const notesViewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const onNotesViewableChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveNoteIndex(viewableItems[0].index);
      }
    },
    []
  );

  // ── Derived data (recomputed on every render when store changes) ──────────

  const greeting = getGreeting();

  const activeTodos    = allTodos.filter((t) => !t.completed);
  const completedTodos = allTodos.filter((t) =>  t.completed);
  const totalCount     = allTodos.length;
  const completedCount = completedTodos.length;

  // Progress card stats
  const overdueCount       = activeTodos.filter((t) => t.dueDate && isOverdue(t.dueDate)).length;
  const dueTodayCount      = activeTodos.filter((t) => t.dueDate && isDueToday(t.dueDate)).length;
  const notesThisWeekCount = allNotes.filter((n) => isThisWeek(n.createdAt)).length;

  // Top 3 priority tasks — sorted by urgency, active only
  const priorityTodos = sortPriorityTodos(activeTodos).slice(0, 3);

  // 3 most recent notes — store is newest-first so a plain slice works
  const recentNotes = allNotes.slice(0, 3);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSaveNote = (data: { title: string; body: string; tag: NoteTag }) => {
    addNote(data);
  };

  const handleCardPress = (note: Note) => {
    navigation.navigate('NoteDetail', { noteId: note.id });
  };

  // Tab navigation — we're inside the HomeStack navigator which sits inside
  // the root Tab navigator. getParent() returns the tab navigator so we can
  // switch sibling tabs without leaving the stack hierarchy.
  const handleSeeAllNotes = () => navigation.getParent()?.navigate('Notes');
  const handleSeeAllTodos = () => navigation.getParent()?.navigate('Todo');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Scrollable content area ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        // Prevent the scroll from intercepting the horizontal note card swipe
        nestedScrollEnabled
      >

        {/* ── Header: date / greeting / avatar ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerDate}>{formatHeaderDate()}</Text>
            <Text style={styles.headerLabel}>{greeting.title}</Text>
            <Text style={styles.headerSubtitle}>{greeting.subtitle}</Text>
          </View>
          <UserAvatar />
        </View>

        {/* ── Progress card ── */}
        <ProgressCard
          completedCount={completedCount}
          totalCount={totalCount}
          overdueCount={overdueCount}
          dueTodayCount={dueTodayCount}
          notesThisWeekCount={notesThisWeekCount}
        />

        {/* ── Priority tasks ── */}
        <View style={styles.section}>
          <SectionHeader title="PRIORITY TASKS" onSeeAll={handleSeeAllTodos} />

          {priorityTodos.length === 0 ? (
            // Empty state — all tasks are done or none exist yet
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>All caught up ✓</Text>
            </View>
          ) : (
            priorityTodos.map((todo) => (
              // Reuse the existing TodoItem component — it owns the completion
              // animation (opacity fade + strikethrough via Reanimated withTiming).
              // onDelete is a no-op here — we don't allow deletion from home.
              // The store toggleComplete call causes a re-render which pushes the
              // completed todo out of activeTodos → out of priorityTodos,
              // producing the natural "move to bottom then disappear" effect.
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={() => toggleComplete(todo.id)}
                onDelete={() => {}}
              />
            ))
          )}
        </View>

        {/* ── Recent notes ── */}
        <View style={styles.section}>
          <SectionHeader title="RECENT NOTES" onSeeAll={handleSeeAllNotes} />

          {recentNotes.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>
                No notes yet — tap + to create one
              </Text>
            </View>
          ) : (
            <>
              {/* Horizontal swipeable card list — reuses the existing NoteCard */}
              <FlatList
                testID="home-notes-list"
                data={recentNotes}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled={false}
                snapToInterval={cardWidth + spacing.sm * 2}
                snapToAlignment="start"
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.noteCardList,
                  { paddingHorizontal: spacing.screenH },
                ]}
                onViewableItemsChanged={onNotesViewableChanged}
                viewabilityConfig={notesViewabilityConfig}
                renderItem={({ item }) => (
                  <NoteCard
                    note={item}
                    width={cardWidth}
                    onPress={() => handleCardPress(item)}
                  />
                )}
              />

              {/* Dot indicator — only shown when there are 2 or 3 recent notes */}
              {recentNotes.length > 1 && (
                <View style={styles.notesDotRow} testID="home-dot-indicator">
                  {recentNotes.map((_, i) => (
                    <NotesDot key={i} isActive={i === activeNoteIndex} />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

      </ScrollView>

      {/* ── Action row — pinned below the scroll content ── */}
      {/* Sits outside the ScrollView so it stays visible while scrolling */}
      <View style={styles.actionRow}>
        <FAB
          testID="home-fab"
          onPress={() => setShowCreateSheet(true)}
        />
        <RecordButton testID="home-record-button" />
      </View>

      {/* ── Create note bottom sheet ── */}
      <NoteCreateSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onSave={handleSaveNote}
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

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: spacing.lg,
  },

  // ── Header ──────────────────────────────────────────────────────────────

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },

  headerDate: {
    fontSize: fontSize.xs,
    color: ink.tertiary,
    letterSpacing: 0.3,
  },

  headerLabel: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: ink.primary,
    marginTop: 2,
  },

  headerSubtitle: {
    fontSize: fontSize.sm,
    color: ink.secondary,
    marginTop: 2,
  },

  // ── Progress card ────────────────────────────────────────────────────────

  progressCard: {
    marginHorizontal: spacing.screenH,
    marginBottom: spacing.lg,
    backgroundColor: '#E2D9C8',
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(80,72,58,0.2)',
    padding: spacing.md,
    // overflow:hidden clips the fill bar to the card's rounded corners
    overflow: 'hidden',
  },

  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  progressLabel: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: '#3A3426',
    letterSpacing: 0.5,
    // textTransform not available in RN — uppercase via content (already uppercase)
  },

  progressFraction: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    // tabular-nums keeps the fraction from jumping width as digits change
    fontVariant: ['tabular-nums'],
    color: ink.primary,
  },

  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(28,26,20,0.12)',
    borderRadius: radius.full,
    marginBottom: spacing.md,
    // overflow:hidden clips the fill bar's own border radius to the track shape
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#E8B820',
    borderRadius: radius.full,
  },

  // ── Stats row ────────────────────────────────────────────────────────────

  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(28,26,20,0.15)',
    paddingTop: spacing.sm,
  },

  statColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },

  statsDivider: {
    width: 0.5,
    backgroundColor: 'rgba(28,26,20,0.15)',
    marginVertical: 2,
  },

  statValue: {
    fontSize: 19,
    fontWeight: fontWeight.bold,
    lineHeight: 24,
  },

  statLabel: {
    fontSize: 8,
    fontWeight: fontWeight.semibold,
    color: '#3A3426',
    textAlign: 'center',
    marginTop: 1,
  },

  // ── Sections ─────────────────────────────────────────────────────────────

  section: {
    marginBottom: spacing.lg,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenH,
    marginBottom: spacing.sm,
  },

  sectionTitle: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: ink.tertiary,
    letterSpacing: 0.8,
  },

  seeAll: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#E8B820',
  },

  emptySection: {
    paddingHorizontal: spacing.screenH,
    paddingVertical: spacing.md,
  },

  emptySectionText: {
    fontSize: fontSize.sm,
    color: ink.tertiary,
    fontStyle: 'italic',
  },

  // ── Note cards ───────────────────────────────────────────────────────────

  noteCardList: {
    alignItems: 'center',
  },

  notesDotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: 5,
  },

  notesDot: {
    height: 4,
    borderRadius: radius.full,
  },

  notesDotActive: {
    width: 12,
    backgroundColor: '#E8B820',
  },

  notesDotInactive: {
    width: 4,
    backgroundColor: 'rgba(180,170,150,0.4)',
  },

  // ── Action row — pinned at bottom, outside ScrollView ───────────────────

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenH,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    // Match screen background so the row blends with the safe area
    backgroundColor: background.primary,
  },
});
