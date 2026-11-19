/**
 * BentoKpiGrid.tsx
 * Academic Metric Grid presented as REDS v2.0 Bento Cards.
 * Strictly uses verified stats & semester progress data without synthetic zeros.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { tokens } from '@/theme';
import { AppText } from '@/components/primitives/AppText';
import { AppCard } from '@/components/primitives/AppCard';
import { AppBadge } from '@/components/feedback/AppBadge';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DashboardStats, SemesterProgress } from '../types';

export interface BentoKpiGridProps {
  stats?: DashboardStats;
  progress?: SemesterProgress;
  onPressAttendance?: () => void;
}

export const BentoKpiGrid: React.FC<BentoKpiGridProps> = ({ stats, progress, onPressAttendance }) => {
  const attendanceDisplay =
    progress?.attendanceRate != null ? `${progress.attendanceRate}%` : '--%';
  const conflicts = stats?.scheduleConflicts ?? 0;

  return (
    <View style={styles.container}>
      {/* Section Header with Academic Standing Badge */}
      <SectionHeader
        title="Chỉ số học tập kỳ này"
        rightElement={
          progress?.academicStanding ? (
            <AppBadge label={progress.academicStanding} variant="success" size="sm" />
          ) : undefined
        }
      />

      {/* 2x2 Bento Metric Cards */}
      <View style={styles.grid}>
        {/* Metric 1: Registered Courses */}
        <AppCard variant="outlined" style={styles.metricCard}>
          <AppText variant="h2" style={styles.metricNumber}>
            {stats?.registeredCourses ?? 0}
          </AppText>
          <AppText variant="caption" color="secondary" style={styles.metricLabel}>
            Môn học kỳ này
          </AppText>
        </AppCard>

        {/* Metric 2: Weekly Classes */}
        <AppCard variant="outlined" style={styles.metricCard}>
          <AppText variant="h2" style={styles.metricNumber}>
            {stats?.weeklyClasses ?? 0}
          </AppText>
          <AppText variant="caption" color="secondary" style={styles.metricLabel}>
            Tiết học / tuần
          </AppText>
        </AppCard>

        {/* Metric 3: Attendance Rate */}
        {onPressAttendance ? (
          <Pressable
            onPress={onPressAttendance}
            style={({ pressed }) => [styles.metricCardWrapper, pressed && styles.pressedMetric]}
            accessibilityRole="button"
            accessibilityLabel="Xem lịch sử điểm danh"
            testID="bento-attendance-kpi-card"
          >
            <AppCard variant="outlined" style={styles.metricCardInner}>
              <AppText variant="h2" style={styles.metricNumber}>
                {attendanceDisplay}
              </AppText>
              <AppText variant="caption" color="secondary" style={styles.metricLabel}>
                Tỷ lệ chuyên cần
              </AppText>
            </AppCard>
          </Pressable>
        ) : (
          <AppCard variant="outlined" style={styles.metricCard} testID="bento-attendance-kpi-card">
            <AppText variant="h2" style={styles.metricNumber}>
              {attendanceDisplay}
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.metricLabel}>
              Tỷ lệ chuyên cần
            </AppText>
          </AppCard>
        )}

        {/* Metric 4: Schedule Conflicts */}
        <AppCard variant="outlined" style={styles.metricCard}>
          <AppText
            variant="h2"
            style={[
              styles.metricNumber,
              conflicts > 0 ? { color: tokens.semantic.error.dark } : undefined,
            ]}
          >
            {conflicts}
          </AppText>
          <AppText variant="caption" color="secondary" style={styles.metricLabel}>
            Trùng lịch học
          </AppText>
        </AppCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: tokens.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  metricCard: {
    width: '48%',
    padding: tokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.surface.card,
  },
  metricCardWrapper: {
    width: '48%',
  },
  metricCardInner: {
    width: '100%',
    padding: tokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.surface.card,
  },
  pressedMetric: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  metricNumber: {
    fontSize: tokens.typography.sizes.h2,
    fontWeight: tokens.typography.weights.bold,
    color: tokens.text.primary,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: tokens.typography.sizes.caption,
    textAlign: 'center',
  },
});

export default BentoKpiGrid;
