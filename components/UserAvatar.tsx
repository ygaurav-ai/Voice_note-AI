/**
 * components/UserAvatar.tsx
 *
 * User avatar — appears top-right on every screen header.
 * Shows the user's initials in a small circular badge.
 *
 * Since Thoughts has no authentication or user profiles, the initials
 * are hardcoded to "Y" (for "You"). This can be made configurable in
 * a future phase via a settings screen.
 *
 * Design:
 *   - Circle, 36dp diameter
 *   - Warm ink background
 *   - White initials text
 *
 * Props:
 *   initials — the 1-2 character initials to show (default "Y")
 *   size     — circle diameter in dp (default 36)
 *   testID   — for automated testing
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ink } from '../constants/colors';
import { fontSize, fontWeight } from '../constants/typography';

interface UserAvatarProps {
  /** 1-2 character initials */
  initials?: string;
  /** Circle diameter in dp */
  size?: number;
  /** testID for automated testing */
  testID?: string;
}

export function UserAvatar({
  initials = 'Y',
  size = 36,
  testID = 'user-avatar',
}: UserAvatarProps) {
  return (
    <View
      testID={testID}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={styles.initials}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: ink.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  initials: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  },
});
