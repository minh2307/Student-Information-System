/**
 * Design Tokens Unit Tests (REDS v2.0)
 * Validates Color Tokens, Typography Scale, Spacing Scale, Radius, and Elevation.
 */

import { colors, typography, spacing, radius, elevation, shadows, textStyles } from '@/theme';
import { REDS_TOKENS, tokens } from '@/theme/tokens';

describe('REDS v2.0 Design Tokens Foundation', () => {
  describe('1. Color Tokens Specification', () => {
    it('defines brand colors with Burgundy #7F1D1D and Primary #991B1B', () => {
      expect(colors.primary[800]).toBe('#991B1B');
      expect(colors.primary[900]).toBe('#7F1D1D');
      expect(colors.brand).toBe('#991B1B');
      expect(colors.burgundy).toBe('#7F1D1D');
    });

    it('contains full primary scale from 50 to 950', () => {
      const expectedKeys = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
      expectedKeys.forEach((key) => {
        expect(colors.primary[key]).toBeDefined();
        expect(colors.primary[key]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('defines semantic status colors with 4 contrast-conscious states', () => {
      const statuses = ['success', 'warning', 'error', 'info', 'offline'] as const;
      statuses.forEach((status) => {
        expect(colors[status]).toBeDefined();
        expect(colors[status].light).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors[status].main).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors[status].dark).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors[status].border).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('provides academic course categorization palette for timetables', () => {
      expect(colors.academic).toHaveLength(6);
      expect(colors.academicNamed.blueSapphire).toBeDefined();
      expect(colors.academicNamed.emeraldGreen).toBeDefined();
      expect(colors.academicNamed.amberGold).toBeDefined();
      expect(colors.academicNamed.purpleAmethyst).toBeDefined();
      expect(colors.academicNamed.roseRuby).toBeDefined();
    });

    it('defines neutral surface colors with background and card tokens', () => {
      expect(colors.surface.background).toBe('#F8FAFC');
      expect(colors.surface.card).toBe('#FFFFFF');
      expect(colors.neutral[0]).toBe('#FFFFFF');
      expect(colors.neutral[50]).toBe('#F8FAFC');
      expect(colors.neutral[900]).toBe('#0F172A');
    });
  });

  describe('2. Typography Scale Specification', () => {
    it('defines 12 semantic font sizes including display and overline', () => {
      expect(typography.sizes.display).toBe(32);
      expect(typography.sizes.h1).toBe(26);
      expect(typography.sizes.h2).toBe(22);
      expect(typography.sizes.h3).toBe(18);
      expect(typography.sizes.h4).toBe(16);
      expect(typography.sizes.bodyLarge).toBe(16);
      expect(typography.sizes.body).toBe(14);
      expect(typography.sizes.caption).toBe(12);
      expect(typography.sizes.overline).toBe(10);
    });

    it('defines font weights from regular to extraBold', () => {
      expect(typography.weights.regular).toBe('400');
      expect(typography.weights.medium).toBe('500');
      expect(typography.weights.semiBold).toBe('600');
      expect(typography.weights.bold).toBe('700');
    });

    it('exports textStyles matching semantic text variants', () => {
      expect(textStyles.display.fontSize).toBe(32);
      expect(textStyles.h1.fontSize).toBe(26);
      expect(textStyles.body.fontSize).toBe(14);
      expect(textStyles.caption.fontSize).toBe(12);
      expect(textStyles.overline.textTransform).toBe('uppercase');
    });
  });

  describe('3. Spacing & Touch Target Specification', () => {
    it('implements 4pt / 8pt standard mobile grid', () => {
      expect(spacing.none).toBe(0);
      expect(spacing.xxs).toBe(2);
      expect(spacing.xs).toBe(4);
      expect(spacing.sm).toBe(8);
      expect(spacing.md).toBe(12);
      expect(spacing.lg).toBe(16);
      expect(spacing.xl).toBe(20);
      expect(spacing.xxl).toBe(24);
      expect(spacing.xxxl).toBe(32);
    });

    it('enforces minimum touch target of 48dp for Android compliance', () => {
      expect(spacing.minTouchTarget).toBe(48);
      expect(tokens.touchTarget.min).toBe(48);
    });
  });

  describe('4. Border Radius Specification', () => {
    it('defines radii scale from sm to full', () => {
      expect(radius.sm).toBe(8);
      expect(radius.md).toBe(12);
      expect(radius.lg).toBe(16);
      expect(radius.xl).toBe(20);
      expect(radius.xxl).toBe(24);
      expect(radius.full).toBe(9999);
    });
  });

  describe('5. Elevation & Shadow Specification', () => {
    it('defines elevation ViewStyle objects for Android and iOS', () => {
      expect(elevation.none.elevation).toBe(0);
      expect(elevation.sm.elevation).toBe(1.5);
      expect(elevation.md.elevation).toBe(3);
      expect(elevation.lg.elevation).toBe(6);
      expect(elevation.floating.elevation).toBe(8);

      expect(shadows.sm.shadowRadius).toBeDefined();
      expect(shadows.md.shadowOpacity).toBeDefined();
    });
  });

  describe('6. Master Registry Tokens Alias', () => {
    it('REDS_TOKENS and tokens expose complete tokens tree', () => {
      expect(tokens.brand.crimson).toBe('#991B1B');
      expect(tokens.brand.burgundy).toBe('#7F1D1D');
      expect(tokens.brand.primaryScale[200]).toBe('#FECDD3');
      expect(tokens.surface.canvas).toBe('#F8FAFC');
      expect(tokens.border.default).toBe('#E2E8F0');
      expect(tokens.text.primary).toBe('#1E293B');
      expect(tokens.semantic.success.main).toBe('#10B981');
      expect(REDS_TOKENS).toBe(tokens);
    });
  });
});
