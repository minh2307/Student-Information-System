/**
 * Notification Bell Button Component
 * Top-bar action button with real-time unread badge.
 * Opens NotificationCenterModal upon press.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius } from '@/theme';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationCenterModal } from './NotificationCenterModal';

export interface NotificationBellButtonProps {
  /**
   * Color of bell icon (defaults to white for Burgundy headers).
   */
  tintColor?: string;
}

export const NotificationBellButton: React.FC<NotificationBellButtonProps> = ({
  tintColor = colors.neutral[0],
}) => {
  const { unreadCount } = useNotifications();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const displayCount = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setIsModalOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Thông báo, ${unreadCount} chưa đọc`}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="notifications-outline" size={24} color={tintColor} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{displayCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <NotificationCenterModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    backgroundColor: '#DC2626',
    minWidth: 18,
    height: 18,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.primary[900],
  },
  badgeText: {
    color: colors.neutral[0],
    fontSize: 9,
    fontWeight: typography.weights.bold,
  },
});
