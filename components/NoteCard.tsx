/**
 * components/NoteCard.tsx
 *
 * Floating glass card used on the Home screen swipeable card stack.
 *
 * Design:
 *   - Large card: full width minus horizontal margins
 *   - Frosted glass surface (BlurView on iOS, semi-transparent fallback on Android)
 *   - Category tint overlay — subtle colour wash matching the note's tag
 *   - Tag pill in the top-right corner
 *   - Title (bold, 2 lines max)
 *   - Body preview (3 lines max)
 *   - Timestamp at the bottom
 *   - Rounded corners (radius.card = 20dp)
 *   - White rim border for the glass look
 *
 * The card receives a `width` prop because the Home screen calculates the
 * correct width based on screen dimensions and passes it down.
 *
 * DEBUG TIP: If the tint overlay looks too strong, reduce the alpha in
 * constants/colors.ts tag[tag].tint. If the blur doesn't show on iOS,
 * ensure BlurView is not inside a ScrollView with improper overflow setting.
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

interface NoteCardProps {
  /** The note to display */
  note: Note;
  /** Card width in dp — calculated by the parent screen */
  width: number;
  /** Called when the card is tapped */
  onPress: () => void;
  /** testID for automated testing */
  testID?: string;
}

const CARD_HEIGHT = 200;

export function NoteCard({ note, width, onPress, testID }: NoteCardProps) {
  const colors = tagColors[note.tag];

  return (
    <TouchableOpacity
      testID={testID ?? `note-card-${note.id}`}
      onPress={onPress}
      activeOpacity={0.92}
      style={[styles.card, { width, height: CARD_HEIGHT }]}
    >
      {/* ── Background layer ── */}

      {/* BlurView for iOS frosted glass; solid fallback for Android */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={70}
          tint="light"
          style={[StyleSheet.absoluteFill, styles.blur]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.blur, styles.androidBg]} />
      )}

      {/* Category tint — soft colour wash over the blur */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.tintOverlay,
          { backgroundColor: colors.tint },
        ]}
      />

      {/* ── Content ── */}
      <View style={styles.content}>
        {/* Top row: tag pill */}
        <View style={styles.topRow}>
          <View style={[styles.tagPill, { backgroundColor: colors.pill }]}>
            <Text style={[styles.tagText, { color: colors.text }]}>
              {note.tag}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text
          testID={`note-card-title-${note.id}`}
          style={styles.title}
          numberOfLines={2}
        >
          {note.title || 'Untitled'}
        </Text>

        {/* Body preview — only rendered if body is non-empty */}
        {note.body ? (
          <Text style={styles.body} numberOfLines={3}>
            {note.body}
          </Text>
        ) : null}

        {/* Spacer pushes timestamp to the bottom */}
        <View style={{ flex: 1 }} />

        {/* Timestamp */}
        <Text style={styles.timestamp}>{formatNoteDate(note.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
    // Glass card border
    borderWidth: 1,
    borderColor: glass.border,
    // Shadow — iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    // Shadow — Android
    elevation: 4,
  },

  /** Rounds the blur view to match card corners */
  blur: {
    borderRadius: radius.card,
  },

  androidBg: {
    backgroundColor: glass.fallback,
  },

  /** Tint overlay — sits above the blur, below the content */
  tintOverlay: {
    borderRadius: radius.card,
  },

  /** Main content area with padding */
  content: {
    flex: 1,
    padding: spacing.lg,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },

  tagPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },

  tagText: {
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
    letterSpacing: 0.4,
  },

  title: {
    fontSize: fontSize.cardTitle,
    fontWeight: fontWeight.semibold,
    color: ink.primary,
    lineHeight: lineHeight.cardTitle,
    marginBottom: spacing.xs,
  },

  body: {
    fontSize: fontSize.cardBody,
    color: ink.secondary,
    lineHeight: lineHeight.cardBody,
  },

  timestamp: {
    fontSize: fontSize.timestamp,
    color: ink.tertiary,
    marginTop: spacing.xs,
  },
});
