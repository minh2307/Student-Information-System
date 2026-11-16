/**
 * Offline Mode Indicator Component
 * Prominently and politely alerts the user when they are viewing local cached data
 * or when network connectivity is recovered.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/theme';
import { useOffline } from '../OfflineContext';

export interface OfflineIndicatorProps {
  /**
   * Optional custom offline message.
   */
  offlineMessage?: string;

  /**
   * Optional callback when user taps retry/check network.
   */
  onRetry?: () => Promise<void> | void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  offlineMessage = 'Chế độ ngoại tuyến: Đang xem dữ liệu lưu trên thiết bị',
  onRetry,
}) => {
  const { isOffline, checkConnectivity } = useOffline();
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
      setShowRestored(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else if (wasOffline) {
      // Transition from offline -> online
      setShowRestored(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowRestored(false);
          setWasOffline(false);
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOffline, wasOffline, fadeAnim]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await checkConnectivity();
      if (onRetry) {
        await onRetry();
      }
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOffline && !showRestored) {
    return null;
  }

  const isRestoredState = !isOffline && showRestored;

  return (
    <Animated.View
      style={[
        styles.container,
        isRestoredState ? styles.containerRestored : styles.containerOffline,
        { opacity: fadeAnim },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.contentRow}>
        <Ionicons
          name={isRestoredState ? 'cloud-done-outline' : 'cloud-offline-outline'}
          size={18}
          color={isRestoredState ? '#065F46' : colors.warning.dark}
        />
        <Text
          style={[
            styles.messageText,
            isRestoredState ? styles.messageRestored : styles.messageOffline,
          ]}
          numberOfLines={2}
        >
          {isRestoredState
            ? 'Đã khôi phục kết nối Internet • Dữ liệu đang đồng bộ'
            : offlineMessage}
        </Text>
      </View>

      {isOffline && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleManualCheck}
          disabled={isChecking}
          accessibilityRole="button"
          accessibilityLabel="Thử kết nối lại mạng"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color={colors.warning.dark} />
          ) : (
            <Text style={styles.retryText}>Thử lại</Text>
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.screenHorizontal,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  containerOffline: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  containerRestored: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  messageText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  messageOffline: {
    color: '#92400E',
  },
  messageRestored: {
    color: '#065F46',
  },
  retryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    minHeight: 28,
    minWidth: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#92400E',
  },
});
