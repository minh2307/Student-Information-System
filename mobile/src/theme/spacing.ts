/**
 * Centralized Design System - Spacing & Layout Tokens
 * Built upon an accessible 4pt / 8pt standard mobile grid.
 */

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,

  // Layout Insets
  screenHorizontal: 16,
  screenVertical: 16,
  cardPadding: 16,
  modalPadding: 20,

  // Touch Targets (minimum 44x44 or 48x48 on Android for accessibility)
  minTouchTarget: 48,
} as const;

export type SpacingTokens = typeof spacing;
