/**
 * AppErrorState.tsx
 * Standard Error State Feedback Primitive for REDS v2.0.
 * Rendered when network, server or query operations fail with retry capabilities.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';
import { AppButton } from '../primitives/AppButton';

export interface AppErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  isRetrying?: boolean;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const AppErrorState: React.FC<AppErrorStateProps> = ({
  title = 'Đã có lỗi xảy ra',
  message = 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.',
  onRetry,
  retryLabel = 'Thử lại',
  isRetrying = false,
  style,
  testID = 'app-error-state',
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.iconCircle}>
        <Ionicons name="alert-circle-outline" size={38} color={tokens.semantic.error.main} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <View style={styles.actionContainer}>
          <AppButton
            title={retryLabel}
            onPress={onRetry}
            variant="primary"
            size="sm"
            isLoading={isRetrying}
            leftIcon={<Ionicons name="refresh-outline" size={16} color="#FFFFFF" />}
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
    backgroundColor: tokens.semantic.error.light,
    borderRadius: tokens.radius.xl,
    marginVertical: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.semantic.error.border,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.semantic.error.border,
  },
  title: {
    fontSize: tokens.typography.sizes.sm,
    fontWeight: tokens.typography.weights.bold,
    color: tokens.semantic.error.dark,
    textAlign: 'center',
  },
  message: {
    fontSize: tokens.typography.sizes.xs,
    color: tokens.text.secondary,
    textAlign: 'center',
    marginTop: tokens.spacing.xs,
    lineHeight: 18,
    paddingHorizontal: tokens.spacing.md,
  },
  actionContainer: {
    marginTop: tokens.spacing.md,
  },
});
