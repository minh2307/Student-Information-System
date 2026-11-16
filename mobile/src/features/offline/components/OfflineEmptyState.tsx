/**
 * Offline Empty State Component
 * Displayed when user is disconnected from Internet and no cached data exists.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/theme';
import { useOffline } from '../OfflineContext';

export interface OfflineEmptyStateProps {
  /**
   * Title explaining absence of offline data.
   */
  title?: string;

  /**
   * Explanatory message.
   */
  message?: string;

  /**
   * Callback to retry fetching when network is back.
   */
  onRetry?: () => Promise<void> | void;

  /**
   * Optional loading state while retry is in flight.
   */
  isRetrying?: boolean;
}

export const OfflineEmptyState: React.FC<OfflineEmptyStateProps> = ({
  title = 'Chưa có bản lưu ngoại tuyến',
  message = 'Bạn đang không có kết nối Internet và mục này chưa từng được tải trước đó. Vui lòng kết nối mạng và thử lại.',
  onRetry,
  isRetrying = false,
}) => {
  const { checkConnectivity } = useOffline();

  const handleRetry = async () => {
    await checkConnectivity();
    if (onRetry) {
      await onRetry();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.warning.dark} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetry}
          disabled={isRetrying}
          accessibilityRole="button"
          accessibilityLabel="Thử kết nối lại"
          activeOpacity={0.8}
        >
          {isRetrying ? (
            <ActivityIndicator size="small" color={colors.neutral[0]} />
          ) : (
            <>
              <Ionicons name="reload-outline" size={18} color={colors.neutral[0]} />
              <Text style={styles.retryButtonText}>Thử kết nối lại</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.xs,
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
    justifyContent: 'center',
    backgroundColor: colors.primary[800],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
    minHeight: 48,
    minWidth: 160,
  },
  retryButtonText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
