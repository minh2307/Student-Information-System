/**
 * Centralized Design System - Master Theme
 * Exposes coherent design tokens and standardized base styles for React Native StyleSheet.
 */

import { StyleSheet, ViewStyle } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';
import { radius } from './radius';
import { typography, textStyles } from './typography';

export const shadows = {
  none: {},
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  } as ViewStyle,
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  } as ViewStyle,
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  contentPadding: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.screenVertical,
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.primary[800],
    borderRadius: radius.lg,
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
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
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
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  textStyles,
  shadows,
  commonStyles,
} as const;

export default theme;
export * from './colors';
export * from './spacing';
export * from './radius';
export * from './typography';
