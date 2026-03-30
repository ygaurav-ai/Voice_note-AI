/**
 * components/NoteGridCard.tsx
 *
 * Compact card used in the 2-column notes grid on the Notes screen.
 *
 * Design:
 *   - Half-width card (parent provides flex or explicit width)
 *   - Frosted glass surface (BlurView on iOS, semi-transparent fallback on Android)
 *   - Category colour dot in the top-left
 *   - Tag tint overlay matching the note's category
 *   - Title (bold, 2 lines max)
 *   - Body preview (2 lines max) — hidden if body is empty
 *   - Date string at the bottom
 *   - Rounded corners (radius.gridCard = 16dp)
 *
 * Unlike NoteCard (which has a fixed height), NoteGridCard height is
 * determined by its content so short and long notes look natural in the grid.
 *
 * DEBUG TIP: If grid cards appear uneven heights, check that the FlatList
 * on the Notes screen does NOT have a fixed height on its renderItem container.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';

import { glass, tag as tagColors, ink } from '../constants/colors';
import { spacing, radius } from '../constants/spacing';
import { fontSize, fontWeight, lineHeight } from '../constants/typography';
import { formatNoteDate } from '../utils/date';
import type { Note } from '../types';

interface NoteGridCardProps {
  /** The note to display */
  note: Note;
  /** Called when the card is tapped */
  onPress: () => void;
  /** testID for automated testing */
  testID?: string;
}

export function NoteGridCard({ note, onPress, testID }: NoteGridCardProps) {
  const colors = tagColors[note.tag];

  return (
    <TouchableOpacity
      testID={testID ?? `note-grid-card-${note.id}`}
      onPress={onPress}
      activeOpacity={0.9}
      style={styles.card}
    >
      {/* BlurView on iOS; solid fallback on Android */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={60}
          tint="light"
          style={[StyleSheet.absoluteFill, styles.blur]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.blur, styles.androidBg]} />
      )}

      {/* Category tint overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.blur,
          { backgroundColor: colors.tint },
        ]}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Category colour dot */}
        <View style={[styles.dot, { backgroundColor: colors.base }]} />

        {/* Title */}
        <Text
          testID={`note-grid-title-${note.id}`}
          style={styles.title}
          numberOfLines={2}
        >
          {note.title || 'Untitled'}
        </Text>

        {/* Body preview */}
        {note.body ? (
          <Text style={styles.body} numberOfLines={2}>
            {note.body}
          </Text>
        ) : null}

        {/* Date */}
        <Text style={styles.date}>{formatNoteDate(note.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: spacing.cardGap / 2,
    borderRadius: radius.gridCard,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glass.border,
    minHeight: 120,
    // Shadow — iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    // Shadow — Android
    elevation: 2,
  },

  blur: {
    borderRadius: radius.gridCard,
  },

  androidBg: {
    backgroundColor: glass.fallback,
  },

  content: {
    padding: spacing.md,
  },

  /** Coloured dot identifying the category */
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },

  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: ink.primary,
    lineHeight: lineHeight.cardTitle,
    marginBottom: spacing.xs,
  },

  body: {
    fontSize: fontSize.sm,
    color: ink.secondary,
    lineHeight: lineHeight.cardBody,
    marginBottom: spacing.xs,
  },

  date: {
    fontSize: fontSize.timestamp,
    color: ink.tertiary,
    marginTop: spacing.xs,
  },
});
