/**
 * Notification Center Modal Component
 * In-App Notification Center with Category Filters, Read-State Tracking, and Deep Linking.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useOffline } from '@/features/offline';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationDto, NotificationFilter } from '../types';
import { resolveNotificationRoute } from '../utils/notificationDeepLink';

export interface NotificationCenterModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  visible,
  onClose,
}) => {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isOffline } = useOffline();

  const {
    notifications,
    unreadCount,
    isLoading,
    refetch,
    isRefetching,
    markAsRead,
    markAllAsRead,
    isMarkingRead,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('ALL');

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'UNREAD') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, activeFilter]);

  const handleNotificationPress = (item: NotificationDto) => {
    if (!item.isRead) {
      markAsRead(item.id);
    }

    if (item.linkUrl) {
      const resolution = resolveNotificationRoute(item.linkUrl, user?.role, isAuthenticated);
      onClose();
      router.push(resolution.targetRoute as any);
    }
  };

  const getCategoryConfig = (type?: string) => {
    const t = (type || 'GENERAL').toUpperCase();
    switch (t) {
      case 'ACADEMIC':
      case 'HỌC VỤ':
        return { icon: 'school-outline' as const, color: '#2563EB', bg: '#EFF6FF' };
      case 'EXAM':
      case 'LỊCH THI':
        return { icon: 'clipboard-outline' as const, color: '#D97706', bg: '#FEF3C7' };
      case 'TUITION':
      case 'HỌC PHÍ':
        return { icon: 'wallet-outline' as const, color: '#DB2777', bg: '#FDF2F8' };
      case 'ATTENDANCE':
      case 'ĐIỂM DANH':
        return { icon: 'qr-code-outline' as const, color: '#059669', bg: '#ECFDF5' };
      case 'ALERT':
      case 'CẢNH BÁO':
        return { icon: 'warning-outline' as const, color: colors.error.dark, bg: colors.error.light };
      default:
        return { icon: 'notifications-outline' as const, color: colors.primary[800], bg: '#FEE2E2' };
    }
  };

  const formatRelativeDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Hộp thư thông báo</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Đóng hộp thư thông báo"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color={colors.neutral[800]} />
          </TouchableOpacity>
        </View>

        {/* Offline notification banner if viewing cached messages */}
        {isOffline && (
          <View style={styles.offlineNotice}>
            <Ionicons name="cloud-offline-outline" size={14} color="#92400E" />
            <Text style={styles.offlineNoticeText}>
              Đang xem thông báo đã lưu trên máy (Ngoại tuyến)
            </Text>
          </View>
        )}

        {/* Sub-header Filter Tabs & Mark-All Action */}
        <View style={styles.filterBar}>
          <View style={styles.filterPills}>
            <Pressable
              style={[styles.filterPill, activeFilter === 'ALL' && styles.filterPillActive]}
              onPress={() => setActiveFilter('ALL')}
              accessibilityRole="button"
              accessibilityLabel="Tất cả thông báo"
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'ALL' && styles.filterPillTextActive,
                ]}
              >
                Tất cả ({notifications.length})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.filterPill, activeFilter === 'UNREAD' && styles.filterPillActive]}
              onPress={() => setActiveFilter('UNREAD')}
              accessibilityRole="button"
              accessibilityLabel="Thông báo chưa đọc"
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'UNREAD' && styles.filterPillTextActive,
                ]}
              >
                Chưa đọc ({unreadCount})
              </Text>
            </Pressable>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={() => markAllAsRead()}
              disabled={isMarkingRead}
              style={styles.markAllButton}
              accessibilityRole="button"
              accessibilityLabel="Đánh dấu tất cả đã đọc"
            >
              <Text style={styles.markAllText}>Đã đọc tất cả</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification List */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary[800]} />
            <Text style={styles.loadingText}>Đang tải thông báo...</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="notifications-off-outline" size={56} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>
              {activeFilter === 'UNREAD'
                ? 'Không có thông báo chưa đọc'
                : 'Chưa có thông báo nào'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Các cập nhật học vụ, lịch thi, và học phí sẽ xuất hiện tại đây.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => {
                  void refetch();
                }}
                tintColor={colors.primary[800]}
              />
            }
          >
            {filteredNotifications.map((item) => {
              const cfg = getCategoryConfig(item.type);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.notificationCard,
                    !item.isRead && styles.notificationCardUnread,
                  ]}
                  onPress={() => handleNotificationPress(item)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}, ${item.isRead ? 'đã đọc' : 'chưa đọc'}`}
                >
                  <View style={[styles.categoryIconCircle, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardHeaderRow}>
                      <Text
                        style={[
                          styles.cardTitle,
                          !item.isRead && styles.cardTitleUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {!item.isRead && <View style={styles.unreadDot} />}
                    </View>

                    <Text style={styles.cardMessage} numberOfLines={2}>
                      {item.message}
                    </Text>

                    <View style={styles.cardFooter}>
                      <Text style={styles.cardTime}>
                        {formatRelativeDate(item.createdAt)}
                      </Text>
                      {item.linkUrl && (
                        <View style={styles.deepLinkPrompt}>
                          <Text style={styles.deepLinkPromptText}>Chi tiết</Text>
                          <Ionicons name="chevron-forward" size={12} color={colors.primary[800]} />
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  unreadBadge: {
    backgroundColor: colors.primary[800],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  unreadBadgeText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineNoticeText: {
    fontSize: typography.sizes.xs,
    color: '#92400E',
    fontWeight: typography.weights.medium,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  filterPills: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
  },
  filterPillActive: {
    backgroundColor: '#FEE2E2',
  },
  filterPillText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    fontWeight: typography.weights.medium,
  },
  filterPillTextActive: {
    color: colors.primary[800],
    fontWeight: typography.weights.bold,
  },
  markAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  markAllText: {
    fontSize: typography.sizes.xs,
    color: colors.primary[800],
    fontWeight: typography.weights.semiBold,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[0],
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  notificationCardUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FECACA',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[800],
  },
  categoryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[800],
    flex: 1,
  },
  cardTitleUnread: {
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary[800],
    marginLeft: 6,
  },
  cardMessage: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTime: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[400],
  },
  deepLinkPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  deepLinkPromptText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
