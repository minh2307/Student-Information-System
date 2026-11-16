/**
 * AppSection.tsx
 * Standard Section Container Primitive for REDS v2.0.
 * Organizes content blocks with standardized headers, subtitles, and touch-accessible action links.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { tokens } from '@/theme';

export interface AppSectionProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  headerRight?: React.ReactNode;
  testID?: string;
}

export const AppSection: React.FC<AppSectionProps> = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
  style,
  headerRight,
  testID = 'app-section',
}) => {
  return (
    <View style={[styles.sectionContainer, style]} testID={testID}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <Text style={styles.titleText}>{title}</Text>
          {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
        </View>

        {headerRight ? (
          <View style={styles.rightWrapper}>{headerRight}</View>
        ) : actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            style={styles.actionButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            testID={`${testID}-action`}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Section Content */}
      <View style={styles.contentWrapper}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginVertical: tokens.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.xs,
  },
  titleCol: {
    flex: 1,
  },
  titleText: {
    fontSize: tokens.typography.sizes.md,
    fontWeight: tokens.typography.weights.bold,
    color: tokens.text.primary,
  },
  subtitleText: {
    fontSize: tokens.typography.sizes.xxs,
    color: tokens.text.muted,
    marginTop: 2,
  },
  rightWrapper: {
    marginLeft: tokens.spacing.sm,
  },
  actionButton: {
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.xs,
  },
  actionText: {
    fontSize: tokens.typography.sizes.xs,
    color: tokens.brand.crimson,
    fontWeight: tokens.typography.weights.semiBold,
  },
  contentWrapper: {
    width: '100%',
  },
});
