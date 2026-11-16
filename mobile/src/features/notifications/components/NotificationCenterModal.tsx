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
import { tokens } from '@/theme';
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
        return { icon: 'school-outline' as const, color: '#1D4ED8', bg: '#EFF6FF', border: '#2563EB' };
      case 'EXAM':
      case 'LỊCH THI':
        return { icon: 'clipboard-outline' as const, color: '#B45309', bg: '#FEF3C7', border: '#D97706' };
      case 'TUITION':
      case 'HỌC PHÍ':
        return { icon: 'wallet-outline' as const, color: '#BE185D', bg: '#FDF2F8', border: '#DB2777' };
      case 'ATTENDANCE':
      case 'ĐIỂM DANH':
        return { icon: 'qr-code-outline' as const, color: '#047857', bg: '#ECFDF5', border: '#059669' };
      case 'ALERT':
      case 'CẢNH BÁO':
        return { icon: 'warning-outline' as const, color: tokens.semantic.error.dark, bg: tokens.semantic.error.light, border: tokens.semantic.error.button };
      default:
        return { icon: 'notifications-outline' as const, color: tokens.brand.burgundy, bg: '#FEE2E2', border: tokens.brand.burgundy };
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
            <Ionicons name="close" size={24} color={tokens.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Offline notification banner if viewing cached messages */}
        {isOffline && (
          <View style={styles.offlineNotice}>
            <Ionicons name="cloud-offline-outline" size={14} color={tokens.semantic.warning.dark} />
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
            <ActivityIndicator size="large" color={tokens.brand.burgundy} />
            <Text style={styles.loadingText}>Đang tải thông báo...</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="notifications-off-outline" size={56} color={tokens.border.default} />
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
                tintColor={tokens.brand.burgundy}
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
                    !item.isRead && [
                      styles.notificationCardUnread,
                      { borderLeftColor: cfg.border },
                    ],
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
                      {!item.isRead && (
                        <View style={[styles.unreadDot, { backgroundColor: cfg.border }]} />
                      )}
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
                          <Ionicons name="chevron-forward" size={12} color={tokens.brand.burgundy} />
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
    backgroundColor: tokens.surface.canvas,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    backgroundColor: tokens.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.default,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  headerTitle: {
    fontSize: tokens.typography.sizes.h3,
    fontWeight: tokens.typography.weights.bold,
    color: tokens.text.primary,
  },
  unreadBadge: {
    backgroundColor: tokens.brand.burgundy,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: tokens.typography.sizes.overline,
    fontWeight: tokens.typography.weights.bold,
  },
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.semantic.warning.light,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.warning.border,
  },
  offlineNoticeText: {
    fontSize: tokens.typography.sizes.caption,
    color: tokens.semantic.warning.dark,
    fontWeight: tokens.typography.weights.medium,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.default,
  },
  filterPills: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
  },
  filterPill: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 8,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.surface.canvas,
    borderWidth: 1,
    borderColor: tokens.border.default,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: tokens.brand.crimsonLight,
    borderColor: tokens.brand.crimson,
  },
  filterPillText: {
    fontSize: tokens.typography.sizes.caption,
    color: tokens.text.secondary,
    fontWeight: tokens.typography.weights.medium,
  },
  filterPillTextActive: {
    color: tokens.brand.burgundy,
    fontWeight: tokens.typography.weights.bold,
  },
  markAllButton: {
    paddingVertical: 8,
    paddingHorizontal: tokens.spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  markAllText: {
    fontSize: tokens.typography.sizes.caption,
    color: tokens.brand.burgundy,
    fontWeight: tokens.typography.weights.semiBold,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: tokens.surface.card,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.border.default,
    gap: tokens.spacing.md,
    alignItems: 'flex-start',
    ...tokens.elevation.sm,
  },
  notificationCardUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: tokens.brand.crimsonLight,
    borderLeftWidth: 4,
    borderLeftColor: tokens.brand.burgundy,
  },
  categoryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
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
    fontSize: tokens.typography.sizes.body,
    fontWeight: tokens.typography.weights.medium,
    color: tokens.text.secondary,
    flex: 1,
  },
  cardTitleUnread: {
    fontWeight: tokens.typography.weights.bold,
    color: tokens.text.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.brand.burgundy,
    marginLeft: 6,
  },
  cardMessage: {
    fontSize: tokens.typography.sizes.caption,
    color: tokens.text.secondary,
    lineHeight: 18,
    marginBottom: tokens.spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTime: {
    fontSize: tokens.typography.sizes.overline,
    color: tokens.text.muted,
  },
  deepLinkPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  deepLinkPromptText: {
    fontSize: tokens.typography.sizes.overline,
    fontWeight: tokens.typography.weights.bold,
    color: tokens.brand.burgundy,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.xl,
  },
  loadingText: {
    marginTop: tokens.spacing.sm,
    fontSize: tokens.typography.sizes.body,
    color: tokens.text.muted,
  },
  emptyTitle: {
    fontSize: tokens.typography.sizes.h4,
    fontWeight: tokens.typography.weights.bold,
    color: tokens.text.primary,
    marginTop: tokens.spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: tokens.typography.sizes.caption,
    color: tokens.text.muted,
    marginTop: tokens.spacing.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
