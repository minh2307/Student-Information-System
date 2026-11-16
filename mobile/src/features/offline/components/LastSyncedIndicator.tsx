/**
 * Last Synced & Cache Freshness Indicator
 * Shows timestamp of last successful server fetch and lets user trigger a refresh.
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

export interface LastSyncedIndicatorProps {
  /**
   * Last synced timestamp or null if not synced yet.
   */
  lastSyncedAt?: Date | string | null;

  /**
   * Whether a refetch / sync query is currently in flight.
   */
  isRefetching?: boolean;

  /**
   * Callback to refetch data.
   */
  onRefresh?: () => void | Promise<void>;

  /**
   * Optional custom label prefix.
   */
  label?: string;
}

export const LastSyncedIndicator: React.FC<LastSyncedIndicatorProps> = ({
  lastSyncedAt,
  isRefetching = false,
  onRefresh,
  label = 'Đồng bộ lúc',
}) => {
  const { isOffline } = useOffline();

  const formattedTime = React.useMemo(() => {
    if (!lastSyncedAt) return '--:--';
    const d = typeof lastSyncedAt === 'string' ? new Date(lastSyncedAt) : lastSyncedAt;
    if (Number.isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [lastSyncedAt]);

  return (
    <View style={styles.container}>
      <View style={styles.infoRow}>
        <Ionicons
          name={isOffline ? 'cloud-offline-outline' : 'time-outline'}
          size={14}
          color={isOffline ? colors.warning.dark : colors.neutral[500]}
        />
        <Text style={[styles.text, isOffline && styles.textOffline]}>
          {isOffline ? 'Dữ liệu lưu tạm • ' : `${label}: `}
          {formattedTime}
        </Text>
      </View>

      {onRefresh && !isOffline && (
        <TouchableOpacity
          onPress={onRefresh}
          disabled={isRefetching}
          style={styles.refreshButton}
          accessibilityRole="button"
          accessibilityLabel="Làm mới dữ liệu"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {isRefetching ? (
            <ActivityIndicator size="small" color={colors.primary[800]} />
          ) : (
            <Ionicons name="refresh" size={14} color={colors.primary[800]} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
    fontWeight: typography.weights.medium,
  },
  textOffline: {
    color: colors.warning.dark,
    fontWeight: typography.weights.semiBold,
  },
  refreshButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
