/**
 * __tests__/phase1.constants.test.ts
 *
 * Phase 1 — Design token tests.
 *
 * Tests that colors, spacing, and typography constants:
 *   - Export the expected keys
 *   - Contain valid values (numbers > 0 for spacing, valid hex/rgba strings for colours)
 *   - Semantic shortcuts point to actual values (not undefined)
 *
 * These tests act as a contract: if a design token is renamed or removed,
 * these tests fail immediately — preventing silent breakage in components.
 */

import * as Colors from '../constants/colors';
import { spacing, radius } from '../constants/spacing';
import { fontSize, fontWeight, lineHeight, letterSpacing } from '../constants/typography';

// ---------------------------------------------------------------------------
// Colour palette tests
// ---------------------------------------------------------------------------

describe('constants/colors — background', () => {
  it('exports background.primary as a non-empty string', () => {
    expect(typeof Colors.background.primary).toBe('string');
    expect(Colors.background.primary.length).toBeGreaterThan(0);
  });

  it('background.primary is a valid hex colour', () => {
    expect(Colors.background.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('exports background.secondary and background.elevated', () => {
    expect(Colors.background.secondary).toBeDefined();
    expect(Colors.background.elevated).toBeDefined();
  });
});

describe('constants/colors — glass', () => {
  it('glass.card is a valid rgba string', () => {
    expect(Colors.glass.card).toMatch(/^rgba\(/);
  });

  it('all glass keys are defined', () => {
    expect(Colors.glass.card).toBeDefined();
    expect(Colors.glass.surface).toBeDefined();
    expect(Colors.glass.border).toBeDefined();
    expect(Colors.glass.fallback).toBeDefined();
  });
});

describe('constants/colors — ink', () => {
  it('all ink text colours are defined', () => {
    expect(Colors.ink.primary).toBeDefined();
    expect(Colors.ink.secondary).toBeDefined();
    expect(Colors.ink.tertiary).toBeDefined();
    expect(Colors.ink.disabled).toBeDefined();
  });

  it('ink.primary is a valid hex colour', () => {
    expect(Colors.ink.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe('constants/colors — accent', () => {
  it('accent.primary is the amber yellow hex', () => {
    expect(Colors.accent.primary).toBe('#F0B429');
  });

  it('all accent variants are defined', () => {
    expect(Colors.accent.light).toBeDefined();
    expect(Colors.accent.dark).toBeDefined();
  });
});

describe('constants/colors — tag colours', () => {
  const tags = ['work', 'reading', 'personal', 'ideas'] as const;

  tags.forEach((tag) => {
    it(`tag.${tag} has base, tint, pill, and text keys`, () => {
      expect(Colors.tag[tag].base).toBeDefined();
      expect(Colors.tag[tag].tint).toBeDefined();
      expect(Colors.tag[tag].pill).toBeDefined();
      expect(Colors.tag[tag].text).toBeDefined();
    });
  });
});

describe('constants/colors — priority colours', () => {
  const priorities = ['high', 'medium', 'low'] as const;

  priorities.forEach((p) => {
    it(`priority.${p} has dot and label keys`, () => {
      expect(Colors.priority[p].dot).toBeDefined();
      expect(Colors.priority[p].label).toBeDefined();
    });
  });

  it('priority.high.dot is red', () => {
    expect(Colors.priority.high.dot).toBe('#EF4444');
  });

  it('priority.low.dot is green', () => {
    expect(Colors.priority.low.dot).toBe('#22C55E');
  });
});

describe('constants/colors — COLORS shortcut object', () => {
  it('COLORS.background is defined and matches background.primary', () => {
    expect(Colors.COLORS.background).toBe(Colors.background.primary);
  });

  it('COLORS.accent is defined and matches accent.primary', () => {
    expect(Colors.COLORS.accent).toBe(Colors.accent.primary);
  });

  it('all COLORS keys are defined', () => {
    expect(Colors.COLORS.background).toBeDefined();
    expect(Colors.COLORS.card).toBeDefined();
    expect(Colors.COLORS.textPrimary).toBeDefined();
    expect(Colors.COLORS.textSecondary).toBeDefined();
    expect(Colors.COLORS.textMuted).toBeDefined();
    expect(Colors.COLORS.accent).toBeDefined();
    expect(Colors.COLORS.border).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Spacing tests
// ---------------------------------------------------------------------------

describe('constants/spacing — spacing scale', () => {
  it('all spacing values are positive numbers', () => {
    const keys = Object.keys(spacing) as Array<keyof typeof spacing>;
    keys.forEach((key) => {
      expect(typeof spacing[key]).toBe('number');
      expect(spacing[key]).toBeGreaterThan(0);
    });
  });

  it('spacing.xs < spacing.sm < spacing.md < spacing.lg < spacing.xl', () => {
    expect(spacing.xs).toBeLessThan(spacing.sm);
    expect(spacing.sm).toBeLessThan(spacing.md);
    expect(spacing.md).toBeLessThan(spacing.lg);
    expect(spacing.lg).toBeLessThan(spacing.xl);
  });

  it('spacing.fabSize is 56', () => {
    expect(spacing.fabSize).toBe(56);
  });

  it('semantic shortcuts are defined', () => {
    expect(spacing.screenH).toBeDefined();
    expect(spacing.screenV).toBeDefined();
    expect(spacing.cardH).toBeDefined();
    expect(spacing.cardV).toBeDefined();
    expect(spacing.cardGap).toBeDefined();
    expect(spacing.navBarHeight).toBeDefined();
  });
});

describe('constants/spacing — radius scale', () => {
  it('all radius values are non-negative numbers', () => {
    const keys = Object.keys(radius) as Array<keyof typeof radius>;
    keys.forEach((key) => {
      expect(typeof radius[key]).toBe('number');
      expect(radius[key]).toBeGreaterThanOrEqual(0);
    });
  });

  it('radius.xs < radius.sm < radius.md < radius.lg < radius.xl', () => {
    expect(radius.xs).toBeLessThan(radius.sm);
    expect(radius.sm).toBeLessThan(radius.md);
    expect(radius.md).toBeLessThan(radius.lg);
    expect(radius.lg).toBeLessThan(radius.xl);
  });

  it('radius.full is 999 (fully rounded)', () => {
    expect(radius.full).toBe(999);
  });

  it('semantic radius shortcuts are defined', () => {
    expect(radius.card).toBeDefined();
    expect(radius.gridCard).toBeDefined();
    expect(radius.chip).toBeDefined();
    expect(radius.fab).toBeDefined();
    expect(radius.sheet).toBeDefined();
    expect(radius.search).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Typography tests
// ---------------------------------------------------------------------------

describe('constants/typography — font sizes', () => {
  it('all font sizes are positive numbers', () => {
    const keys = Object.keys(fontSize) as Array<keyof typeof fontSize>;
    keys.forEach((key) => {
      expect(typeof fontSize[key]).toBe('number');
      expect(fontSize[key]).toBeGreaterThan(0);
    });
  });

  it('font sizes increase from xxs to display', () => {
    expect(fontSize.xxs).toBeLessThan(fontSize.xs);
    expect(fontSize.xs).toBeLessThan(fontSize.sm);
    expect(fontSize.sm).toBeLessThan(fontSize.body);
    expect(fontSize.body).toBeLessThan(fontSize.xl);
    expect(fontSize.xl).toBeLessThan(fontSize.display);
  });

  it('semantic shortcuts are defined and positive', () => {
    expect(fontSize.cardTitle).toBeGreaterThan(0);
    expect(fontSize.cardBody).toBeGreaterThan(0);
    expect(fontSize.chip).toBeGreaterThan(0);
    expect(fontSize.timestamp).toBeGreaterThan(0);
    expect(fontSize.todoTitle).toBeGreaterThan(0);
    expect(fontSize.screenTitle).toBeGreaterThan(0);
    expect(fontSize.navLabel).toBeGreaterThan(0);
  });
});

describe('constants/typography — font weights', () => {
  it('fontWeight values are string representations of CSS weights', () => {
    expect(fontWeight.regular).toBe('400');
    expect(fontWeight.medium).toBe('500');
    expect(fontWeight.semibold).toBe('600');
    expect(fontWeight.bold).toBe('700');
  });
});

describe('constants/typography — line heights', () => {
  it('relative line heights (tight, normal, relaxed) are reasonable multipliers', () => {
    expect(lineHeight.tight).toBeGreaterThan(1);
    expect(lineHeight.tight).toBeLessThan(lineHeight.normal);
    expect(lineHeight.normal).toBeLessThan(lineHeight.relaxed);
  });

  it('absolute line heights are positive', () => {
    expect(lineHeight.body).toBeGreaterThan(0);
    expect(lineHeight.cardTitle).toBeGreaterThan(0);
    expect(lineHeight.cardBody).toBeGreaterThan(0);
  });
});

describe('constants/typography — letter spacing', () => {
  it('tight letterSpacing is negative (condensed)', () => {
    expect(letterSpacing.tight).toBeLessThan(0);
  });

  it('normal letterSpacing is 0', () => {
    expect(letterSpacing.normal).toBe(0);
  });

  it('wide > normal, wider > wide', () => {
    expect(letterSpacing.wide).toBeGreaterThan(letterSpacing.normal);
    expect(letterSpacing.wider).toBeGreaterThan(letterSpacing.wide);
  });
});
