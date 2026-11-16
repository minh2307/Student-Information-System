/**
 * AppCard.tsx
 * Standard Card Surface Primitive for REDS v2.0.
 * Provides clean surface layering, 1px subtle borders, elevations, and pressable ripple states.
 */

import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  Platform,
  StyleProp,
} from 'react-native';
import { tokens } from '@/theme';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface AppCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  radius = tokens.radius.lg,
  onPress,
  style,
  testID,
  accessibilityLabel,
}) => {
  const getPaddingValue = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return tokens.spacing.sm;
      case 'lg':
        return tokens.spacing.xl;
      case 'md':
      default:
        return tokens.spacing.lg;
    }
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: tokens.surface.card,
          borderWidth: 1,
          borderColor: tokens.border.subtle,
          ...tokens.elevation.md,
        };
      case 'outlined':
        return {
          backgroundColor: tokens.surface.card,
          borderWidth: 1,
          borderColor: tokens.border.default,
          ...tokens.elevation.none,
        };
      case 'flat':
        return {
          backgroundColor: tokens.surface.elevated,
          borderWidth: 0,
          ...tokens.elevation.none,
        };
      case 'default':
      default:
        return {
          backgroundColor: tokens.surface.card,
          borderWidth: 1,
          borderColor: tokens.border.subtle,
          ...tokens.elevation.sm,
        };
    }
  };

  const cardStyle: ViewStyle = {
    borderRadius: radius,
    padding: getPaddingValue(),
    ...getVariantStyle(),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.05)', borderless: false }}
        style={({ pressed }) => [
          cardStyle,
          pressed && Platform.OS !== 'android' ? { opacity: 0.85 } : null,
          style,
        ]}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[cardStyle, style]} testID={testID} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
};
