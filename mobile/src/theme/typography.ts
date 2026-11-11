/**
 * Centralized Design System - Typography Tokens
 * Standard system fonts with clear semantic scale for readability.
 */

import { TextStyle } from 'react-native';

export const typography = {
  sizes: {
    xxs: 10,
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    display: 30,
  },

  weights: {
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semiBold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    extraBold: '800' as TextStyle['fontWeight'],
  },

  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

export const textStyles: Record<string, TextStyle> = {
  display: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    lineHeight: 36,
  },
  h1: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    lineHeight: 30,
  },
  h2: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    lineHeight: 26,
  },
  h3: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    lineHeight: 24,
  },
  h4: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    lineHeight: 22,
  },
  bodyLarge: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.regular,
    lineHeight: 22,
  },
  body: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    lineHeight: 20,
  },
  bodyMedium: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    lineHeight: 20,
  },
  bodyBold: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    lineHeight: 20,
  },
  caption: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    lineHeight: 16,
  },
  captionBold: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    lineHeight: 16,
  },
  overline: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
};
