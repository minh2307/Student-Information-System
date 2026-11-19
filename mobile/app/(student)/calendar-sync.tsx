/**
 * Student Calendar Synchronization Screen (TASK ST-06)
 * Integrates with GET /api/v1/student/calendar/subscription-info
 * and GET /api/v1/student/calendar/export.ics for Google/Apple/Outlook Calendar sync.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { useCalendarSync } from '@/features/student/hooks/useCalendarSync';
import { ErrorView } from '@/components/common/ErrorView';

export default function CalendarSyncScreen() {
  const [activeTab, setActiveTab] = useState<'google' | 'apple' | 'outlook'>('google');
  const [copiedNotification, setCopiedNotification] = useState(false);

  const {
    subscriptionInfo,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    openWebcal,
    openSubscriptionUrl,
    openExportUrl,
  } = useCalendarSync();

  const handleCopyLink = () => {
    const textToCopy = subscriptionInfo?.subscriptionUrl || '';
    if (textToCopy && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy);
    }
    setCopiedNotification(true);
    setTimeout(() => {
      setCopiedNotification(false);
    }, 2500);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            refetch();
          }}
          colors={[colors.primary[800]]}
          tintColor={colors.primary[800]}
        />
      }
    >
      {/* Hero Header Card */}
      <View style={styles.heroCard} testID="calendar-sync-hero">
        <View style={styles.heroIconWrapper}>
          <Ionicons name="calendar-outline" size={28} color={colors.primary[800]} />
        </View>
        <Text style={styles.heroTitle}>Đồng bộ Lịch học & Lịch thi</Text>
        <Text style={styles.heroSubtitle}>
          Đăng ký nguồn lịch tự động cập nhật vào Google Calendar, Apple Calendar hoặc Outlook để không bao giờ bỏ lỡ giờ lên lớp hay phòng thi.
        </Text>
      </View>

      {/* Loading & Error States */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[800]} />
          <Text style={styles.loadingText}>Đang lấy thông tin nguồn lịch cá nhân...</Text>
        </View>
      ) : isError ? (
        <ErrorView
          title="Không thể tải thông tin đồng bộ lịch"
          message={error?.message || 'Lỗi kết nối máy chủ.'}
          onRetry={refetch}
        />
      ) : (
        <>
          {/* Quick Action: 1-Click Native Webcal Subscribe */}
          <View style={styles.actionCard} testID="webcal-subscribe-card">
            <View style={styles.actionHeader}>
              <Ionicons name="flash-outline" size={20} color={colors.primary[800]} />
              <Text style={styles.actionTitle}>Đăng ký tự động 1-Chạm</Text>
            </View>
            <Text style={styles.actionDesc}>
              Khuyên dùng cho iOS (Apple Calendar) hoặc thiết bị hỗ trợ giao thức Webcal.
            </Text>

            <Pressable
              style={styles.primaryBtn}
              onPress={openWebcal}
              accessibilityRole="button"
              accessibilityLabel="Mở ứng dụng Lịch mặc định"
              testID="open-webcal-button"
            >
              <Ionicons name="sync-outline" size={18} color={colors.neutral[0]} />
              <Text style={styles.primaryBtnText}>Mở trong ứng dụng Lịch (Webcal)</Text>
            </Pressable>
          </View>

          {/* Subscription URL Section */}
          <View style={styles.linkCard} testID="subscription-url-card">
            <View style={styles.linkHeader}>
              <Ionicons name="link-outline" size={20} color={colors.neutral[700]} />
              <Text style={styles.linkTitle}>Đường dẫn Subscription Feed</Text>
            </View>
            <Text style={styles.linkSubtitle}>
              Sử dụng liên kết này để đăng ký nguồn lịch định kỳ trên Google Calendar hoặc Outlook Web.
            </Text>

            <View style={styles.urlInputBox}>
              <TextInput
                style={styles.urlInput}
                value={subscriptionInfo?.subscriptionUrl || ''}
                editable={false}
                selectTextOnFocus={true}
                testID="subscription-url-input"
              />
              <Pressable
                style={styles.copyBtn}
                onPress={handleCopyLink}
                accessibilityRole="button"
                accessibilityLabel="Sao chép đường dẫn lịch"
                testID="copy-subscription-url-btn"
              >
                <Ionicons
                  name={copiedNotification ? 'checkmark' : 'copy-outline'}
                  size={16}
                  color={copiedNotification ? colors.success.dark : colors.primary[800]}
                />
                <Text
                  style={[
                    styles.copyBtnText,
                    copiedNotification && { color: colors.success.dark },
                  ]}
                >
                  {copiedNotification ? 'Đã sao chép' : 'Sao chép'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.neutral[500]} />
              <Text style={styles.securityNoteText}>
                Liên kết chứa token cá nhân bảo mật. Hệ thống tự động làm mới lịch mỗi khi có thay đổi phòng học hoặc lịch thi.
              </Text>
            </View>
          </View>

          {/* Manual ICS File Export */}
          <View style={styles.exportCard} testID="ics-export-card">
            <View style={styles.exportLeft}>
              <Text style={styles.exportTitle}>Tải tệp lịch .ics thủ công</Text>
              <Text style={styles.exportSubtitle}>
                Dành cho nhu cầu nhập tĩnh 1 lần vào ứng dụng không hỗ trợ đồng bộ tự động.
              </Text>
            </View>
            <Pressable
              style={styles.exportBtn}
              onPress={openExportUrl}
              accessibilityRole="button"
              accessibilityLabel="Tải tệp .ics"
              testID="export-ics-button"
            >
              <Ionicons name="download-outline" size={16} color={colors.primary[800]} />
              <Text style={styles.exportBtnText}>Tải file .ics</Text>
            </Pressable>
          </View>

          {/* Step-by-Step Integration Guide */}
          <View style={styles.guideCard} testID="calendar-guide-card">
            <Text style={styles.guideTitle}>Hướng dẫn cài đặt chi tiết</Text>

            {/* Guide Tabs */}
            <View style={styles.guideTabs}>
              {[
                { key: 'google', label: 'Google Calendar' },
                { key: 'apple', label: 'Apple Calendar' },
                { key: 'outlook', label: 'Outlook' },
              ].map((t) => {
                const isActive = activeTab === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setActiveTab(t.key as any)}
                    style={[styles.guideTabBtn, isActive && styles.guideTabBtnActive]}
                    accessibilityRole="tab"
                    testID={`guide-tab-${t.key}`}
                  >
                    <Text
                      style={[
                        styles.guideTabBtnText,
                        isActive && styles.guideTabBtnTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Guide Content */}
            <View style={styles.guideContent} testID="guide-content-box">
              {activeTab === 'google' ? (
                <View style={styles.stepGroup}>
                  <Text style={styles.stepText}>
                    1. Mở <Text style={styles.stepBold}>Google Calendar</Text> trên trình duyệt web.
                  </Text>
                  <Text style={styles.stepText}>
                    2. Tại cột trái mục <Text style={styles.stepBold}>Other calendars (+)</Text>, chọn <Text style={styles.stepBold}>From URL</Text>.
                  </Text>
                  <Text style={styles.stepText}>
                    3. Dán <Text style={styles.stepBold}>Subscription URL</Text> đã sao chép ở trên vào ô URL.
                  </Text>
                  <Text style={styles.stepText}>
                    4. Nhấn <Text style={styles.stepBold}>Add calendar</Text>. Lịch sẽ tự động đồng bộ về ứng dụng Google Calendar trên điện thoại.
                  </Text>
                </View>
              ) : activeTab === 'apple' ? (
                <View style={styles.stepGroup}>
                  <Text style={styles.stepText}>
                    1. Trên iPhone hoặc iPad, chạm nút <Text style={styles.stepBold}>Mở trong ứng dụng Lịch (Webcal)</Text> ở trên.
                  </Text>
                  <Text style={styles.stepText}>
                    2. Chọn <Text style={styles.stepBold}>Đăng ký (Subscribe)</Text> khi hệ thống hỏi.
                  </Text>
                  <Text style={styles.stepText}>
                    3. Đặt tần suất tự động cập nhật là <Text style={styles.stepBold}>Hàng giờ</Text> hoặc <Text style={styles.stepBold}>Hàng ngày</Text>.
                  </Text>
                </View>
              ) : (
                <View style={styles.stepGroup}>
                  <Text style={styles.stepText}>
                    1. Truy cập <Text style={styles.stepBold}>outlook.live.com/calendar</Text>.
                  </Text>
                  <Text style={styles.stepText}>
                    2. Chọn <Text style={styles.stepBold}>Add calendar &gt; Subscribe from web</Text>.
                  </Text>
                  <Text style={styles.stepText}>
                    3. Dán đường link Subscription URL và đặt tên lịch <Text style={styles.stepBold}>Lịch học Rikkei</Text>.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  scrollContent: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.sm,
  },
  heroCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  heroIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: spacing.sm,
  },
  actionCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  actionDesc: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginBottom: spacing.md,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[800],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  primaryBtnText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  linkCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  linkTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  linkSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginBottom: spacing.sm,
  },
  urlInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  urlInput: {
    flex: 1,
    fontSize: 11,
    color: colors.neutral[700],
    padding: 0,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neutral[0],
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  securityNoteText: {
    fontSize: 11,
    color: colors.neutral[500],
    flex: 1,
  },
  exportCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  exportLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  exportTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  exportSubtitle: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 2,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary[800],
  },
  exportBtnText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
  },
  guideCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  guideTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  guideTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  guideTabBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
  },
  guideTabBtnActive: {
    backgroundColor: colors.primary[800],
  },
  guideTabBtnText: {
    fontSize: 11,
    color: colors.neutral[600],
    fontWeight: typography.weights.medium,
  },
  guideTabBtnTextActive: {
    color: colors.neutral[0],
    fontWeight: typography.weights.bold,
  },
  guideContent: {
    backgroundColor: colors.neutral[50],
    borderRadius: radius.md,
    padding: spacing.md,
  },
  stepGroup: {
    gap: spacing.xs,
  },
  stepText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[700],
    lineHeight: 18,
  },
  stepBold: {
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
});
