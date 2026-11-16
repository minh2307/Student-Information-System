/**
 * Centralized Design System - Master Theme (REDS v2.0)
 * Exposes coherent design tokens and standardized base styles for React Native StyleSheet.
 */

import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';
import { radius } from './radius';
import { typography, textStyles } from './typography';
import { elevation, shadows } from './elevation';
import { REDS_TOKENS } from './tokens';

export * from './colors';
export * from './spacing';
export * from './radius';
export * from './typography';
export * from './elevation';
export * from './tokens';

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  contentPadding: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.screenVertical,
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.surface.border,
    ...shadows.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: spacing.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  buttonSecondary: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: spacing.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  buttonSecondaryText: {
    color: colors.neutral[800],
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
  },
  input: {
    backgroundColor: colors.surface.input,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.neutral[900],
    minHeight: spacing.minTouchTarget,
  },
  inputError: {
    borderColor: colors.error.main,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
  },
});

export const theme = {
  ...REDS_TOKENS,
  commonStyles,
};

export default theme;
