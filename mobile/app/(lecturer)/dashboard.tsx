/**
 * Lecturer Dashboard Screen - REDS v2.0
 * Real-time overview of assigned classes, teaching schedule, and quick actions.
 * Integrates AppNotificationHeader, ConnectedOfflineBanner, LecturerProfileCard,
 * LecturerKpiGrid, TodayScheduleWidget, and LecturerQuickActions.
 */

import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import {
  useLecturerClasses,
  LecturerProfileCard,
  LecturerKpiGrid,
  TodayScheduleWidget,
  LecturerQuickActions,
} from '@/features/lecturer';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { tokens } from '@/theme';
import { AppErrorState } from '@/components/feedback/AppErrorState';
import { ConnectedOfflineBanner, LastSyncedIndicator } from '@/features/offline';
import { AppNotificationHeader } from '@/features/notifications';
import { LecturerClassSection } from '@/features/lecturer/types';

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const DAY_MAP: Record<string, number> = {
  SUN: 0,
  SUNDAY: 0,
  MON: 1,
  MONDAY: 1,
  TUE: 2,
  TUESDAY: 2,
  WED: 3,
  WEDNESDAY: 3,
  THU: 4,
  THURSDAY: 4,
  FRI: 5,
  FRIDAY: 5,
  SAT: 6,
  SATURDAY: 6,
};

/**
 * Normalizes time string to standard 'HH:mm' 24h format.
 * Handles non-padded ('7:30' -> '07:30'), strings with seconds ('07:30:00' -> '07:30'),
 * and trims whitespace. Returns '' if invalid.
 */
export const normalizeTime = (timeStr?: string | null): string => {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (!trimmed.includes(':')) return '';
  const parts = trimmed.split(':');
  const hour = parts[0].padStart(2, '0');
  const minute = (parts[1] || '0').substring(0, 2).padStart(2, '0');
  return `${hour}:${minute}`;
};

/**
 * Returns the academic time representation (Asia/Ho_Chi_Minh, UTC+7)
 * for matching against the institution's official class timetable.
 */
export const getAcademicCurrentTime = (
  now: Date = new Date()
): { dayIndex: number; timeStr: string } => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hourCycle: 'h23',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    let weekdayStr = '';
    let hourStr = '00';
    let minuteStr = '00';
    for (const part of parts) {
      if (part.type === 'weekday') weekdayStr = part.value.toUpperCase();
      if (part.type === 'hour') hourStr = part.value;
      if (part.type === 'minute') minuteStr = part.value;
    }
    const dayIndex = DAY_MAP[weekdayStr] ?? now.getDay();
    return { dayIndex, timeStr: `${hourStr}:${minuteStr}` };
  } catch {
    // Safe fallback to device time if Intl is not supported in the runtime
    const dayIndex = now.getDay();
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return { dayIndex, timeStr: `${hour}:${minute}` };
  }
};

/**
 * Chronologically determines the closest upcoming teaching class for the lecturer.
 * Accurately handles:
 * - Timezone alignment to Vietnam Academic Time (Asia/Ho_Chi_Minh, UTC+7).
 * - Normalization of unpadded time strings ('7:30' -> '07:30').
 * - Filtering out malformed or unrecognized dayOfWeek entries.
 * - Sorting classes by start time if multiple classes occur on the same day.
 * - Stable tie-breaking by sectionCode when classes share the same day and start time.
 * - Identifying in-progress classes (currently in session) as the active teaching session.
 * - Skipping classes that have reached or passed their end time (<= currentTimeStr).
 * - Finding the earliest upcoming class in future days of the week (with weekly wrap-around).
 * - Returns null when no valid future classes exist, triggering AppEmptyState.
 */
export const findNextUpcomingClass = (
  classes: LecturerClassSection[],
  now: Date = new Date()
): LecturerClassSection | null => {
  if (!classes || classes.length === 0) return null;

  const { dayIndex: currentDayIndex, timeStr: currentTimeStr } = getAcademicCurrentTime(now);

  // Filter only classes with recognized day of week
  const validClasses = classes.filter((c) => {
    if (!c || !c.dayOfWeek) return false;
    const dayKey = c.dayOfWeek.trim().toUpperCase();
    return DAY_MAP[dayKey] !== undefined;
  });

  if (validClasses.length === 0) return null;

  const candidates = validClasses.map((c) => {
    const dayKey = c.dayOfWeek.trim().toUpperCase();
    const classDayIndex = DAY_MAP[dayKey];

    let dayDiff = (classDayIndex - currentDayIndex + 7) % 7;
    const normalizedEndTime = normalizeTime(c.endTime);

    // If class is scheduled for today but has reached or passed its end time,
    // schedule it for next week's session (+7 days)
    if (dayDiff === 0 && normalizedEndTime && normalizedEndTime <= currentTimeStr) {
      dayDiff = 7;
    }

    const normalizedStartTime = normalizeTime(c.startTime) || '99:99';
    return { classItem: c, dayDiff, startTime: normalizedStartTime };
  });

  candidates.sort((a, b) => {
    if (a.dayDiff !== b.dayDiff) {
      return a.dayDiff - b.dayDiff;
    }
    const timeComp = a.startTime.localeCompare(b.startTime);
    if (timeComp !== 0) return timeComp;
    return (a.classItem.sectionCode || '').localeCompare(b.classItem.sectionCode || '');
  });

  return candidates[0]?.classItem || null;
};

export default function LecturerDashboardScreen() {
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
    const { dayIndex: todayIndex } = getAcademicCurrentTime();
    const todayCode = DAY_CODES[todayIndex];

    const totalClasses = classes.length;
    const totalStudents = classes.reduce((acc, c) => acc + (c.currentEnrolled || 0), 0);
    const todayClasses = classes.filter(
      (c) => c.dayOfWeek?.toUpperCase() === todayCode
    );
    const activeClasses = classes.filter((c) => c.status === 'OPEN').length;

    // Determine upcoming class chronologically (considers time, day of week, and skips finished sessions)
    const upcomingClass = findNextUpcomingClass(classes);

    return {
      totalClasses,
      totalStudents,
      todayCount: todayClasses.length,
      activeClasses,
      upcomingClass,
    };
  }, [classes]);

  const lecturerTitle = user?.fullName
    ? user.fullName.split(' ').slice(-1)[0]
    : 'Giảng viên';

  return (
    <View style={styles.root}>
      {/* 1. Shared REDS v2.0 Top Navigation Header with Notification Bell */}
      <AppNotificationHeader
        title="Tổng quan giảng viên"
        subtitle={`Xin chào, ${lecturerTitle}`}
        variant="burgundy"
        testID="lecturer-dashboard-header"
      />

      {/* 2. Shared Offline Banner */}
      <ConnectedOfflineBanner testID="lecturer-dashboard-offline-banner" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={tokens.brand.burgundy}
            colors={[tokens.brand.burgundy]}
          />
        }
      >
        {/* 3. Lecturer Identity Card (Institutional Burgundy) */}
        <LecturerProfileCard
          user={user}
          lecturerProfile={lecturerProfile}
          testID="lecturer-identity-card"
        />

        {/* 4. Teaching Overview Metrics */}
        {isClassesError ? (
          <AppErrorState
            title="Không thể tải dữ liệu lớp học"
            message={classesError?.message || 'Lỗi kết nối máy chủ.'}
            onRetry={() => refetchClasses()}
            retryLabel="Thử lại"
          />
        ) : (
          <LecturerKpiGrid
            metrics={metrics}
            isLoading={isClassesLoading}
            testID="lecturer-kpi-grid"
          />
        )}

        {/* 5. Today Schedule Widget */}
        <TodayScheduleWidget
          upcomingClass={metrics.upcomingClass}
          isLoading={isClassesLoading}
          testID="today-schedule-widget"
        />

        {/* 6. Quick Navigation Actions */}
        <LecturerQuickActions testID="lecturer-quick-actions" />

        {/* 7. Last Synced Freshness Indicator */}
        <LastSyncedIndicator
          isRefetching={isRefetching}
          onRefresh={handleRefresh}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.surface.canvas,
  },
  container: {
    flex: 1,
    backgroundColor: tokens.surface.canvas,
  },
  content: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxxl,
  },
});
