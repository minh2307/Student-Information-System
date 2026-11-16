/**
 * AppBadge.tsx
 * Standard Badge / Chip Feedback Primitive for REDS v2.0.
 * Supports Semantic variants (success, warning, error, info) and Academic course palettes.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { tokens } from '@/theme';

export type BadgeVariant =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'academic';

export type BadgeStyleType = 'subtle' | 'solid';
export type BadgeSize = 'sm' | 'md';

export interface AppBadgeProps {
  label: string;
  variant?: BadgeVariant;
  styleType?: BadgeStyleType;
  size?: BadgeSize;
  icon?: React.ReactNode;
  academicIndex?: number;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  testID?: string;
}

export const AppBadge: React.FC<AppBadgeProps> = ({
  label,
  variant = 'neutral',
  styleType = 'subtle',
  size = 'md',
  icon,
  academicIndex = 0,
  style,
  textStyle,
  testID,
}) => {
  const getBadgeColors = (): { bg: string; border: string; text: string } => {
    if (variant === 'academic') {
      const academicList = tokens.semantic.academic;
      const palette = academicList[academicIndex % academicList.length];
      return {
        bg: palette.bg,
        border: palette.border,
        text: palette.text,
      };
    }

    if (styleType === 'solid') {
      switch (variant) {
        case 'primary':
          return { bg: tokens.brand.crimson, border: tokens.brand.crimson, text: '#FFFFFF' };
        case 'success':
          return { bg: tokens.semantic.success.main, border: tokens.semantic.success.main, text: '#FFFFFF' };
        case 'warning':
          return { bg: tokens.semantic.warning.main, border: tokens.semantic.warning.main, text: '#FFFFFF' };
        case 'error':
          return { bg: tokens.semantic.error.main, border: tokens.semantic.error.main, text: '#FFFFFF' };
        case 'info':
          return { bg: tokens.semantic.info.main, border: tokens.semantic.info.main, text: '#FFFFFF' };
        case 'neutral':
        default:
          return { bg: tokens.text.secondary, border: tokens.text.secondary, text: '#FFFFFF' };
      }
    }

    // Subtle variant (default)
    switch (variant) {
      case 'primary':
        return {
          bg: tokens.brand.crimsonLight,
          border: tokens.brand.primaryScale[200],
          text: tokens.brand.crimson,
        };
      case 'success':
        return {
          bg: tokens.semantic.success.light,
          border: tokens.semantic.success.border,
          text: tokens.semantic.success.dark,
        };
      case 'warning':
        return {
          bg: tokens.semantic.warning.light,
          border: tokens.semantic.warning.border,
          text: tokens.semantic.warning.dark,
        };
      case 'error':
        return {
          bg: tokens.semantic.error.light,
          border: tokens.semantic.error.border,
          text: tokens.semantic.error.dark,
        };
      case 'info':
        return {
          bg: tokens.semantic.info.light,
          border: tokens.semantic.info.border,
          text: tokens.semantic.info.dark,
        };
      case 'neutral':
      default:
        return {
          bg: tokens.surface.elevated,
          border: tokens.border.subtle,
          text: tokens.text.secondary,
        };
    }
  };

  const colors = getBadgeColors();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badgeBase,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingHorizontal: isSm ? tokens.spacing.xs : tokens.spacing.sm,
          paddingVertical: isSm ? 2 : 4,
          borderRadius: tokens.radius.full,
        },
        style,
      ]}
      testID={testID}
      accessibilityRole="text"
    >
      {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
      <Text
        style={[
          styles.badgeText,
          {
            color: colors.text,
            fontSize: isSm ? tokens.typography.sizes.xxs : tokens.typography.sizes.xs,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  iconWrapper: {
    marginRight: 4,
  },
  badgeText: {
    fontWeight: tokens.typography.weights.semiBold,
  },
});
