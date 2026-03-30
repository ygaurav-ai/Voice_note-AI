/**
 * components/RecordButton.tsx
 *
 * Record button — placeholder for future voice memo recording.
 *
 * Appears in the bottom-right action row on Home and Todo screens.
 * Voice recording is out of scope for the current build.
 * The button renders and is visible but has no recording functionality yet.
 *
 * Design:
 *   - Circle, 48dp diameter (spacing.recordButtonSize)
 *   - Frosted glass surface (semi-transparent white)
 *   - Small waveform bars to indicate "audio" — visual affordance only
 *   - Slightly greyed/muted to signal it's not yet active
 *
 * Press animation (Phase 6):
 *   - Scales down to 0.92 on press-in via Reanimated withSpring
 *   - Springs back to 1.0 on press-out
 *   - Same spring config pattern as FAB for visual consistency
 *
 * DEBUG TIP: If you want to test the button's visual state without wiring up
 * actual recording logic, just add onPress handling — the visual doesn't change.
 *
 * DEBUG TIP: If the spring feels laggy on Android, try increasing stiffness or
 * reducing damping in PRESS_IN_CONFIG.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { glass, ink } from '../constants/colors';
import { spacing } from '../constants/spacing';

// Spring config — matches FAB for consistent press feel across action row
const PRESS_IN_CONFIG  = { damping: 20, stiffness: 500 };
const PRESS_OUT_CONFIG = { damping: 12, stiffness: 250 };

interface RecordButtonProps {
  /** testID for automated testing */
  testID?: string;
  /** Optional press handler — no-op for now */
  onPress?: () => void;
}

/** Heights of the 5 waveform bars — a simple visual representation of audio */
const WAVE_HEIGHTS = [6, 12, 8, 14, 6];

export function RecordButton({ testID = 'record-button', onPress }: RecordButtonProps) {
  // Shared value drives the spring scale animation
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, PRESS_IN_CONFIG);
    // DEBUG: console.debug('[RecordButton] press in — scale → 0.92');
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0, PRESS_OUT_CONFIG);
    // DEBUG: console.debug('[RecordButton] press out — scale → 1.0');
  };

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel="Record voice memo (coming soon)"
      accessible
    >
      {/* Animated.View wraps the circle so the spring scale applies to the whole button */}
      <Animated.View style={[styles.button, animatedStyle]}>
        {/* Waveform bars — placeholder visual */}
        <View style={styles.waveform}>
          {WAVE_HEIGHTS.map((h, i) => (
            <View
              key={i}
              style={[styles.bar, { height: h }]}
            />
          ))}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: spacing.recordButtonSize,
    height: spacing.recordButtonSize,
    borderRadius: spacing.recordButtonSize / 2,
    backgroundColor: glass.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: glass.border,
    // Shadow — iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    // Shadow — Android
    elevation: 2,
  },

  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  bar: {
    width: 2.5,
    borderRadius: 2,
    backgroundColor: ink.secondary,
  },
});
