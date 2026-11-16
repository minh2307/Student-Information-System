/**
 * Centralized Design System - Typography Tokens (REDS v2.0)
 * Standard system fonts with clear semantic scale for Vietnamese readability.
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
    display: 32, // Display hero score (C-GPA, Tuition)
    h1: 26,      // Page headers
    h2: 22,      // Section hero / Pass title
    h3: 18,      // Section title
    h4: 16,      // Card heading / Course name
    bodyLarge: 16,
    body: 14,
    bodyMedium: 14,
    bodyBold: 14,
    caption: 12,
    captionBold: 12,
    overline: 10,
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
    lineHeight: 40,
  },
  h1: {
    fontSize: typography.sizes.h1,
    fontWeight: typography.weights.bold,
    lineHeight: 34,
  },
  h2: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    lineHeight: 28,
  },
  h3: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semiBold,
    lineHeight: 24,
  },
  h4: {
    fontSize: typography.sizes.h4,
    fontWeight: typography.weights.semiBold,
    lineHeight: 22,
  },
  bodyLarge: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.regular,
    lineHeight: 24,
  },
  body: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.regular,
    lineHeight: 20,
  },
  bodyMedium: {
    fontSize: typography.sizes.bodyMedium,
    fontWeight: typography.weights.medium,
    lineHeight: 20,
  },
  bodyBold: {
    fontSize: typography.sizes.bodyBold,
    fontWeight: typography.weights.bold,
    lineHeight: 20,
  },
  caption: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    lineHeight: 16,
  },
  captionBold: {
    fontSize: typography.sizes.captionBold,
    fontWeight: typography.weights.semiBold,
    lineHeight: 16,
  },
  overline: {
    fontSize: typography.sizes.overline,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
};

export type TypographyTokens = typeof typography;
