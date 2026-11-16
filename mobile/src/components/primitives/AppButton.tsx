/**
 * AppButton.tsx
 * Standard Action Button Component for REDS v2.0.
 * Implements Android Native Ripple, 48dp minimum touch target, accessibility and states.
 */

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { tokens } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  testID?: string;
  accessibilityLabel?: string;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}) => {
  const isActionDisabled = disabled || isLoading;

  // Resolve Ripple Color for Android
  const getRippleColor = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return 'rgba(255, 255, 255, 0.25)';
      case 'secondary':
      case 'outline':
      case 'ghost':
      default:
        return 'rgba(153, 27, 27, 0.12)';
    }
  };

  // Resolve Container Style
  const getContainerStyle = (pressed: boolean): ViewStyle => {
    const sizeStyle = sizeStyles[size];
    const variantStyle = variantStyles[variant];

    return {
      ...sizeStyle.container,
      ...variantStyle.container,
      ...(fullWidth ? { width: '100%' } : {}),
      ...(pressed && Platform.OS !== 'android' ? { opacity: 0.8 } : {}),
      ...(isActionDisabled ? { opacity: 0.55 } : {}),
    };
  };

  // Resolve Text Style
  const getTextStyle = (): TextStyle => {
    const sizeStyle = sizeStyles[size];
    const variantStyle = variantStyles[variant];

    return {
      ...sizeStyle.text,
      ...variantStyle.text,
    };
  };

  return (
    <Pressable
      onPress={isActionDisabled ? undefined : onPress}
      disabled={isActionDisabled}
      android_ripple={
        isActionDisabled
          ? undefined
          : { color: getRippleColor(), borderless: false }
      }
      hitSlop={size === 'sm' ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined}
      style={({ pressed }) => [getContainerStyle(pressed), style]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isActionDisabled, busy: isLoading }}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : tokens.brand.crimson}
        />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon ? <View style={styles.leftIconContainer}>{leftIcon}</View> : null}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          {rightIcon ? <View style={styles.rightIconContainer}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIconContainer: {
    marginRight: tokens.spacing.sm,
  },
  rightIconContainer: {
    marginLeft: tokens.spacing.sm,
  },
});

const sizeStyles = {
  sm: {
    container: {
      height: 36,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radius.sm,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    text: {
      fontSize: tokens.typography.sizes.xs,
      fontWeight: tokens.typography.weights.semiBold,
    },
  },
  md: {
    container: {
      minHeight: tokens.touchTarget.min, // 48dp min touch target
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.lg,
      borderRadius: tokens.radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    text: {
      fontSize: tokens.typography.sizes.sm,
      fontWeight: tokens.typography.weights.bold,
    },
  },
  lg: {
    container: {
      minHeight: 54,
      paddingVertical: tokens.spacing.lg,
      paddingHorizontal: tokens.spacing.xl,
      borderRadius: tokens.radius.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    text: {
      fontSize: tokens.typography.sizes.md,
      fontWeight: tokens.typography.weights.bold,
    },
  },
};

const variantStyles = {
  primary: {
    container: {
      backgroundColor: tokens.brand.crimson,
    },
    text: {
      color: tokens.text.inverse,
    },
  },
  secondary: {
    container: {
      backgroundColor: tokens.surface.card,
      borderWidth: 1,
      borderColor: tokens.border.default,
    },
    text: {
      color: tokens.text.primary,
    },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: tokens.brand.crimson,
    },
    text: {
      color: tokens.brand.crimson,
    },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    text: {
      color: tokens.brand.crimson,
    },
  },
  danger: {
    container: {
      backgroundColor: tokens.semantic.error.button, // Red 600 (#DC2626) achieves WCAG AA 4.83:1 contrast with white text
    },
    text: {
      color: tokens.text.inverse,
    },
  },
};
