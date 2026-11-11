/**
 * Reusable Error View with Retry Button
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/theme';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
  title?: string;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  message = 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.',
  onRetry,
  title = 'Đã có lỗi xảy ra',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.error.dark} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Thử lại"
        >
          <Ionicons name="refresh-outline" size={18} color={colors.neutral[0]} />
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary[800],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    minHeight: spacing.minTouchTarget,
    minWidth: 120,
    justifyContent: 'center',
  },
  retryButtonPressed: {
    backgroundColor: colors.primary[900],
    opacity: 0.9,
  },
  retryText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
