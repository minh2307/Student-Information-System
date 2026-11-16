/**
 * AppIconButton.tsx
 * Standard Icon Action Button for REDS v2.0.
 * Guarantees minimum 48x48dp touch target (WCAG 2.1 AA), Android Ripple, and badge support.
 */

import React from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { tokens } from '@/theme';

export type IconButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type IconButtonShape = 'circular' | 'square';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface AppIconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  shape?: IconButtonShape;
  size?: IconButtonSize;
  disabled?: boolean;
  badgeCount?: number;
  hasBadgeDot?: boolean;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const AppIconButton: React.FC<AppIconButtonProps> = ({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'ghost',
  shape = 'circular',
  size = 'md',
  disabled = false,
  badgeCount,
  hasBadgeDot = false,
  style,
  testID,
}) => {
  const dimension = size === 'sm' ? 36 : size === 'lg' ? 54 : 48;
  const borderRadius = shape === 'circular' ? tokens.radius.full : tokens.radius.md;

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

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: tokens.brand.crimson,
        };
      case 'secondary':
        return {
          backgroundColor: tokens.surface.card,
          borderWidth: 1,
          borderColor: tokens.border.default,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: tokens.border.default,
        };
      case 'danger':
        return {
          backgroundColor: tokens.semantic.error.main,
        };
      case 'ghost':
      default:
        return {
          backgroundColor: 'transparent',
        };
    }
  };

  const displayBadgeText =
    badgeCount != null && badgeCount > 99 ? '99+' : badgeCount ? String(badgeCount) : null;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      android_ripple={
        disabled ? undefined : { color: getRippleColor(), borderless: shape === 'circular' }
      }
      hitSlop={size === 'sm' ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined}
      style={({ pressed }) => [
        styles.base,
        {
          width: dimension,
          height: dimension,
          borderRadius,
        },
        getVariantStyle(),
        pressed && Platform.OS !== 'android' ? { opacity: 0.7 } : null,
        disabled ? { opacity: 0.4 } : null,
        style,
      ]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      {icon}

      {/* Badge Count or Dot Notification Indicator */}
      {displayBadgeText ? (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{displayBadgeText}</Text>
        </View>
      ) : hasBadgeDot ? (
        <View style={styles.badgeDot} />
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: tokens.semantic.error.main,
    minWidth: 18,
    height: 18,
    borderRadius: tokens.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.semantic.error.main,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
