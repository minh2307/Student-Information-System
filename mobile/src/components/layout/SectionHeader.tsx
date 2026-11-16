/**
 * SectionHeader.tsx
 * Standard Section Header Component for REDS v2.0.
 * Displays clear semantic title, optional subtitle, and touch-accessible action button (>= 48dp).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { tokens } from '@/theme';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  rightElement?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  titleStyle?: TextStyle | TextStyle[];
  testID?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  rightElement,
  style,
  titleStyle,
  testID = 'section-header',
}) => {
  return (
    <View style={[styles.headerContainer, style]} testID={testID} accessibilityRole="header">
      <View style={styles.titleColumn}>
        <Text style={[styles.titleText, titleStyle]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitleText} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightElement ? (
        <View style={styles.rightWrapper}>{rightElement}</View>
      ) : actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && Platform.OS === 'ios' && styles.actionPressed,
          ]}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          android_ripple={{ color: 'rgba(153, 27, 27, 0.12)', borderless: true, radius: 24 }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          testID={`${testID}-action-button`}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs,
  },
  titleColumn: {
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  titleText: {
    fontSize: tokens.typography.sizes.h3,
    fontWeight: tokens.typography.weights.bold,
    color: tokens.text.primary,
    lineHeight: 24,
  },
  subtitleText: {
    fontSize: tokens.typography.sizes.xs,
    color: tokens.text.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  rightWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.xs,
    minHeight: 32, // hitSlop expands to >= 48dp
    justifyContent: 'center',
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionText: {
    fontSize: tokens.typography.sizes.sm,
    fontWeight: tokens.typography.weights.semiBold,
    color: tokens.brand.crimson,
  },
});

export default SectionHeader;
