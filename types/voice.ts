/**
 * types/voice.ts
 *
 * Type definitions for the Phase 7 voice note pipeline.
 *
 * Pipeline overview:
 *   1. User presses RecordButton → expo-speech-recognition captures audio
 *   2. Transcript is sent to Gemini 2.5 Flash for classification + extraction
 *   3. Gemini returns a ProcessedVoiceNote (note OR todo destination)
 *   4. VoiceProcessingSheet shows the result for 4s with an Undo option
 *   5. Item is immediately saved to the store; undo deletes it
 *
 * All types in this file are pure data shapes — no React imports needed.
 *
 * DEBUG TIP: If Gemini returns unexpected destination values, add console.debug
 * inside processWithGemini to log the raw API response before parsing.
 */

import type { NoteTag, TodoPriority } from './index';

// ---------------------------------------------------------------------------
// Recording state machine
// ---------------------------------------------------------------------------

/**
 * RecordingState — the 5 UI states the RecordButton cycles through.
 *
 *   idle        → button visible, tap to begin
 *   requesting  → permission dialog shown to the user
 *   recording   → audio being captured; waveform bars animate
 *   processing  → transcript sent to Gemini; spinner shown
 *   error       → permission denied or API failure; auto-resets to idle in 2s
 */
export type RecordingState =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'processing'
  | 'error';

// ---------------------------------------------------------------------------
// Voice note destination
// ---------------------------------------------------------------------------

/**
 * VoiceNoteDestination — Gemini's routing decision.
 *   'note' → saved to the Notes library (has title + body + tag)
 *   'todo' → saved to the Todo list (has title + priority)
 */
export type VoiceNoteDestination = 'note' | 'todo';

// ---------------------------------------------------------------------------
// Intermediate capture item
// ---------------------------------------------------------------------------

/**
 * VoiceNoteItem — the partial transcript accumulated during recording.
 * Updated on every interim Speech Recognition result.
 * isFinal becomes true when the recogniser commits a final segment.
 */
export interface VoiceNoteItem {
  /** The transcript text recognised so far */
  transcript: string;
  /** True when the recogniser has committed this segment as final */
  isFinal: boolean;
}

// ---------------------------------------------------------------------------
// Processed result from Gemini
// ---------------------------------------------------------------------------

/**
 * ProcessedVoiceNote — the structured result returned by processWithGemini.
 *
 * Fields populated for 'note' destination:
 *   title, body, tag, summary, transcript
 *
 * Fields populated for 'todo' destination:
 *   title, priority, summary, transcript
 *
 * body and tag are undefined when destination === 'todo'.
 * priority is undefined when destination === 'note'.
 */
export interface ProcessedVoiceNote {
  /** AI routing decision — which screen / store action to use */
  destination: VoiceNoteDestination;

  /**
   * Short title (3–8 words) synthesised from the voice content.
   * Used as the note title or todo title.
   */
  title: string;

  /**
   * Full note body (note destination only).
   * Gemini expands and cleans the transcript into 2–4 well-formed sentences.
   * Omitted (undefined) for todo items.
   */
  body?: string;

  /**
   * Category tag for the note (note destination only).
   * Gemini infers from content: 'work' | 'reading' | 'personal' | 'ideas'.
   * Omitted (undefined) for todo items.
   */
  tag?: NoteTag;

  /**
   * Task priority (todo destination only).
   * Gemini infers urgency from the transcript: 'high' | 'medium' | 'low'.
   * Omitted (undefined) for note items.
   */
  priority?: TodoPriority;

  /**
   * AI-generated 1–2 sentence summary.
   * Stored on the Note / Todo as the summary field.
   */
  summary: string;

  /**
   * The raw transcript as captured by Speech Recognition.
   * Stored for debugging; not shown in the UI.
   */
  transcript: string;
}
