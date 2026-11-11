/**
 * Student Dashboard Screen
 * Live integration with GET /api/v1/student/dashboard via TanStack Query.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useStudentDashboard } from '@/features/student';
import { ErrorView } from '@/components/common/ErrorView';
import { EmptyState } from '@/components/common/EmptyState';
import { formatCgpa, formatDayOfWeek, formatTime } from '@/utils/formatters';
import { OfflineIndicator, LastSyncedIndicator } from '@/features/offline';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.studentProfile);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          colors={[colors.primary[800]]}
          tintColor={colors.primary[800]}
        />
      }
    >
      {/* Offline Mode Indicator */}
      <OfflineIndicator onRetry={handleRefresh} />

      {/* Digital Student Identity Card */}
      <View style={styles.idCard}>
        <View style={styles.idCardHeader}>
          <Text style={styles.idCardSchool}>HỌC VIỆN CÔNG NGHỆ RIKKEI</Text>
          <Text style={styles.idCardBadge}>THẺ SINH VIÊN ĐIỆN TỬ</Text>
        </View>

        <View style={styles.idCardBody}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {(user?.fullName || 'SV').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.idCardDetails}>
            <Text style={styles.studentName}>{user?.fullName || 'Sinh viên Rikkei'}</Text>
            <Text style={styles.studentCode}>
              {profile?.studentCode || user?.username || 'SV2024001'}
            </Text>
            <Text style={styles.studentMajor}>
              {profile?.major || 'B.Tech - Computer Science'}
            </Text>
          </View>
        </View>

        <View style={styles.idCardFooter}>
          <View style={styles.cgpaPill}>
            <Text style={styles.cgpaLabel}>C-GPA Tích lũy</Text>
            <Text style={styles.cgpaValue}>
              {formatCgpa(progress?.currentCgpa ?? profile?.currentCgpa)}
            </Text>
          </View>
          <View style={styles.creditsPill}>
            <Text style={styles.creditsLabel}>Tín chỉ</Text>
            <Text style={styles.creditsValue}>
              {(progress?.creditsEarned ?? profile?.creditsEarned ?? 0)} / {(progress?.totalRequiredCredits ?? profile?.totalRequiredCredits ?? 160)}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Navigation Cards */}
      <View style={styles.quickActionsContainer}>
        <Pressable
          style={({ pressed }) => [styles.quickActionCard, pressed && styles.cardPressed]}
          onPress={() => router.push('/(student)/timetable')}
          accessibilityRole="button"
          accessibilityLabel="Xem thời khóa biểu"
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="calendar" size={22} color="#2563EB" />
          </View>
          <Text style={styles.quickActionText}>Lịch học</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.quickActionCard, pressed && styles.cardPressed]}
          onPress={() => router.push('/(student)/exams')}
          accessibilityRole="button"
          accessibilityLabel="Xem lịch thi"
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="clipboard" size={22} color="#D97706" />
          </View>
          <Text style={styles.quickActionText}>Lịch thi</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.quickActionCard, pressed && styles.cardPressed]}
          onPress={() => router.push('/(student)/grades')}
          accessibilityRole="button"
          accessibilityLabel="Xem bảng điểm"
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="school" size={22} color="#059669" />
          </View>
          <Text style={styles.quickActionText}>Bảng điểm</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.quickActionCard, pressed && styles.cardPressed]}
          onPress={() => router.push('/(student)/tuition')}
          accessibilityRole="button"
          accessibilityLabel="Xem học phí"
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#FDF2F8' }]}>
            <Ionicons name="wallet" size={22} color="#DB2777" />
          </View>
          <Text style={styles.quickActionText}>Học phí</Text>
        </Pressable>
      </View>

      {/* Loading & Error States */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[800]} />
          <Text style={styles.loadingText}>Đang cập nhật chỉ số học vụ...</Text>
        </View>
      ) : isError ? (
        <ErrorView
          title="Không thể tải tổng quan học vụ"
          message={error?.message || 'Lỗi kết nối máy chủ.'}
          onRetry={handleRefresh}
        />
      ) : (
        <>
          {/* Dashboard KPI Metric Grid */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Chỉ số học tập kỳ này</Text>
            {progress?.academicStanding ? (
              <View style={styles.standingBadge}>
                <Text style={styles.standingBadgeText}>{progress.academicStanding}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.metricGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>{stats?.registeredCourses ?? 0}</Text>
              <Text style={styles.metricLabel}>Môn học kỳ này</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>{stats?.weeklyClasses ?? 0}</Text>
              <Text style={styles.metricLabel}>Tiết học / tuần</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>
                {progress?.attendanceRate != null ? `${progress.attendanceRate}%` : '--%'}
              </Text>
              <Text style={styles.metricLabel}>Tỷ lệ chuyên cần</Text>
            </View>
            <View style={styles.metricCard}>
              <Text
                style={[
                  styles.metricNumber,
                  (stats?.scheduleConflicts ?? 0) > 0 && { color: colors.error.dark },
                ]}
              >
                {stats?.scheduleConflicts ?? 0}
              </Text>
              <Text style={styles.metricLabel}>Trùng lịch học</Text>
            </View>
          </View>

          {/* Upcoming Classes Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lớp học sắp tới</Text>
            <Pressable
              onPress={() => router.push('/(student)/timetable')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.viewAllLink}>Xem tất cả</Text>
            </Pressable>
          </View>

          {upcomingClasses.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="Không có lớp học sắp tới"
              message="Bạn hiện không có lịch học nào cần tham gia trong tuần này."
            />
          ) : (
            upcomingClasses.slice(0, 4).map((c) => (
              <View key={c.id} style={styles.classCard}>
                <View style={styles.classDayBadge}>
                  <Text style={styles.classDayText}>{formatDayOfWeek(c.dayOfWeek)}</Text>
                  <Text style={styles.classTimeRange}>
                    {formatTime(c.startTime)} - {formatTime(c.endTime)}
                  </Text>
                </View>
                <View style={styles.classDivider} />
                <View style={styles.classDetails}>
                  <View style={styles.classCodeRow}>
                    <Text style={styles.courseCode}>{c.courseCode}</Text>
                    {c.credits ? (
                      <Text style={styles.creditsTag}>{c.credits} TC</Text>
                    ) : null}
                  </View>
                  <Text style={styles.courseName} numberOfLines={2}>
                    {c.courseName}
                  </Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={13} color={colors.neutral[500]} />
                    <Text style={styles.roomLecturer} numberOfLines={1}>
                      {c.roomName} • {c.lecturerName || 'Chưa phân công'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}

          {/* Last Updated Timestamp & Sync Freshness */}
          <LastSyncedIndicator
            lastSyncedAt={lastRefreshed}
            isRefetching={isRefetching}
            onRefresh={handleRefresh}
          />
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
  },
  idCard: {
    backgroundColor: colors.primary[900],
    borderRadius: radius.xxl,
    padding: spacing.lg,
    marginTop: spacing.sm,
    ...shadows.md,
  },
  idCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    paddingBottom: spacing.sm,
  },
  idCardSchool: {
    color: colors.primary[200],
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
  },
  idCardBadge: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
  },
  idCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.primary[700],
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  idCardDetails: {
    flex: 1,
  },
  studentName: {
    color: colors.neutral[0],
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  studentCode: {
    color: colors.primary[200],
    fontSize: typography.sizes.xs,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  studentMajor: {
    color: colors.primary[300],
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  idCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  cgpaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cgpaLabel: {
    color: colors.primary[200],
    fontSize: typography.sizes.xxs,
  },
  cgpaValue: {
    color: '#FDE047',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  creditsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  creditsLabel: {
    color: colors.primary[200],
    fontSize: typography.sizes.xxs,
  },
  creditsValue: {
    color: colors.neutral[0],
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    minHeight: 76,
    ...shadows.sm,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickActionText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[800],
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: spacing.sm,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  viewAllLink: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
  },
  standingBadge: {
    backgroundColor: colors.success.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.success.border,
  },
  standingBadgeText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    color: colors.success.dark,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  metricNumber: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
  },
  metricLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    marginTop: 2,
  },
  classCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  classDayBadge: {
    alignItems: 'center',
    width: 68,
  },
  classDayText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
    textTransform: 'uppercase',
  },
  classTimeRange: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  classDivider: {
    width: 1,
    height: 44,
    backgroundColor: colors.neutral[200],
    marginHorizontal: spacing.sm,
  },
  classDetails: {
    flex: 1,
  },
  classCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  courseCode: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    color: colors.primary[700],
    textTransform: 'uppercase',
  },
  creditsTag: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[400],
    fontWeight: typography.weights.medium,
  },
  courseName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  roomLecturer: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    flex: 1,
  },
  updatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  updatedText: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[400],
  },
});
