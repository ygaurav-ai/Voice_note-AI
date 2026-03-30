/**
 * constants/colors.ts
 *
 * Central colour palette for the Thoughts app.
 *
 * Design intent: warm off-white surfaces, frosted glass cards, amber accents.
 * Every colour used anywhere in the app must come from here — no hardcoded
 * hex strings in components or screens.
 *
 * DEBUG TIP: If a surface looks wrong, check the alpha values on glass colours.
 * iOS BlurView tints are additive, so a too-opaque tint will hide the blur.
 */

// ---------------------------------------------------------------------------
// Background surfaces
// ---------------------------------------------------------------------------
export const background = {
  /** Main app background — warm off-white, slightly cream */
  primary: '#F5F0E8',
  /** Secondary surface, e.g. sheets and modals */
  secondary: '#EDE8DF',
  /** Elevated surface used for cards before blur is applied */
  elevated: '#FFFFFF',
};

// ---------------------------------------------------------------------------
// Glass / frosted card surfaces
// ---------------------------------------------------------------------------
export const glass = {
  /** Card background — white at low opacity, lets blur show through */
  card: 'rgba(255, 255, 255, 0.55)',
  /** Slightly more opaque for inputs and nav bar */
  surface: 'rgba(255, 255, 255, 0.70)',
  /** Border tint for glass cards — subtle white rim */
  border: 'rgba(255, 255, 255, 0.80)',
  /** Solid fallback for devices that don't support BlurView */
  fallback: 'rgba(245, 240, 232, 0.92)',
};

// ---------------------------------------------------------------------------
// Ink (text) colours
// ---------------------------------------------------------------------------
export const ink = {
  /** Primary text — near-black, warm undertone */
  primary: '#1A1612',
  /** Secondary text — softer, used for subtitles and dates */
  secondary: '#5C5346',
  /** Tertiary text — muted, used for placeholders */
  tertiary: '#9E9488',
  /** Disabled/completed text — very muted */
  disabled: '#C4BDB5',
};

// ---------------------------------------------------------------------------
// Accent — amber yellow, the app's signature highlight
// ---------------------------------------------------------------------------
export const accent = {
  /** Primary amber — active tab indicator, active tag chip, FAB icon */
  primary: '#F0B429',
  /** Lighter amber for soft backgrounds */
  light: '#FDE68A',
  /** Darker amber for pressed states */
  dark: '#D97706',
};

// ---------------------------------------------------------------------------
// Category tag colours
// Tag tints are used as card backgrounds (at low opacity) and tag pill fills.
// ---------------------------------------------------------------------------
export const tag = {
  work: {
    /** Golden yellow for Work notes */
    base: '#F59E0B',
    /** Light tint applied to the card background */
    tint: 'rgba(245, 158, 11, 0.12)',
    /** Pill background */
    pill: 'rgba(245, 158, 11, 0.18)',
    /** Pill text */
    text: '#92400E',
  },
  reading: {
    /** Teal for Reading notes */
    base: '#14B8A6',
    tint: 'rgba(20, 184, 166, 0.12)',
    pill: 'rgba(20, 184, 166, 0.18)',
    text: '#134E4A',
  },
  personal: {
    /** Warm orange for Personal notes */
    base: '#F97316',
    tint: 'rgba(249, 115, 22, 0.12)',
    pill: 'rgba(249, 115, 22, 0.18)',
    text: '#7C2D12',
  },
  ideas: {
    /** Soft white/neutral for Ideas — subtle on glass */
    base: '#A78BFA',
    tint: 'rgba(167, 139, 250, 0.12)',
    pill: 'rgba(167, 139, 250, 0.18)',
    text: '#4C1D95',
  },
};

// ---------------------------------------------------------------------------
// Priority colours — used for todo priority dots
// ---------------------------------------------------------------------------
export const priority = {
  high: {
    dot: '#EF4444',    // Red
    label: '#991B1B',
  },
  medium: {
    dot: '#F59E0B',    // Amber
    label: '#92400E',
  },
  low: {
    dot: '#22C55E',    // Green
    label: '#14532D',
  },
};

// ---------------------------------------------------------------------------
// UI chrome
// ---------------------------------------------------------------------------
export const chrome = {
  /** Bottom nav bar background (behind BlurView) */
  navBackground: 'rgba(245, 240, 232, 0.85)',
  /** Thin top border on the nav bar */
  navBorder: 'rgba(255, 255, 255, 0.60)',
  /** Divider lines between sections */
  divider: 'rgba(90, 80, 70, 0.12)',
  /** Tab icon — inactive state */
  tabInactive: '#9E9488',
  /** Tab icon — active state (amber) */
  tabActive: '#F0B429',
  /** Checkbox fill when ticked */
  checkboxFilled: '#F0B429',
  /** Checkbox border when empty */
  checkboxEmpty: '#C4BDB5',
};

// ---------------------------------------------------------------------------
// Semantic shortcuts — commonly referenced single values
// ---------------------------------------------------------------------------
export const COLORS = {
  background: background.primary,
  card: glass.card,
  textPrimary: ink.primary,
  textSecondary: ink.secondary,
  textMuted: ink.tertiary,
  accent: accent.primary,
  border: glass.border,
};
