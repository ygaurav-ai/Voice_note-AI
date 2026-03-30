/**
 * components/TagChip.tsx
 *
 * A tappable filter chip used in two contexts:
 *   1. Notes screen tag filter row — "All", "Work", "Reading", "Personal", "Ideas"
 *   2. Note create sheet / Note Detail tag selector
 *
 * Active state:
 *   - Filter mode (no tag): dark ink background with amber text
 *   - Tag mode (tag provided): tag.tint background with tag.text color
 *
 * Inactive state:
 *   - Light warm surface with muted text
 *
 * Props:
 *   label     — the visible text on the chip
 *   tag       — if provided, uses tag-specific active colors
 *   isActive  — whether this chip is the selected one
 *   onPress   — tap handler
 *   testID    — for tests
 *
 * DEBUG TIP: If chip colors look wrong, check that the tag value matches
 * a key in constants/colors.ts tag object.
 */

import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ink, accent, tag as tagColors } from '../constants/colors';
import { spacing, radius } from '../constants/spacing';
import { fontSize, fontWeight } from '../constants/typography';
import type { NoteTag } from '../types';

interface TagChipProps {
  /** Visible label text */
  label: string;
  /** If provided, use this tag's colour scheme for the active state */
  tag?: NoteTag;
  /** Whether this chip is currently selected */
  isActive: boolean;
  /** Called when the chip is tapped */
  onPress: () => void;
  /** testID for automated testing */
  testID?: string;
}

export function TagChip({ label, tag, isActive, onPress, testID }: TagChipProps) {
  // Determine background and text colours based on active state + tag
  const backgroundColor = isActive
    ? tag
      ? tagColors[tag].pill  // tag-specific tint when active
      : ink.primary          // dark background for "All" chip when active
    : 'rgba(255,255,255,0.5)'; // light semi-transparent when inactive

  const textColor = isActive
    ? tag
      ? tagColors[tag].text  // tag-specific text when active
      : accent.primary       // amber text on dark background for "All"
    : ink.tertiary;          // muted text when inactive

  return (
    <TouchableOpacity
      testID={testID ?? `tag-chip-${label.toLowerCase()}`}
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        { backgroundColor },
        isActive && styles.chipActive,
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.chip,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },

  /** Extra ring on active state for visual emphasis */
  chipActive: {
    borderColor: 'transparent',
  },

  label: {
    fontSize: fontSize.chip,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.3,
  },
});
