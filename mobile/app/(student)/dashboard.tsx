/**
 * Student Dashboard Screen - REDS v2.0 Modernization
 * Integrates AppNotificationHeader, ConnectedOfflineBanner, StudentPassCard,
 * BentoKpiGrid, NextClassWidget, and DashboardQuickActions.
 * Preserves 100% of TanStack Query data flow, role routing, and offline synchronization.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import {
  useStudentDashboard,
  StudentPassCard,
  DashboardQuickActions,
  BentoKpiGrid,
  NextClassWidget,
  StudentAttendanceHistoryModal,
  StudentQrScannerModal,
} from '@/features/student';
import { AppNotificationHeader } from '@/features/notifications';
import { ConnectedOfflineBanner, LastSyncedIndicator } from '@/features/offline';
import { AppText } from '@/components/primitives/AppText';
import { AppErrorState } from '@/components/feedback/AppErrorState';
import { AppLoadingSkeleton } from '@/components/feedback/AppLoadingSkeleton';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.studentProfile);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isAttendanceModalVisible, setIsAttendanceModalVisible] = useState(false);
  const [isQrScannerVisible, setIsQrScannerVisible] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useStudentDashboard();

  const handleRefresh = async () => {
    await refetch();
    setLastRefreshed(new Date());
  };

  const stats = data?.stats;
  const progress = data?.semesterProgress;
  const upcomingClasses = data?.upcomingClasses || [];

  return (
    <View style={styles.screenWrapper} testID="student-dashboard-screen">
      {/* 1. Shared REDS v2.0 Top Navigation Header with Live Notification Bell */}
      <AppNotificationHeader
        title="Tổng quan sinh viên"
        subtitle={`Xin chào, ${user?.fullName || 'Sinh viên'}`}
        variant="burgundy"
        testID="student-dashboard-header"
      />

      {/* 2. Shared Live Network Connectivity & Offline Banner */}
      <ConnectedOfflineBanner testID="student-dashboard-offline-banner" />

      {/* 3. Main Scrollable Dashboard Content */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[tokens.brand.burgundy]}
            tintColor={tokens.brand.burgundy}
          />
        }
      >
        {/* 4. Digital Student Pass (Identity Card without mock QR) */}
        <StudentPassCard
          user={user}
          profile={profile}
          progress={progress}
          testID="student-id-card"
        />

        {/* 4.5. QR Attendance Check-In Action Card */}
        <Pressable
          style={({ pressed }) => [styles.checkInCta, pressed && styles.checkInCtaPressed]}
          onPress={() => setIsQrScannerVisible(true)}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: false }}
          accessibilityRole="button"
          accessibilityLabel="Quét mã QR điểm danh buổi học"
          testID="quick-action-checkin"
        >
          <View style={styles.checkInIconWrapper}>
            <Ionicons name="qr-code" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.checkInTextCol}>
            <AppText variant="bodyBold" style={styles.checkInTitle}>
              Quét mã QR điểm danh
            </AppText>
            <AppText variant="caption" style={styles.checkInSubtitle}>
              Điểm danh buổi học bằng mã QR xoay vòng trên máy chiếu
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.8)" />
        </Pressable>

        {/* 5. Quick Navigation Tiles (Touch Targets >= 48dp) */}
        <DashboardQuickActions onNavigate={(route) => router.push(route as any)} />

        {/* 6. Dynamic Body States */}
        {isLoading ? (
          <View style={styles.loadingContainer} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={tokens.brand.burgundy} />
            <AppText variant="caption" color="muted" style={styles.loadingText}>
              Đang cập nhật chỉ số học vụ...
            </AppText>
            <View style={styles.skeletonGroup}>
              <AppLoadingSkeleton variant="card" height={100} style={styles.skeletonItem} />
              <AppLoadingSkeleton variant="card" height={80} style={styles.skeletonItem} />
            </View>
          </View>
        ) : isError ? (
          <AppErrorState
            title="Không thể tải tổng quan học vụ"
            message={error?.message || 'Lỗi kết nối máy chủ.'}
            onRetry={handleRefresh}
            retryLabel="Thử lại"
          />
        ) : (
          <>
            {/* 7. Bento KPI Metrics Grid */}
            <BentoKpiGrid
              stats={stats}
              progress={progress}
              onPressAttendance={() => setIsAttendanceModalVisible(true)}
            />

            {/* 8. Next Class Widget */}
            <NextClassWidget
              classes={upcomingClasses}
              onViewAll={() => router.push('/(student)/timetable')}
            />

            {/* 9. Last Updated Timestamp & Sync Freshness */}
            <LastSyncedIndicator
              lastSyncedAt={lastRefreshed}
              isRefetching={isRefetching}
              onRefresh={handleRefresh}
            />
          </>
        )}
      </ScrollView>

      {/* Student Attendance History Modal */}
      <StudentAttendanceHistoryModal
        visible={isAttendanceModalVisible}
        onClose={() => setIsAttendanceModalVisible(false)}
      />

      {/* Student QR Attendance Scanner Modal */}
      <StudentQrScannerModal
        visible={isQrScannerVisible}
        onClose={() => setIsQrScannerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: tokens.surface.canvas,
  },
  container: {
    flex: 1,
    backgroundColor: tokens.surface.canvas,
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxxl,
  },
  checkInCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.brand.burgundy,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    ...tokens.elevation.md,
  },
  checkInCtaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  checkInIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: tokens.spacing.sm,
  },
  checkInTextCol: {
    flex: 1,
  },
  checkInTitle: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  checkInSubtitle: {
    color: '#FECACA',
    fontSize: 11,
    marginTop: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.xl,
  },
  loadingText: {
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  skeletonGroup: {
    width: '100%',
    gap: tokens.spacing.md,
  },
  skeletonItem: {
    width: '100%',
  },
});
