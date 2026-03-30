/**
 * constants/typography.ts
 *
 * Font sizes, line heights, and font weights for the Thoughts app.
 *
 * Design intent: clean, readable, slightly editorial. The type scale is
 * compact enough for dense note previews but generous enough to feel premium.
 *
 * We use the system font stack (San Francisco on iOS, Roboto on Android)
 * via fontFamily: undefined, which resolves to the platform default.
 *
 * Usage:
 *   import { fontSize, fontWeight, lineHeight } from '../constants/typography';
 *   style={{ fontSize: fontSize.body, fontWeight: fontWeight.regular }}
 *
 * DEBUG TIP: If text looks too heavy on Android, remember Android
 * renders '600' as bold — use fontWeight.semibold carefully on Android.
 */

// ---------------------------------------------------------------------------
// Font sizes — dp values
// ---------------------------------------------------------------------------
export const fontSize = {
  /** 11dp — fine print, timestamps in compact contexts */
  xxs: 11,
  /** 12dp — small labels, tag chips, timestamp */
  xs: 12,
  /** 13dp — secondary body text, metadata */
  sm: 13,
  /** 15dp — primary body text in notes */
  body: 15,
  /** 16dp — card titles, input fields */
  md: 16,
  /** 18dp — section headings */
  lg: 18,
  /** 20dp — screen titles */
  xl: 20,
  /** 24dp — large display numbers (e.g. task count) */
  xxl: 24,
  /** 28dp — hero text */
  display: 28,

  // --- Semantic shortcuts ---
  /** Note card title on Home screen */
  cardTitle: 16,
  /** Note card body preview */
  cardBody: 13,
  /** Tag chip label */
  chip: 12,
  /** Timestamp label */
  timestamp: 11,
  /** Todo item title */
  todoTitle: 15,
  /** Screen header title */
  screenTitle: 20,
  /** Bottom nav tab label */
  navLabel: 10,
};

// ---------------------------------------------------------------------------
// Font weights
// ---------------------------------------------------------------------------
export const fontWeight = {
  /** 400 — regular body copy */
  regular: '400' as const,
  /** 500 — slightly emphasised, secondary headings */
  medium: '500' as const,
  /** 600 — card titles, active labels */
  semibold: '600' as const,
  /** 700 — screen titles, strong headings */
  bold: '700' as const,
};

// ---------------------------------------------------------------------------
// Line heights — generous for readability
// ---------------------------------------------------------------------------
export const lineHeight = {
  /** Tight — for single-line headings */
  tight: 1.2,
  /** Normal — for body text labels */
  normal: 1.4,
  /** Relaxed — for multi-line body copy in notes */
  relaxed: 1.6,

  // Pre-computed absolute values for common text sizes:
  /** Body text line height (fontSize.body × 1.6) */
  body: 24,
  /** Card title line height (fontSize.cardTitle × 1.3) */
  cardTitle: 22,
  /** Card preview line height (fontSize.cardBody × 1.5) */
  cardBody: 20,
};

// ---------------------------------------------------------------------------
// Letter spacing (tracking)
// ---------------------------------------------------------------------------
export const letterSpacing = {
  /** Tight — display text */
  tight: -0.5,
  /** Normal — body copy */
  normal: 0,
  /** Wide — small caps labels, chip text */
  wide: 0.3,
  /** Wider — all-caps tab labels */
  wider: 0.5,
};
