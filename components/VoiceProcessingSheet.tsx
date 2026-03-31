/**
 * components/VoiceProcessingSheet.tsx
 *
 * Confirmation sheet shown after a voice note is processed and saved.
 *
 * Pattern: "save immediately, offer undo" — like Gmail's "Email sent. Undo".
 *
 * The item is already saved in the store when this sheet appears.
 * The sheet gives the user 4 seconds to undo before auto-dismissing.
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │  🎤  Voice Note Added               │   ← destination label
 *   │  "Meeting prep for Monday"          │   ← title
 *   │  "Key points: budget review…"       │   ← summary (1-2 lines)
 *   │  ████████████░░░░░░░░   [Undo]      │   ← countdown bar + undo button
 *   └─────────────────────────────────────┘
 *
 * Behaviour:
 *   - Slides up from below using an Animated.View translateY spring
 *   - Countdown bar shrinks over 4s via withTiming
 *   - After 4s, onDismiss() is called and the sheet slides back down
 *   - If Undo is pressed, onUndo() is called immediately and sheet closes
 *   - Sheet is rendered in a Modal (overlay) so it floats above all content
 *
 * Props:
 *   visible     — controls whether the sheet is shown
 *   result      — the ProcessedVoiceNote that was saved (title, destination, summary)
 *   onDismiss   — called when the 4s countdown completes (item stays saved)
 *   onUndo      — called when the Undo button is pressed (caller deletes the item)
 *
 * DEBUG TIP: If the countdown bar doesn't animate, check that the Modal is
 * rendered with `transparent={true}` so the sheet can overlay the screen.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ink, accent, background } from '../constants/colors';
import { spacing, radius } from '../constants/spacing';
import { fontSize, fontWeight } from '../constants/typography';
import type { ProcessedVoiceNote } from '../types/voice';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Duration the sheet stays visible before auto-dismissing (milliseconds) */
const AUTO_DISMISS_MS = 4000;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VoiceProcessingSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** The processed voice note that was saved to the store */
  result: ProcessedVoiceNote | null;
  /** Called after the 4s countdown completes — item stays saved */
  onDismiss: () => void;
  /** Called when the user presses Undo — caller should delete the saved item */
  onUndo: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VoiceProcessingSheet({
  visible,
  result,
  onDismiss,
  onUndo,
}: VoiceProcessingSheetProps) {
  const insets = useSafeAreaInsets();

  // Slide-in/out animation — starts off-screen (translateY = 120), springs to 0
  const translateY = useSharedValue(120);

  // Countdown bar width ratio: 1.0 → 0.0 over AUTO_DISMISS_MS
  const countdownRatio = useSharedValue(1);

  // Auto-dismiss timeout ref — cleared on manual undo
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Slide in + start countdown when visible ───────────────────────────────
  useEffect(() => {
    if (visible) {
      // Spring the sheet up
      translateY.value = withSpring(0, { damping: 24, stiffness: 320 });

      // Animate countdown bar from full to empty
      countdownRatio.value = 1;
      countdownRatio.value = withTiming(0, { duration: AUTO_DISMISS_MS });

      // Auto-dismiss after timeout
      dismissTimeoutRef.current = setTimeout(() => {
        slideDown(onDismiss);
      }, AUTO_DISMISS_MS);
    } else {
      // Slide back down immediately when visibility is cleared externally
      translateY.value = withTiming(120, { duration: 250 });
    }

    return () => {
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    };
  }, [visible]);

  // ── Slide down then call callback ─────────────────────────────────────────
  const slideDown = (callback: () => void) => {
    translateY.value = withTiming(120, { duration: 220 }, () => {
      // Run callback on JS thread after animation finishes
      runOnJS(callback)();
    });
  };

  // ── Undo press ────────────────────────────────────────────────────────────
  // onUndo is called immediately so the store deletion happens at once.
  // The sheet then slides down — purely cosmetic, not blocking the undo action.
  const handleUndo = () => {
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    onUndo(); // Immediate: caller deletes the item from the store
    translateY.value = withTiming(120, { duration: 220 }); // slide down (fire and forget)
  };

  // ── Animated styles ───────────────────────────────────────────────────────
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const countdownBarStyle = useAnimatedStyle(() => ({
    // Multiply by full bar width (set via flex, so we use scaleX instead)
    transform: [{ scaleX: countdownRatio.value }],
  }));

  if (!result) return null;

  const destinationLabel = result.destination === 'note' ? 'Note Added' : 'Task Added';
  const destinationIcon  = result.destination === 'note' ? '📝' : '✅';

  return (
    <Modal
      testID="voice-processing-sheet-modal"
      visible={visible}
      transparent
      animationType="none" // We control animation via Reanimated
      statusBarTranslucent
    >
      {/* Full-screen transparent backdrop — not pressable so user can still see content */}
      <View style={styles.backdrop} pointerEvents="box-none">
        <Animated.View
          testID="voice-processing-sheet"
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
            sheetStyle,
          ]}
        >
          {/* ── Destination row ── */}
          <View style={styles.destinationRow}>
            <Text style={styles.destinationIcon}>{destinationIcon}</Text>
            <Text style={styles.destinationLabel}>{destinationLabel}</Text>
          </View>

          {/* ── Title ── */}
          <Text
            testID="voice-sheet-title"
            style={styles.title}
            numberOfLines={2}
          >
            {result.title}
          </Text>

          {/* ── Summary ── */}
          <Text
            testID="voice-sheet-summary"
            style={styles.summary}
            numberOfLines={2}
          >
            {result.summary}
          </Text>

          {/* ── Countdown row: bar + undo button ── */}
          <View style={styles.countdownRow}>
            {/* Countdown track */}
            <View style={styles.countdownTrack}>
              {/* The bar shrinks from right to left using scaleX + transformOrigin hack */}
              {/* We wrap in a container that anchors to the left edge */}
              <View style={styles.countdownBarWrapper}>
                <Animated.View
                  testID="voice-sheet-countdown-bar"
                  style={[styles.countdownBar, countdownBarStyle]}
                />
              </View>
            </View>

            {/* Undo button */}
            <TouchableOpacity
              testID="voice-sheet-undo"
              onPress={handleUndo}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              accessibilityLabel="Undo voice note"
              accessibilityRole="button"
            >
              <Text style={styles.undoText}>Undo</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    // No background colour — the rest of the screen stays visible
  },

  sheet: {
    backgroundColor: background.secondary,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.lg,
    // Shadow on iOS so the sheet floats above content
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.6)',
  },

  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  destinationIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },

  destinationLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: accent.primary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: ink.primary,
    marginBottom: spacing.xs,
    lineHeight: 22,
  },

  summary: {
    fontSize: fontSize.sm,
    color: ink.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },

  // ── Countdown row ──────────────────────────────────────────────────────────

  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  countdownTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.10)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },

  // Wrapper anchors the bar to the left so scaleX shrinks from right to left
  countdownBarWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    transformOrigin: 'left',
  },

  countdownBar: {
    flex: 1,
    backgroundColor: accent.primary,
    borderRadius: radius.full,
    // scaleX applied via animated style; transformOrigin 'left' means it collapses rightward
    transformOrigin: 'left',
  },

  undoText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: accent.primary,
    paddingVertical: spacing.xs,
  },
});
