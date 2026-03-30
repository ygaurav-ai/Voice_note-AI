/**
 * constants/spacing.ts
 *
 * Spacing scale and border radii for the Thoughts app.
 *
 * Design intent: generous padding inside cards, tight spacing between
 * small elements. All values are multiples of a 4dp base unit so
 * layouts align on a consistent grid.
 *
 * Usage:
 *   import { spacing, radius } from '../constants/spacing';
 *   style={{ padding: spacing.md, borderRadius: radius.card }}
 *
 * DEBUG TIP: If cards look cramped, check that you're using spacing.card*
 * values not spacing.sm for inner padding.
 */

// ---------------------------------------------------------------------------
// Base unit — all spacing values derive from this
// ---------------------------------------------------------------------------
const BASE = 4; // dp

// ---------------------------------------------------------------------------
// Spacing scale
// ---------------------------------------------------------------------------
export const spacing = {
  /** 2dp — hairline gaps, icon internal padding */
  xxs: BASE * 0.5,   // 2
  /** 4dp — tight gaps between inline elements */
  xs: BASE,          // 4
  /** 8dp — gaps between stacked small elements */
  sm: BASE * 2,      // 8
  /** 12dp — inner padding for compact components */
  md: BASE * 3,      // 12
  /** 16dp — standard inner padding for cards and sections */
  lg: BASE * 4,      // 16
  /** 20dp — larger card padding, section tops */
  xl: BASE * 5,      // 20
  /** 24dp — generous padding, screen-level horizontal margins */
  xxl: BASE * 6,     // 24
  /** 32dp — large section gaps */
  xxxl: BASE * 8,    // 32
  /** 48dp — hero spacing, large vertical gaps between sections */
  huge: BASE * 12,   // 48
  /** 64dp — very large layout gap */
  giant: BASE * 16,  // 64

  // --- Semantic shortcuts ---
  /** Horizontal screen margin */
  screenH: BASE * 5,  // 20
  /** Vertical screen margin (top/bottom of content) */
  screenV: BASE * 4,  // 16
  /** Inner horizontal padding on cards */
  cardH: BASE * 4,    // 16
  /** Inner vertical padding on cards */
  cardV: BASE * 3,    // 12
  /** Gap between cards in a grid */
  cardGap: BASE * 3,  // 12
  /** Height of the bottom navigation bar */
  navBarHeight: 72,
  /** Height of the top header row */
  headerHeight: 56,
  /** FAB (floating action button) size */
  fabSize: 56,
  /** Record button size */
  recordButtonSize: 48,
};

// ---------------------------------------------------------------------------
// Border radii
// ---------------------------------------------------------------------------
export const radius = {
  /** 4dp — small pill/chip elements */
  xs: 4,
  /** 8dp — small cards and compact elements */
  sm: 8,
  /** 12dp — medium cards */
  md: 12,
  /** 16dp — main note cards, sheets */
  lg: 16,
  /** 20dp — large floating cards (Home screen NoteCard) */
  xl: 20,
  /** 24dp — bottom sheet corners */
  xxl: 24,
  /** 999 — fully rounded (pills, checkboxes, FAB) */
  full: 999,

  // --- Semantic shortcuts ---
  /** Floating note card on Home */
  card: 20,
  /** Grid note card on Notes screen */
  gridCard: 16,
  /** Tag chip / filter chip */
  chip: 8,
  /** FAB button */
  fab: 999,
  /** Bottom sheet top corners */
  sheet: 24,
  /** Search bar */
  search: 12,
};
