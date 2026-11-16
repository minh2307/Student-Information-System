/**
 * Fullscreen Loading Indicator
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Đang tải dữ liệu học vụ...',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.logoText}>RIKKEI EDUPORTAL</Text>
      </View>
      <ActivityIndicator size="large" color={colors.primary[800]} style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  badge: {
    backgroundColor: colors.primary[900],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xl,
  },
  logoText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.2,
  },
  spinner: {
    marginVertical: spacing.md,
  },
  message: {
    color: colors.neutral[600],
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
});
