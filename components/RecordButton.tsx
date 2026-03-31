/**
 * components/RecordButton.tsx
 *
 * Reactive waveform record button for the Phase 7 voice note pipeline.
 *
 * The button has 5 visual states driven by the RecordingState prop:
 *
 *   idle        — 5 static bars, glass surface, amber ink
 *   requesting  — 5 bars + pulsing opacity glow (waiting for permission)
 *   recording   — 5 bars with staggered bounce animation, red tint surface
 *   processing  — 3 rotating dots spinner, amber surface
 *   error       — red surface with ✕ icon, auto-resets after 2s
 *
 * Interaction:
 *   onPressIn  → startRecording (parent passes this from useVoiceRecorder)
 *   onPressOut → stopRecording
 *
 * Press animation (Reanimated withSpring):
 *   Scales down to 0.92 on press-in, springs back to 1.0 on press-out.
 *   Same spring config as FAB for visual consistency across the action row.
 *
 * Waveform animation (recording state):
 *   Each of 5 bars has a staggered looping bounce driven by withRepeat +
 *   withSequence. Stagger offset = 80ms per bar, so the bars ripple left-to-right.
 *
 * Spinner animation (processing state):
 *   A simple rotation loop via withRepeat + withTiming over 800ms.
 *
 * Accessibility:
 *   accessibilityLabel changes based on state for screen-reader users.
 *
 * DEBUG TIP: If waveform bars don't animate, confirm react-native-reanimated
 * worklet runtime is initialised (check jest.setup.js mock for tests).
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { glass, ink, accent } from '../constants/colors';
import { spacing } from '../constants/spacing';
import type { RecordingState } from '../types/voice';

// ---------------------------------------------------------------------------
// Spring configs — shared with FAB for consistent feel
// ---------------------------------------------------------------------------
const PRESS_IN_CONFIG  = { damping: 20, stiffness: 500 };
const PRESS_OUT_CONFIG = { damping: 12, stiffness: 250 };

// ---------------------------------------------------------------------------
// Bar heights — the 5 waveform bars in idle order
// ---------------------------------------------------------------------------
const IDLE_HEIGHTS = [6, 12, 8, 14, 6];
const MAX_HEIGHT   = 20; // max bar height during recording bounce

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------
interface RecordButtonProps {
  /** Current pipeline state from useVoiceRecorder */
  state?: RecordingState;
  /** testID for automated testing */
  testID?: string;
  /** Called when the user presses down — starts recording */
  onPressIn?: () => void;
  /** Called when the user lifts their finger — stops recording */
  onPressOut?: () => void;
}

// ---------------------------------------------------------------------------
// Waveform bar (used in idle and recording states)
// ---------------------------------------------------------------------------

interface WaveBarProps {
  idleHeight: number;
  isRecording: boolean;
  staggerMs: number; // delay before this bar starts its bounce loop
}

function WaveBar({ idleHeight, isRecording, staggerMs }: WaveBarProps) {
  const heightSv = useSharedValue(idleHeight);

  useEffect(() => {
    if (isRecording) {
      // Staggered bounce: shrink then grow, looping
      heightSv.value = withRepeat(
        withSequence(
          withTiming(4, { duration: 150, easing: Easing.inOut(Easing.ease) }),
          withTiming(MAX_HEIGHT, { duration: 200, easing: Easing.inOut(Easing.ease) }),
          withTiming(idleHeight, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,   // infinite repeats
        true, // reverse direction on alternate cycles (natural bounce feel)
      );
      // DEBUG: console.debug('[WaveBar] bounce started, stagger:', staggerMs);
    } else {
      cancelAnimation(heightSv);
      heightSv.value = withTiming(idleHeight, { duration: 200 });
    }
  }, [isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: heightSv.value,
  }));

  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

// ---------------------------------------------------------------------------
// Processing spinner — 3 dots rotating around a circle
// ---------------------------------------------------------------------------

function ProcessingSpinner() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 800, easing: Easing.linear }),
      -1, // infinite
      false,
    );
    return () => {
      cancelAnimation(rotation);
    };
  }, []);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.spinner, spinStyle]}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.spinnerDot,
            { transform: [{ rotate: `${i * 120}deg` }, { translateY: -7 }] },
          ]}
        />
      ))}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// RecordButton
// ---------------------------------------------------------------------------

export function RecordButton({
  state = 'idle',
  testID = 'record-button',
  onPressIn,
  onPressOut,
}: RecordButtonProps) {
  // Spring scale animation on press
  const scaleSv = useSharedValue(1);

  // Pulse opacity for 'requesting' state
  const opacitySv = useSharedValue(1);

  useEffect(() => {
    if (state === 'requesting') {
      opacitySv.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 500 }),
          withTiming(1.0, { duration: 500 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(opacitySv);
      opacitySv.value = withTiming(1.0, { duration: 200 });
    }
  }, [state]);

  const scaleStyle   = useAnimatedStyle(() => ({
    transform: [{ scale: scaleSv.value }],
  }));
  const opacityStyle = useAnimatedStyle(() => ({
    opacity: opacitySv.value,
  }));

  const handlePressIn = () => {
    scaleSv.value = withSpring(0.92, PRESS_IN_CONFIG);
    onPressIn?.();
  };

  const handlePressOut = () => {
    scaleSv.value = withSpring(1.0, PRESS_OUT_CONFIG);
    onPressOut?.();
  };

  // Determine surface colour and content based on state
  const isRecording  = state === 'recording';
  const isProcessing = state === 'processing';
  const isError      = state === 'error';

  const surfaceStyle = isRecording
    ? styles.surfaceRecording
    : isError
    ? styles.surfaceError
    : isProcessing
    ? styles.surfaceProcessing
    : styles.surfaceIdle;

  const a11yLabel =
    state === 'idle'       ? 'Record voice note'          :
    state === 'requesting' ? 'Requesting microphone…'     :
    state === 'recording'  ? 'Recording — tap to stop'    :
    state === 'processing' ? 'Processing voice note…'     :
                             'Recording error';

  return (
    <Pressable
      testID={testID}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={state === 'processing' || state === 'requesting'}
      accessibilityLabel={a11yLabel}
      accessible
    >
      <Animated.View style={[styles.button, surfaceStyle, scaleStyle, opacityStyle]}>
        {isProcessing ? (
          // Spinner during Gemini API call
          <ProcessingSpinner />
        ) : isError ? (
          // Error X icon
          <Text style={styles.errorIcon}>✕</Text>
        ) : (
          // Waveform bars (idle, requesting, recording)
          <View style={styles.waveform}>
            {IDLE_HEIGHTS.map((h, i) => (
              <WaveBar
                key={i}
                idleHeight={h}
                isRecording={isRecording}
                staggerMs={i * 80}
              />
            ))}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  button: {
    width: spacing.recordButtonSize,
    height: spacing.recordButtonSize,
    borderRadius: spacing.recordButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    // Shadow — iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    // Shadow — Android
    elevation: 2,
  },

  // ── Surface colour variants ──────────────────────────────────────────────

  surfaceIdle: {
    backgroundColor: glass.surface,
    borderColor: glass.border,
  },

  surfaceRecording: {
    // Red-tinted surface to signal active capture
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.40)',
  },

  surfaceProcessing: {
    // Amber-tinted surface to signal AI is working
    backgroundColor: 'rgba(240, 180, 41, 0.15)',
    borderColor: 'rgba(240, 180, 41, 0.40)',
  },

  surfaceError: {
    // Bright red surface — brief (2s) error state
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: 'rgba(239, 68, 68, 0.60)',
  },

  // ── Waveform bars ────────────────────────────────────────────────────────

  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
  },

  bar: {
    width: 2.5,
    borderRadius: 2,
    backgroundColor: ink.secondary,
  },

  // ── Processing spinner ───────────────────────────────────────────────────

  spinner: {
    width: 18,
    height: 18,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  spinnerDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: accent.primary,
  },

  // ── Error icon ───────────────────────────────────────────────────────────

  errorIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
});
