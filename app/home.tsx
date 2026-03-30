/**
 * app/home.tsx
 *
 * Home screen — the app's default landing view.
 *
 * Layout (top to bottom):
 *   - Header: date + "today" label on left, user avatar on right
 *   - Subtitle: "X notes today" count
 *   - Horizontal FlatList of NoteCards — today's notes only
 *   - Dot indicator row — updates as cards are swiped
 *   - Empty state card — shown when no notes were created today
 *   - Action row: FAB (left) + RecordButton (right)
 *
 * Data flow:
 *   - Notes read from useNotesStore via getTodayNotes()
 *   - FAB opens NoteCreateSheet, which calls addNote on save
 *   - Tapping a card navigates to Note Detail with the note's id
 *
 * Card scroll behaviour:
 *   - Horizontal FlatList, snap per card (snapToInterval)
 *   - decelerationRate="fast" for the premium snap feel
 *   - onViewableItemsChanged tracks the active index for dot indicators
 *
 * DEBUG TIP: If today's notes don't appear after creating one, check that
 * isToday() in utils/date.ts is comparing dates in the local timezone,
 * not UTC. Date.toDateString() uses local time, which is correct.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteCard } from '../components/NoteCard';
import { FAB } from '../components/FAB';
import { RecordButton } from '../components/RecordButton';
import { UserAvatar } from '../components/UserAvatar';
import { NoteCreateSheet } from '../components/NoteCreateSheet';
import { useNotesStore } from '../store/notesStore';
import { background, ink, accent } from '../constants/colors';
import { spacing, radius } from '../constants/spacing';
import { fontSize, fontWeight } from '../constants/typography';
import { formatHeaderDate } from '../utils/date';
import type { HomeStackScreenProps } from '../types/navigation';
import type { Note, NoteTag } from '../types';

type Props = HomeStackScreenProps<'HomeScreen'>;

// ---------------------------------------------------------------------------
// AnimatedDot — single dot in the scroll indicator row
//
// Active dot: expands to a 20dp pill shape
// Inactive dot: collapses to a 6dp circle
// Width transitions over 250ms with easing, matching the blueprint spec.
//
// Implemented as a separate component so each dot owns its own shared value
// and doesn't cause the whole screen to re-render when only one dot changes.
// ---------------------------------------------------------------------------
function AnimatedDot({ isActive }: { isActive: boolean }) {
  // Start at the correct width for the initial render to avoid a flash
  const width = useSharedValue(isActive ? 20 : 6);

  // Animate width whenever the active state changes (card swiped)
  useEffect(() => {
    width.value = withTiming(isActive ? 20 : 6, { duration: 250 });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        // Apply active/inactive colour as a static style — colour doesn't animate
        isActive ? styles.dotActive : styles.dotInactive,
        // Animate only the width
        animatedStyle,
      ]}
    />
  );
}

export default function HomeScreen({ navigation }: Props) {
  const { width: screenWidth } = useWindowDimensions();

  // Card width: screen width minus horizontal margins, minus gap for card spacing
  const cardWidth = screenWidth - spacing.screenH * 2;

  // Store — get today's notes and the addNote action
  const getTodayNotes = useNotesStore((s) => s.getTodayNotes);
  const addNote = useNotesStore((s) => s.addNote);
  const todayNotes = getTodayNotes();

  // Dot indicator state — tracks which card is currently visible
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Bottom sheet visibility
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  // Ref for viewability config — must be stable across renders
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // Called by FlatList when visible items change — updates dot indicator
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveCardIndex(viewableItems[0].index);
      }
    },
    []
  );

  // Navigate to Note Detail when a card is tapped
  const handleCardPress = (note: Note) => {
    navigation.navigate('NoteDetail', { noteId: note.id });
  };

  // Save a new note from the create sheet
  const handleSaveNote = (data: { title: string; body: string; tag: NoteTag }) => {
    addNote(data);
    // Note will appear in todayNotes automatically via store reactivity
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerDate}>{formatHeaderDate()}</Text>
          <Text style={styles.headerLabel}>Today</Text>
        </View>
        <UserAvatar />
      </View>

      {/* ── Subtitle: note count ── */}
      <Text style={styles.noteCount} testID="home-note-count">
        {todayNotes.length === 0
          ? 'No notes yet today'
          : `${todayNotes.length} note${todayNotes.length === 1 ? '' : 's'} today`}
      </Text>

      {/* ── Card area ── */}
      <View style={styles.cardArea}>
        {todayNotes.length === 0 ? (
          // Empty state — shown when no notes were created today
          <View testID="home-empty-state" style={[styles.emptyCard, { width: cardWidth }]}>
            <Text style={styles.emptyIcon}>✦</Text>
            <Text style={styles.emptyTitle}>Nothing yet today</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to capture your first thought
            </Text>
          </View>
        ) : (
          <FlatList
            testID="home-card-list"
            data={todayNotes}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled={false}
            snapToInterval={cardWidth + spacing.sm * 2}
            snapToAlignment="start"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.cardList,
              { paddingHorizontal: spacing.screenH },
            ]}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ item }) => (
              <NoteCard
                note={item}
                width={cardWidth}
                onPress={() => handleCardPress(item)}
              />
            )}
          />
        )}
      </View>

      {/* ── Dot indicator ── each dot animates its width when active changes */}
      {todayNotes.length > 1 && (
        <View style={styles.dotRow} testID="home-dot-indicator">
          {todayNotes.map((_, i) => (
            <AnimatedDot key={i} isActive={i === activeCardIndex} />
          ))}
        </View>
      )}

      {/* ── Action row: FAB (left) + Record button (right) ── */}
      <View style={styles.actionRow}>
        <FAB
          testID="home-fab"
          onPress={() => setShowCreateSheet(true)}
        />
        <RecordButton testID="home-record-button" />
      </View>

      {/* ── Create note sheet ── */}
      <NoteCreateSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onSave={handleSaveNote}
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

  noteCount: {
    fontSize: fontSize.sm,
    color: ink.secondary,
    paddingHorizontal: spacing.screenH,
    marginBottom: spacing.lg,
  },

  /** Card area takes up the remaining space between header and action row */
  cardArea: {
    flex: 1,
    justifyContent: 'center',
  },

  cardList: {
    alignItems: 'center',
  },

  /** Dot indicator row */
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: 6,
  },

  dot: {
    height: 4,
    borderRadius: radius.full,
  },

  dotActive: {
    width: 20,
    backgroundColor: accent.primary,
  },

  dotInactive: {
    width: 6,
    backgroundColor: ink.disabled,
  },

  /** Action row — FAB left, record right, sits at the bottom of the screen */
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenH,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },

  // Empty state styles
  emptyCard: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    borderStyle: 'dashed',
    padding: spacing.xxl,
    alignItems: 'center',
    marginHorizontal: spacing.screenH,
  },

  emptyIcon: {
    fontSize: 28,
    marginBottom: spacing.md,
    color: accent.primary,
  },

  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: ink.primary,
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
