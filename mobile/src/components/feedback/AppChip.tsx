/**
 * AppChip.tsx
 * Standard Interactive Filter / Selector Chip for REDS v2.0.
 * Guarantees minimum 48dp touch target via hitSlop, Android Native Ripple, and clear active states.
 */

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { tokens } from '@/theme';

export interface AppChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'neutral';
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  testID?: string;
  accessibilityLabel?: string;
}

export const AppChip: React.FC<AppChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
  testID = 'app-chip',
  accessibilityLabel,
}) => {
  const isInteractive = Boolean(onPress && !disabled);

  const getBackgroundColor = () => {
    if (selected) {
      return tokens.brand.crimson;
    }
    switch (variant) {
      case 'secondary':
        return tokens.surface.card;
      case 'neutral':
      default:
        return tokens.surface.canvas;
    }
  };

  const getBorderColor = () => {
    if (selected) {
      return tokens.brand.crimson;
    }
    return tokens.border.default;
  };

  const getTextColor = () => {
    if (selected) {
      return tokens.text.inverse;
    }
    return tokens.text.primary;
  };

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.chipContainer,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          opacity: disabled ? 0.5 : 1,
        },
        pressed && isInteractive && styles.chipPressed,
        style,
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      android_ripple={
        isInteractive
          ? {
              color: selected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(153, 27, 27, 0.12)',
              borderless: false,
            }
          : undefined
      }
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel || label}
      testID={testID}
    >
      {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
      <Text
        style={[
          styles.chipLabel,
          { color: getTextColor() },
          selected && styles.chipLabelSelected,
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    minHeight: 36, // HitSlop expands touch target to >= 48dp
    alignSelf: 'flex-start',
  },
  chipPressed: {
    opacity: Platform.OS === 'ios' ? 0.8 : 1,
  },
  iconWrapper: {
    marginRight: tokens.spacing.xs,
  },
  chipLabel: {
    fontSize: tokens.typography.sizes.sm,
    fontWeight: tokens.typography.weights.medium,
    lineHeight: 18,
  },
  chipLabelSelected: {
    fontWeight: tokens.typography.weights.bold,
  },
});

export default AppChip;
