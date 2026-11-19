/**
 * Lecturer Teaching Schedule Screen - REDS v2.0
 * Comprehensive schedule view with day selector, class details, and shortcuts.
 * Refactored into a clean Orchestrator composing decoupled Presentation Components.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  useLecturerClasses,
  LecturerClassSection,
  ScheduleDaySelector,
  LecturerScheduleCard,
  ScheduleDetailModal,
  SCHEDULE_DAYS,
} from '@/features/lecturer';
import { AppNotificationHeader } from '@/features/notifications';
import { ConnectedOfflineBanner } from '@/features/offline';
import { tokens } from '@/theme';
import { AppText } from '@/components/primitives/AppText';
import { AppEmptyState } from '@/components/feedback/AppEmptyState';
import { AppErrorState } from '@/components/feedback/AppErrorState';
import { AppLoadingSkeleton } from '@/components/feedback/AppLoadingSkeleton';

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function LecturerScheduleScreen() {
  const router = useRouter();

  // Determine today's day of week
  const todayDayCode = DAY_CODES[new Date().getDay()];
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<LecturerClassSection | null>(null);

  const {
    data: classes = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useLecturerClasses();

  // Filter classes by selected day (sorted chronologically if ALL)
  const filteredClasses = useMemo(() => {
    if (selectedDay === 'ALL') {
      return [...classes].sort((a, b) => {
        const dayA = a.dayOfWeek || '';
        const dayB = b.dayOfWeek || '';
        if (dayA === dayB) {
          return (a.startTime || '').localeCompare(b.startTime || '');
        }
        return dayA.localeCompare(dayB);
      });
    }
    return classes.filter(
      (c) => c.dayOfWeek?.toUpperCase() === selectedDay.toUpperCase()
    );
  }, [classes, selectedDay]);

  const selectedDayLabel =
    SCHEDULE_DAYS.find((d) => d.code === selectedDay)?.label || selectedDay;

  return (
    <View style={styles.container}>
      {/* 1. Shared REDS v2.0 Top Navigation Header with Notification Bell */}
      <AppNotificationHeader
        title="Lịch giảng dạy"
        subtitle="Thời khóa biểu và lớp học phần"
        variant="burgundy"
        testID="lecturer-schedule-header"
      />

      {/* 2. Shared Offline Banner */}
      <ConnectedOfflineBanner testID="lecturer-schedule-offline-banner" />

      {/* 3. Day Selector Bar (Touch Target >= 48dp, Accessible Ripple) */}
      <ScheduleDaySelector
        selectedDay={selectedDay}
        todayDayCode={todayDayCode}
        onSelectDay={setSelectedDay}
      />

      {/* 4. Schedule Content List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
            }}
            tintColor={tokens.brand.burgundy}
            colors={[tokens.brand.burgundy]}
          />
        }
      >
        <View style={styles.headerInfo}>
          <AppText variant="caption" color="secondary" style={styles.summaryText}>
            Hiển thị {filteredClasses.length} buổi giảng dạy{' '}
            {selectedDay === 'ALL' ? 'trong tuần' : `vào ${selectedDayLabel}`}
          </AppText>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={tokens.brand.burgundy} />
            <AppText variant="caption" color="muted" style={styles.loadingText}>
              Đang tải lịch giảng dạy...
            </AppText>
            <View style={styles.skeletonGroup}>
              <AppLoadingSkeleton variant="card" height={110} style={styles.skeletonItem} />
              <AppLoadingSkeleton variant="card" height={110} style={styles.skeletonItem} />
            </View>
          </View>
        ) : isError ? (
          <AppErrorState
            title="Không thể tải thời khóa biểu"
            message={error?.message || 'Lỗi kết nối đến máy chủ API.'}
            onRetry={() => refetch()}
            retryLabel="Tải lại"
          />
        ) : filteredClasses.length === 0 ? (
          <AppEmptyState
            icon="calendar-outline"
            title="Không có lịch giảng dạy"
            message={
              selectedDay === 'ALL'
                ? 'Thầy/Cô hiện không có buổi dạy nào trong hệ thống.'
                : `Thầy/Cô không có ca dạy nào vào ${selectedDayLabel}.`
            }
          />
        ) : (
          filteredClasses.map((item) => (
            <LecturerScheduleCard
              key={item.sectionId}
              item={item}
              onPress={setSelectedClass}
            />
          ))
        )}
      </ScrollView>

      {/* 5. Class Detail Modal */}
      <ScheduleDetailModal
        visible={!!selectedClass}
        selectedClass={selectedClass}
        onClose={() => setSelectedClass(null)}
        onNavigateToClasses={(item) => {
          setSelectedClass(null);
          router.push('/(lecturer)/classes');
        }}
        onNavigateToAttendance={(item) => {
          setSelectedClass(null);
          router.push('/(lecturer)/attendance');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.surface.canvas,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xxxl,
    paddingTop: tokens.spacing.sm,
  },
  headerInfo: {
    marginBottom: tokens.spacing.sm,
  },
  summaryText: {
    fontSize: 12,
  },
  centerContainer: {
    paddingVertical: tokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: tokens.spacing.sm,
  },
  skeletonGroup: {
    width: '100%',
    marginTop: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  skeletonItem: {
    width: '100%',
  },
});
