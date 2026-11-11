/**
 * Lecturer Dashboard Screen
 * Real-time overview of assigned classes, teaching schedule, and quick actions.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/authStore';
import { useLecturerClasses } from '@/features/lecturer';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { colors, spacing, typography, radius } from '@/theme';
import { formatDayOfWeek, formatTime } from '@/utils/formatters';
import { OfflineIndicator, LastSyncedIndicator } from '@/features/offline';

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function LecturerDashboardScreen() {
  const router = useRouter();

  // Auth & Profile state
  const authUser = useAuthStore((state) => state.user);
  const authLecturerProfile = useAuthStore((state) => state.lecturerProfile);

  // Live profile query
  const { data: profileData, refetch: refetchProfile } = useProfile();
  const user = profileData?.user || authUser;
  const lecturerProfile = profileData?.lecturerProfile || authLecturerProfile;

  // Live classes query
  const {
    data: classes = [],
    isLoading: isClassesLoading,
    isError: isClassesError,
    error: classesError,
    refetch: refetchClasses,
    isRefetching,
  } = useLecturerClasses();

  const handleRefresh = async () => {
    await Promise.all([refetchProfile(), refetchClasses()]);
  };

  // Compute metrics from real backend data
  const metrics = useMemo(() => {
    const todayIndex = new Date().getDay();
    const todayCode = DAY_CODES[todayIndex];

    const totalClasses = classes.length;
    const totalStudents = classes.reduce((acc, c) => acc + (c.currentEnrolled || 0), 0);
    const todayClasses = classes.filter(
      (c) => c.dayOfWeek?.toUpperCase() === todayCode
    );
    const activeClasses = classes.filter((c) => c.status === 'OPEN').length;

    // Determine upcoming class: prioritize today's next class, or the first upcoming in schedule
    let upcomingClass = todayClasses[0] || classes[0] || null;

    return {
      totalClasses,
      totalStudents,
      todayCount: todayClasses.length,
      activeClasses,
      upcomingClass,
    };
  }, [classes]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          tintColor={colors.primary[800]}
          colors={[colors.primary[800]]}
        />
      }
    >
      {/* Offline Mode Indicator */}
      <OfflineIndicator onRetry={handleRefresh} />

      {/* 5.1 Lecturer Information Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.avatarContainer}>
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={28} color={colors.primary[800]} />
            </View>
          )}
        </View>
        <View style={styles.welcomeInfo}>
          <Text style={styles.greeting}>Xin chào Thầy/Cô,</Text>
          <Text style={styles.lecturerName}>{user?.fullName || 'Giảng viên'}</Text>
          <Text style={styles.lecturerMeta}>
            Mã GV: {lecturerProfile?.lecturerCode || user?.username || '---'} |{' '}
            {lecturerProfile?.department || 'Khoa Công nghệ Thông tin'}
          </Text>
          {lecturerProfile?.degree && (
            <Text style={styles.degreeBadge}>{lecturerProfile.degree}</Text>
          )}
        </View>
      </View>

      {/* 5.2 Teaching Overview Metrics */}
      <Text style={styles.sectionTitle}>Chỉ số giảng dạy học kỳ</Text>

      {isClassesLoading ? (
        <View style={styles.skeletonContainer}>
          <ActivityIndicator size="small" color={colors.primary[800]} />
          <Text style={styles.loadingText}>Đang tải chỉ số giảng dạy...</Text>
        </View>
      ) : isClassesError ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={24} color={colors.error.main} />
          <Text style={styles.errorText}>
            Không thể tải dữ liệu lớp học: {classesError?.message || 'Lỗi kết nối'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetchClasses()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="book-outline" size={22} color={colors.primary[700]} />
            <Text style={styles.metricValue}>{metrics.totalClasses}</Text>
            <Text style={styles.metricLabel}>Lớp phụ trách</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="people-outline" size={22} color={colors.secondary[700]} />
            <Text style={styles.metricValue}>{metrics.totalStudents}</Text>
            <Text style={styles.metricLabel}>Tổng sinh viên</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="calendar-outline" size={22} color={colors.warning.dark} />
            <Text style={styles.metricValue}>{metrics.todayCount}</Text>
            <Text style={styles.metricLabel}>Ca dạy hôm nay</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="checkmark-done-circle-outline" size={22} color={colors.success.dark} />
            <Text style={styles.metricValue}>{metrics.activeClasses}</Text>
            <Text style={styles.metricLabel}>Lớp đang mở</Text>
          </View>
        </View>
      )}

      {/* 5.3 Upcoming Schedule */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Buổi dạy tiếp theo</Text>
        <TouchableOpacity
          onPress={() => router.push('/(lecturer)/schedule')}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllLink}>Xem toàn bộ</Text>
        </TouchableOpacity>
      </View>

      {isClassesLoading ? (
        <View style={styles.skeletonCard}>
          <ActivityIndicator size="small" color={colors.primary[800]} />
        </View>
      ) : metrics.upcomingClass ? (
        <View style={styles.upcomingCard}>
          <View style={styles.upcomingHeader}>
            <View style={styles.classCodeTag}>
              <Text style={styles.classCodeText}>{metrics.upcomingClass.sectionCode}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                metrics.upcomingClass.status === 'OPEN'
                  ? styles.statusBadgeOpen
                  : styles.statusBadgeClosed,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  metrics.upcomingClass.status === 'OPEN'
                    ? styles.statusTextOpen
                    : styles.statusTextClosed,
                ]}
              >
                {metrics.upcomingClass.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
              </Text>
            </View>
          </View>

          <Text style={styles.upcomingCourseName}>
            {metrics.upcomingClass.courseName} ({metrics.upcomingClass.courseCode})
          </Text>

          <View style={styles.upcomingMetaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary[700]} />
              <Text style={styles.metaItemText}>
                {formatDayOfWeek(metrics.upcomingClass.dayOfWeek)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={colors.primary[700]} />
              <Text style={styles.metaItemText}>
                {formatTime(metrics.upcomingClass.startTime)} -{' '}
                {formatTime(metrics.upcomingClass.endTime)}
              </Text>
            </View>
          </View>

          <View style={styles.upcomingMetaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color={colors.secondary[700]} />
              <Text style={styles.metaItemText}>
                Phòng: {metrics.upcomingClass.roomName || 'Chưa cập nhật'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={16} color={colors.neutral[600]} />
              <Text style={styles.metaItemText}>
                Sĩ số: {metrics.upcomingClass.currentEnrolled}/
                {metrics.upcomingClass.maxCapacity} SV
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.quickAttendanceBtn}
            onPress={() => router.push('/(lecturer)/attendance')}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={18} color={colors.neutral[0]} />
            <Text style={styles.quickAttendanceText}>Mở điểm danh QR lớp này</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-clear-outline" size={40} color={colors.neutral[400]} />
          <Text style={styles.emptyTitle}>Chưa có lịch giảng dạy</Text>
          <Text style={styles.emptySubtitle}>
            Hiện tại Thầy/Cô chưa được phân công lớp học phần nào trong học kỳ này.
          </Text>
        </View>
      )}

      {/* 5.4 Quick Actions */}
      <Text style={styles.sectionTitle}>Tác vụ giảng viên</Text>
      <View style={styles.actionsList}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(lecturer)/attendance')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: colors.primary[50] }]}>
            <Ionicons name="qr-code-outline" size={24} color={colors.primary[800]} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Mở điểm danh QR Động</Text>
            <Text style={styles.actionDesc}>
              Khởi tạo phiên điểm danh TOTP 15s chống gian lận & theo dõi SV quét thời gian thực
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(lecturer)/classes')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: colors.secondary[50] }]}>
            <Ionicons name="people-circle-outline" size={24} color={colors.secondary[700]} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Danh sách lớp & Nhập điểm</Text>
            <Text style={styles.actionDesc}>
              Tra cứu sinh viên, cập nhật điểm chuyên cần, giữa kỳ, cuối kỳ & chốt điểm học phần
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(lecturer)/schedule')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: colors.warning.light + '30' }]}>
            <Ionicons name="calendar-outline" size={24} color={colors.warning.dark} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Thời khóa biểu giảng dạy</Text>
            <Text style={styles.actionDesc}>
              Xem lịch dạy chi tiết theo ngày, tuần, phòng học và ca giảng dạy
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </TouchableOpacity>
      </View>

      {/* Last Synced Freshness Indicator */}
      <LastSyncedIndicator
        isRefetching={isRefetching}
        onRefresh={handleRefresh}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[100],
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  lecturerName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginTop: 2,
  },
  lecturerMeta: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    marginTop: 2,
  },
  degreeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary[100],
    color: colors.primary[900],
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  seeAllLink: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    color: colors.primary[800],
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.neutral[0],
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'flex-start',
  },
  metricValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginTop: spacing.xs,
  },
  metricLabel: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  skeletonContainer: {
    padding: spacing.lg,
    backgroundColor: colors.neutral[0],
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
  errorCard: {
    backgroundColor: colors.error.light + '20',
    borderColor: colors.error.main,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.error.dark,
    marginVertical: spacing.xs,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.error.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  retryButtonText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  upcomingCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing.md,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  classCodeTag: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  classCodeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  statusBadgeOpen: {
    backgroundColor: colors.success.light + '30',
  },
  statusBadgeClosed: {
    backgroundColor: colors.neutral[200],
  },
  statusText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
  },
  statusTextOpen: {
    color: colors.success.dark,
  },
  statusTextClosed: {
    color: colors.neutral[600],
  },
  upcomingCourseName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  upcomingMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItemText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[700],
  },
  quickAttendanceBtn: {
    backgroundColor: colors.primary[800],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  quickAttendanceText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  skeletonCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 4,
  },
  actionsList: {
    gap: spacing.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  actionDesc: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
    marginTop: 2,
  },
});
