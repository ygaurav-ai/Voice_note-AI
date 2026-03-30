/**
 * components/FAB.tsx
 *
 * Floating Action Button — the primary "create new" button.
 *
 * Appears in the bottom-left action row on Home, Notes, and Todo screens.
 * Tapping it opens the create note (or create todo) bottom sheet.
 *
 * Design:
 *   - Circle, 56dp diameter (spacing.fabSize)
 *   - Amber yellow background (accent.primary)
 *   - White "+" text centred inside
 *   - Shadow for elevation above the card surface
 *
 * Press animation (Phase 6):
 *   - Scales down to 0.92 on press-in via Reanimated withSpring
 *   - Springs back to 1.0 on press-out
 *   - Spring config: slightly stiff/snappy so it feels responsive but not jarring
 *   - Uses Pressable (not TouchableOpacity) so we get separate onPressIn/onPressOut
 *     callbacks for precise animation timing
 *
 * Props:
 *   onPress   — called when tapped
 *   testID    — for automated testing
 *
 * DEBUG TIP: If the FAB appears behind cards or the nav bar, check that
 * its parent View has a higher zIndex or is rendered after the scroll view.
 *
 * DEBUG TIP: If the spring bounces too much, reduce the stiffness value or
 * increase damping. Target feel: quick snap down, smooth spring back.
 */

import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { accent } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { fontWeight } from '../constants/typography';

// Spring config — snappy press-in, slightly softer spring-back
const PRESS_IN_CONFIG  = { damping: 20, stiffness: 500 };
const PRESS_OUT_CONFIG = { damping: 12, stiffness: 250 };

interface FABProps {
  /** Called when the FAB is tapped */
  onPress: () => void;
  /** testID for automated testing */
  testID?: string;
}

export function FAB({ onPress, testID = 'fab-button' }: FABProps) {
  // Shared value drives the scale — starts at 1 (normal size)
  const scale = useSharedValue(1);

  // Animated style reads scale and applies it as a transform
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Press down: scale to 0.92 with a stiff spring (feels immediate)
  const handlePressIn = () => {
    scale.value = withSpring(0.92, PRESS_IN_CONFIG);
    // DEBUG: console.debug('[FAB] press in — scale → 0.92');
  };

  // Press release: spring back to full size with a softer spring (feels elastic)
  const handlePressOut = () => {
    scale.value = withSpring(1.0, PRESS_OUT_CONFIG);
    // DEBUG: console.debug('[FAB] press out — scale → 1.0');
  };

  return (
    // Pressable gives us onPressIn + onPressOut — TouchableOpacity only has onPress
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel="Create new"
    >
      {/* Animated.View wraps the visual button so the spring scale applies */}
      <Animated.View style={[styles.button, animatedStyle]}>
        {/* "+" label */}
        <Text style={styles.plus}>+</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: spacing.fabSize,
    height: spacing.fabSize,
    borderRadius: spacing.fabSize / 2,
    backgroundColor: accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow — iOS
    shadowColor: accent.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Shadow — Android
    elevation: 6,
  },

  plus: {
    fontSize: 28,
    fontWeight: fontWeight.regular,
    color: '#FFFFFF',
    lineHeight: 32,
    // Slight upward shift to visually centre the "+" character
    marginTop: -2,
  },
});
