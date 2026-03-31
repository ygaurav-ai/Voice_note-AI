/**
 * hooks/useVoiceRecorder.ts
 *
 * State machine for the Phase 7 voice note pipeline.
 *
 * Responsibilities:
 *   1. Request microphone + speech recognition permissions
 *   2. Start / stop expo-speech-recognition recording
 *   3. Accumulate the transcript from interim + final results
 *   4. On stop, call processWithGemini to classify + extract the content
 *   5. Return the ProcessedVoiceNote result so the screen can save + show sheet
 *
 * State transitions:
 *
 *   idle
 *     └─ startRecording() ──► requesting
 *           └─ granted ──────► recording
 *           └─ denied ───────► error (2s) ──► idle
 *     └─ startRecording() (no-op if not idle)
 *
 *   recording
 *     └─ 'end' event ───────► processing (if transcript non-empty)
 *                          └► idle (if transcript empty)
 *     └─ 'error' event ─────► error (2s) ──► idle
 *     └─ stopRecording() ───► (triggers 'end' event above)
 *
 *   processing
 *     └─ Gemini success ────► idle (result is set; screen shows sheet)
 *     └─ Gemini failure ────► error (2s) ──► idle
 *
 *   error
 *     └─ 2s timeout ────────► idle (error is cleared)
 *
 * Usage:
 *   const { state, transcript, result, startRecording, stopRecording, reset } =
 *     useVoiceRecorder();
 *
 *   // Wire RecordButton press events:
 *   <RecordButton
 *     state={state}
 *     onPressIn={startRecording}
 *     onPressOut={stopRecording}
 *   />
 *
 *   // Watch result and save + show sheet:
 *   useEffect(() => {
 *     if (!result) return;
 *     // save to store, show VoiceProcessingSheet, then call reset()
 *   }, [result]);
 *
 * DEBUG TIP: If the 'end' event never fires, check that expo-speech-recognition
 * is configured as a plugin in app.json and that the iOS entitlements include
 * NSSpeechRecognitionUsageDescription and NSMicrophoneUsageDescription.
 */

import { useState, useRef, useCallback } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { processWithGemini } from '../services/processWithGemini';
import type { RecordingState, ProcessedVoiceNote } from '../types/voice';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseVoiceRecorderResult {
  /** Current pipeline state — drives RecordButton visual */
  state: RecordingState;
  /** Live partial transcript text accumulated during recording */
  transcript: string;
  /** Processed result from Gemini — set when processing succeeds, null otherwise */
  result: ProcessedVoiceNote | null;
  /** Human-readable error message — set on permission denial or API failure */
  error: string | null;
  /** Start recording — requests permissions if needed, then begins recognition */
  startRecording: () => Promise<void>;
  /** Stop recording — fires the 'end' event which triggers Gemini processing */
  stopRecording: () => void;
  /**
   * reset — clears result and error after the screen has handled the result.
   * Call this AFTER saving the result to the store, so the hook is ready for
   * the next recording session.
   */
  reset: () => void;
}

export function useVoiceRecorder(): UseVoiceRecorderResult {
  const [state, setState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<ProcessedVoiceNote | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ref so event handlers can read state without stale closure issues
  const isActiveRef = useRef(false);
  // Accumulates the best transcript text across all interim/final results
  const transcriptRef = useRef('');
  // Tracks the auto-reset timeout so we can clear it if needed
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helper: transition to error and auto-reset after 2s ─────────────────
  const handleError = useCallback((message: string) => {
    isActiveRef.current = false;
    setError(message);
    setState('error');

    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      setState('idle');
      setError(null);
    }, 2000);

    // DEBUG: console.debug('[useVoiceRecorder] error:', message);
  }, []);

  // ── Helper: call Gemini and store result ─────────────────────────────────
  const processTranscript = useCallback(async (text: string) => {
    setState('processing');
    try {
      const processed = await processWithGemini(text);
      setResult(processed);
      setState('idle');
      // DEBUG: console.debug('[useVoiceRecorder] processing done:', processed.destination, processed.title);
    } catch (err: any) {
      handleError(err?.message ?? 'AI processing failed');
    }
  }, [handleError]);

  // ── Speech recognition event: result ────────────────────────────────────
  // Fires repeatedly with partial and final transcript segments.
  // We take the highest-index result (most recent) and store the transcript.
  useSpeechRecognitionEvent('result', (event) => {
    if (!isActiveRef.current) return;

    // event.results is an array of recognition alternatives; index 0 is best
    const bestResult = event.results?.[0];
    if (bestResult?.transcript) {
      transcriptRef.current = bestResult.transcript;
      setTranscript(bestResult.transcript);
      // DEBUG: console.debug('[useVoiceRecorder] partial:', bestResult.transcript);
    }
  });

  // ── Speech recognition event: end ───────────────────────────────────────
  // Fires when recognition stops (after stopRecording or timeout).
  // This is where we hand off to Gemini.
  useSpeechRecognitionEvent('end', () => {
    if (!isActiveRef.current) return;
    isActiveRef.current = false;

    const finalText = transcriptRef.current.trim();
    if (!finalText) {
      // Nothing was captured — return to idle silently
      setState('idle');
      return;
    }

    // Hand off to Gemini — setState('processing') happens inside
    processTranscript(finalText);
  });

  // ── Speech recognition event: error ─────────────────────────────────────
  useSpeechRecognitionEvent('error', (event) => {
    if (!isActiveRef.current) return;
    // 'no-speech' is common and non-critical — treat it as empty recording
    if (event.error === 'no-speech') {
      isActiveRef.current = false;
      setState('idle');
      return;
    }
    handleError(event.message ?? 'Speech recognition error');
  });

  // ── startRecording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (state !== 'idle') return; // Guard: only start from idle

    setState('requesting');
    // DEBUG: console.debug('[useVoiceRecorder] requesting permissions');

    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        handleError('Microphone permission denied');
        return;
      }

      // Reset transcript accumulator before starting
      transcriptRef.current = '';
      setTranscript('');
      isActiveRef.current = true;
      setState('recording');

      await ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,  // Stream partial results for live display
        continuous: false,     // Stop automatically after a pause
        maxAlternatives: 1,
      });

      // DEBUG: console.debug('[useVoiceRecorder] recording started');
    } catch (err: any) {
      handleError(err?.message ?? 'Failed to start recording');
    }
  }, [state, handleError]);

  // ── stopRecording ────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (state !== 'recording') return;
    // Calling stop() triggers the 'end' event asynchronously
    ExpoSpeechRecognitionModule.stop();
    // DEBUG: console.debug('[useVoiceRecorder] stop requested');
  }, [state]);

  // ── reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setTranscript('');
    transcriptRef.current = '';
    isActiveRef.current = false;
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }, []);

  return {
    state,
    transcript,
    result,
    error,
    startRecording,
    stopRecording,
    reset,
  };
}
