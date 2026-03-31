/**
 * services/processWithGemini.ts
 *
 * Sends a voice transcript to Gemini 2.5 Flash and returns a structured
 * ProcessedVoiceNote (destination, title, body/priority, tag, summary).
 *
 * Gemini decides whether the transcript is a Note or a Todo, then extracts
 * and cleans the relevant fields. The caller (useVoiceRecorder hook) receives
 * the result and passes it to VoiceProcessingSheet for user confirmation.
 *
 * API endpoint:
 *   POST https://generativelanguage.googleapis.com/v1beta/models/
 *        gemini-2.5-flash:generateContent?key={EXPO_PUBLIC_GEMINI_API_KEY}
 *
 * Key: set EXPO_PUBLIC_GEMINI_API_KEY in .env (Expo SDK 49+ requires the
 * EXPO_PUBLIC_ prefix for env vars to be bundled into the JS runtime).
 *
 * Response format: JSON via responseMimeType = 'application/json'.
 * A JSON schema is passed so Gemini always returns well-typed output.
 *
 * Error handling:
 *   - Network / HTTP errors throw GeminiError (a typed Error subclass)
 *   - Malformed JSON throws GeminiError wrapping the parse error
 *   - Missing required fields apply safe fallbacks before returning
 *
 * DEBUG TIP: If you get unexpected classification results, uncomment the
 * console.debug lines to inspect the raw Gemini response JSON.
 */

import type { ProcessedVoiceNote, VoiceNoteDestination } from '../types/voice';
import type { NoteTag, TodoPriority } from '../types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Read lazily inside the function so process.env changes (e.g. in tests) are picked up.
// Do NOT hoist to module level — EXPO_PUBLIC_ vars are inlined by the bundler at build
// time, but in Jest they come from process.env and must be read at call time.
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// ---------------------------------------------------------------------------
// Prompt + schema
// ---------------------------------------------------------------------------

const SYSTEM_INSTRUCTION = `You are a voice note classifier for a personal productivity app.
Given a spoken transcript, decide if it should be a Note or a Todo task, then extract structured data.

Rules for classification:
- "note" → reflective content, ideas, information to save, reading recommendations, journal entries
- "todo" → tasks, action items, things to do/buy/complete, reminders, appointments

Tag inference for notes:
- "work"     → meetings, projects, work topics, career, professional tasks
- "reading"  → books, articles, research, anything to read or study
- "personal" → personal thoughts, diary, health, relationships, life goals
- "ideas"    → creative ideas, inventions, brainstorming, concepts

Priority inference for todos:
- "high"   → urgent, ASAP, today, critical, important, deadline today
- "medium" → soon, this week, should do, next (default if unclear)
- "low"    → someday, eventually, nice to have, low urgency

Output rules:
- title: concise 3–8 word summary of the main point
- body (notes only): expand the transcript into 2–4 well-formed sentences of prose
- summary: 1–2 sentences describing the key takeaway
- Always return valid JSON matching the schema exactly`;

/**
 * JSON schema passed to Gemini's response_schema field.
 * This forces Gemini to return the exact shape we expect.
 */
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    destination: {
      type: 'string',
      enum: ['note', 'todo'],
      description: 'Whether to save as a note or a todo task',
    },
    title: {
      type: 'string',
      description: '3-8 word title summarising the content',
    },
    body: {
      type: 'string',
      description: 'Full note body — 2-4 sentences (note destination only)',
    },
    tag: {
      type: 'string',
      enum: ['work', 'reading', 'personal', 'ideas'],
      description: 'Category tag (note destination only)',
    },
    priority: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'Task urgency (todo destination only)',
    },
    summary: {
      type: 'string',
      description: '1-2 sentence AI summary',
    },
  },
  required: ['destination', 'title', 'summary'],
};

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/** Typed error thrown by processWithGemini on API or parse failures. */
export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * processWithGemini — classifies + extracts a voice transcript via Gemini 2.5 Flash.
 *
 * @param transcript - The raw text from Speech Recognition
 * @returns ProcessedVoiceNote with destination, title, body/priority, tag, summary
 * @throws GeminiError on network failure, non-2xx response, or malformed JSON
 */
export async function processWithGemini(transcript: string): Promise<ProcessedVoiceNote> {
  // Read env var at call time so Jest tests can set process.env in beforeEach
  const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

  if (!GEMINI_API_KEY) {
    throw new GeminiError(
      'EXPO_PUBLIC_GEMINI_API_KEY is not set. Add it to your .env file.'
    );
  }

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        parts: [{ text: `Voice transcript: "${transcript}"` }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,  // Low temperature for consistent structured output
      maxOutputTokens: 512,
    },
  };

  let response: Response;
  try {
    response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError) {
    throw new GeminiError('Network request to Gemini failed', networkError);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error');
    throw new GeminiError(
      `Gemini API returned HTTP ${response.status}: ${errorText}`
    );
  }

  let responseJson: any;
  try {
    responseJson = await response.json();
  } catch (parseError) {
    throw new GeminiError('Failed to parse Gemini API response as JSON', parseError);
  }

  // Extract the generated text from the Gemini response envelope
  const generatedText: string | undefined =
    responseJson?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedText) {
    throw new GeminiError('Gemini response contained no generated text');
  }

  // DEBUG: console.debug('[processWithGemini] raw response text:', generatedText);

  let parsed: any;
  try {
    parsed = JSON.parse(generatedText);
  } catch (jsonError) {
    throw new GeminiError(
      'Gemini returned text that is not valid JSON',
      jsonError
    );
  }

  // Validate and apply safe fallbacks for required fields
  const destination: VoiceNoteDestination =
    parsed.destination === 'note' || parsed.destination === 'todo'
      ? parsed.destination
      : 'note'; // default to note if Gemini returns an unexpected value

  const title: string =
    typeof parsed.title === 'string' && parsed.title.trim()
      ? parsed.title.trim()
      : transcript.slice(0, 60); // fallback to first 60 chars of transcript

  const summary: string =
    typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : title;

  // Note-specific fields
  const body: string | undefined =
    destination === 'note'
      ? typeof parsed.body === 'string' && parsed.body.trim()
        ? parsed.body.trim()
        : transcript // fallback to raw transcript if body is missing
      : undefined;

  const validTags: NoteTag[] = ['work', 'reading', 'personal', 'ideas'];
  const tag: NoteTag | undefined =
    destination === 'note'
      ? validTags.includes(parsed.tag) ? parsed.tag : 'ideas'
      : undefined;

  // Todo-specific fields
  const validPriorities: TodoPriority[] = ['high', 'medium', 'low'];
  const priority: TodoPriority | undefined =
    destination === 'todo'
      ? validPriorities.includes(parsed.priority) ? parsed.priority : 'medium'
      : undefined;

  // DEBUG: console.debug('[processWithGemini] result:', { destination, title, tag, priority });

  return {
    destination,
    title,
    body,
    tag,
    priority,
    summary,
    transcript,
  };
}
