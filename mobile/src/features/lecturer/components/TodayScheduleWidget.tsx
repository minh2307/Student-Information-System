/**
 * TodayScheduleWidget.tsx
 * Highlights next upcoming teaching session for Lecturers (REDS v2.0).
 * Features Academic Color Palette accent, room/time metadata, and instant QR Attendance launch button.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { tokens } from '@/theme';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/feedback/AppBadge';
import { AppEmptyState } from '@/components/feedback/AppEmptyState';
import { AppLoadingSkeleton } from '@/components/feedback/AppLoadingSkeleton';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { formatDayOfWeek, formatTime } from '@/utils/formatters';
import { LecturerClassSection } from '../types';

export interface TodayScheduleWidgetProps {
  upcomingClass: LecturerClassSection | null;
  isLoading?: boolean;
  onNavigateToSchedule?: () => void;
  onNavigateToAttendance?: () => void;
  testID?: string;
}

/**
 * Deterministically maps a course code to one of the 5 REDS v2.0 Academic Palettes
 */
const getAcademicPaletteForCourse = (courseCode: string) => {
  const list = [
    tokens.academic.blueSapphire,
    tokens.academic.emeraldGreen,
    tokens.academic.amberGold,
    tokens.academic.purpleAmethyst,
    tokens.academic.roseRuby,
  ];
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = (hash << 5) - hash + courseCode.charCodeAt(i);
    hash |= 0;
  }
  return list[Math.abs(hash) % list.length];
};

export const TodayScheduleWidget: React.FC<TodayScheduleWidgetProps> = ({
  upcomingClass,
  isLoading = false,
  onNavigateToSchedule,
  onNavigateToAttendance,
  testID = 'today-schedule-widget',
}) => {
  const router = useRouter();

  const handleGoToSchedule = () => {
    if (onNavigateToSchedule) {
      onNavigateToSchedule();
    } else {
      router.push('/(lecturer)/schedule');
    }
  };

  const handleGoToAttendance = () => {
    if (onNavigateToAttendance) {
      onNavigateToAttendance();
    } else {
      router.push('/(lecturer)/attendance');
    }
  };

  const palette = upcomingClass
    ? getAcademicPaletteForCourse(upcomingClass.courseCode || 'CS')
    : tokens.academic.blueSapphire;

  return (
    <View testID={testID}>
      <SectionHeader
        title="Buổi dạy tiếp theo"
        actionLabel="Xem toàn bộ"
        onAction={handleGoToSchedule}
      />

      {isLoading ? (
        <AppLoadingSkeleton variant="card" height={130} style={styles.skeletonItem} />
      ) : upcomingClass ? (
        <AppCard
          variant="elevated"
          style={[
            styles.upcomingCard,
            { borderLeftColor: palette.text, borderLeftWidth: 4 },
          ]}
        >
          {/* Section Code & Status Badge Header */}
          <View style={styles.upcomingHeader}>
            <View style={[styles.classCodeTag, { backgroundColor: palette.badge }]}>
              <AppText variant="captionBold" style={[styles.classCodeText, { color: palette.text }]}>
                {upcomingClass.sectionCode}
              </AppText>
            </View>
            <AppBadge
              label={upcomingClass.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
              variant={upcomingClass.status === 'OPEN' ? 'success' : 'warning'}
              size="sm"
            />
          </View>

          {/* Course Name */}
          <AppText variant="bodyBold" color="primary" numberOfLines={2} style={styles.upcomingCourseName}>
            {upcomingClass.courseName} ({upcomingClass.courseCode})
          </AppText>

          {/* Day & Time Row */}
          <View style={styles.upcomingMetaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={15} color={palette.text} />
              <AppText variant="caption" color="secondary" style={styles.metaItemText}>
                {formatDayOfWeek(upcomingClass.dayOfWeek)}
              </AppText>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={15} color={palette.text} />
              <AppText variant="caption" color="secondary" style={styles.metaItemText}>
                {formatTime(upcomingClass.startTime)} - {formatTime(upcomingClass.endTime)}
              </AppText>
            </View>
          </View>

          {/* Room & Capacity Row */}
          <View style={styles.upcomingMetaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={15} color={tokens.text.muted} />
              <AppText variant="caption" color="secondary" style={styles.metaItemText}>
                Phòng: {upcomingClass.roomName || 'Chưa cập nhật'}
              </AppText>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={15} color={tokens.text.muted} />
              <AppText variant="caption" color="secondary" style={styles.metaItemText}>
                Sĩ số: {upcomingClass.currentEnrolled}/{upcomingClass.maxCapacity} SV
              </AppText>
            </View>
          </View>

          {/* Instant QR Attendance Button (Touch target >= 48dp) */}
          <Pressable
            style={({ pressed }) => [styles.quickAttendanceBtn, pressed && styles.btnPressed]}
            onPress={handleGoToAttendance}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.25)', borderless: false }}
            accessibilityRole="button"
            accessibilityLabel="Mở điểm danh QR lớp này"
          >
            <Ionicons name="qr-code-outline" size={18} color="#FFFFFF" />
            <AppText variant="captionBold" style={styles.quickAttendanceText}>
              Mở điểm danh QR lớp này
            </AppText>
          </Pressable>
        </AppCard>
      ) : (
        <AppEmptyState
          icon="calendar-outline"
          title="Chưa có lịch giảng dạy"
          message="Hiện tại Thầy/Cô chưa được phân công lớp học phần nào trong học kỳ này."
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonItem: {
    width: '100%',
    marginBottom: tokens.spacing.md,
  },
  upcomingCard: {
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  classCodeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  classCodeText: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  upcomingCourseName: {
    marginTop: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs,
  },
  upcomingMetaRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    marginVertical: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItemText: {
    fontSize: 12,
  },
  quickAttendanceBtn: {
    marginTop: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: tokens.brand.burgundy,
    borderRadius: tokens.radius.md,
    minHeight: 48, // Touch target >= 48dp
    paddingHorizontal: tokens.spacing.md,
  },
  btnPressed: {
    opacity: 0.85,
  },
  quickAttendanceText: {
    color: '#FFFFFF',
  },
});

export default TodayScheduleWidget;
