/**
 * AppHeader.tsx
 * Standard Navigation Header Primitive for REDS v2.0.
 * Supports Burgundy Brand Header and White Surface Header with Safe Area Top insets.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';

export type HeaderVariant = 'burgundy' | 'surface';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  variant?: HeaderVariant;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
  centerTitle?: boolean;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  variant = 'burgundy',
  showBackButton = false,
  onBackPress,
  rightActions,
  centerTitle = false,
  style,
  testID = 'app-header',
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const isBurgundy = variant === 'burgundy';
  const textColor = isBurgundy ? tokens.text.inverse : tokens.text.primary;
  const subtitleColor = isBurgundy ? tokens.brand.primaryScale[200] : tokens.text.muted;
  const iconColor = isBurgundy ? tokens.text.inverse : tokens.text.primary;

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: isBurgundy ? tokens.brand.burgundy : tokens.surface.card,
          borderBottomWidth: isBurgundy ? 0 : 1,
          borderBottomColor: tokens.border.subtle,
        },
        style,
      ]}
      testID={testID}
      accessibilityRole="header"
    >
      <View style={styles.contentRow}>
        {/* Left Action / Back Button */}
        {showBackButton ? (
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            testID={`${testID}-back-button`}
          >
            <Ionicons name="arrow-back" size={24} color={iconColor} />
          </Pressable>
        ) : null}

        {/* Title & Subtitle */}
        <View style={[styles.titleWrapper, centerTitle ? styles.titleCentered : null]}>
          <Text style={[styles.titleText, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitleText, { color: subtitleColor }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right Actions */}
        {rightActions ? <View style={styles.rightActionsWrapper}>{rightActions}</View> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    minHeight: 56,
    paddingHorizontal: tokens.spacing.lg,
    justifyContent: 'center',
    ...tokens.elevation.sm,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  backButton: {
    width: tokens.touchTarget.min,
    height: tokens.touchTarget.min,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginRight: tokens.spacing.xs,
  },
  titleWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  titleCentered: {
    alignItems: 'center',
  },
  titleText: {
    fontSize: tokens.typography.sizes.md,
    fontWeight: tokens.typography.weights.bold,
  },
  subtitleText: {
    fontSize: tokens.typography.sizes.xxs,
    marginTop: 1,
  },
  rightActionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: tokens.spacing.sm,
  },
});
