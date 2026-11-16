/**
 * AppEmptyState.tsx
 * Standard Empty State Feedback Primitive for REDS v2.0.
 * Rendered when lists, notifications or query results return empty.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';
import { AppButton } from '../primitives/AppButton';

export interface AppEmptyStateProps {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const AppEmptyState: React.FC<AppEmptyStateProps> = ({
  title,
  message,
  icon = 'file-tray-outline',
  actionLabel,
  onAction,
  style,
  testID = 'app-empty-state',
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={36} color={tokens.text.muted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.actionContainer}>
          <AppButton
            title={actionLabel}
            onPress={onAction}
            variant="outline"
            size="sm"
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: tokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.surface.card,
    borderRadius: tokens.radius.xl,
    marginVertical: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: tokens.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.sizes.sm,
    fontWeight: tokens.typography.weights.bold,
    color: tokens.text.primary,
    textAlign: 'center',
  },
  message: {
    fontSize: tokens.typography.sizes.xs,
    color: tokens.text.muted,
    textAlign: 'center',
    marginTop: tokens.spacing.xs,
    lineHeight: 18,
    paddingHorizontal: tokens.spacing.md,
  },
  actionContainer: {
    marginTop: tokens.spacing.md,
  },
});
