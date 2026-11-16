/**
 * LecturerKpiGrid.tsx
 * 4-Metric Bento Grid for Lecturer Teaching Overview (REDS v2.0).
 * Displays assigned classes, total enrolled students, today's teaching load, and active open classes.
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppLoadingSkeleton } from '@/components/feedback/AppLoadingSkeleton';
import { SectionHeader } from '@/components/layout/SectionHeader';

export interface LecturerKpiMetrics {
  totalClasses: number;
  totalStudents: number;
  todayCount: number;
  activeClasses: number;
}

export interface LecturerKpiGridProps {
  metrics: LecturerKpiMetrics;
  isLoading?: boolean;
  testID?: string;
}

export const LecturerKpiGrid: React.FC<LecturerKpiGridProps> = ({
  metrics,
  isLoading = false,
  testID = 'lecturer-kpi-grid',
}) => {
  return (
    <View testID={testID}>
      <SectionHeader title="Chỉ số giảng dạy học kỳ" />

      {isLoading ? (
        <View style={styles.skeletonContainer} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={tokens.brand.burgundy} />
          <AppText variant="caption" color="muted" style={styles.loadingText}>
            Đang tải chỉ số giảng dạy...
          </AppText>
          <View style={styles.skeletonRow}>
            <AppLoadingSkeleton variant="card" height={70} style={styles.skeletonFlex} />
            <AppLoadingSkeleton variant="card" height={70} style={styles.skeletonFlex} />
          </View>
        </View>
      ) : (
        <View style={styles.metricsGrid}>
          {/* 1. Lớp phụ trách */}
          <AppCard variant="outlined" style={styles.metricCard}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="book-outline" size={20} color="#1D4ED8" />
            </View>
            <AppText variant="h2" style={styles.metricValue}>
              {metrics.totalClasses}
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.metricLabel}>
              Lớp phụ trách
            </AppText>
          </AppCard>

          {/* 2. Tổng lượt sinh viên đăng ký */}
          <AppCard variant="outlined" style={styles.metricCard}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="people-outline" size={20} color="#047857" />
            </View>
            <AppText variant="h2" style={styles.metricValue}>
              {metrics.totalStudents}
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.metricLabel}>
              Tổng sinh viên đăng ký
            </AppText>
          </AppCard>

          {/* 3. Ca dạy hôm nay */}
          <AppCard variant="outlined" style={styles.metricCard}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="calendar-outline" size={20} color="#B45309" />
            </View>
            <AppText variant="h2" style={styles.metricValue}>
              {metrics.todayCount}
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.metricLabel}>
              Ca dạy hôm nay
            </AppText>
          </AppCard>

          {/* 4. Lớp đang mở đăng ký */}
          <AppCard variant="outlined" style={styles.metricCard}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#FAF5FF' }]}>
              <Ionicons name="checkmark-done-circle-outline" size={20} color="#6D28D9" />
            </View>
            <AppText variant="h2" style={styles.metricValue}>
              {metrics.activeClasses}
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.metricLabel}>
              Lớp đang mở đăng ký
            </AppText>
          </AppCard>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    padding: tokens.spacing.md,
  },
  metricIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.xs,
  },
  metricValue: {
    color: tokens.brand.burgundy,
  },
  metricLabel: {
    marginTop: 2,
  },
  skeletonContainer: {
    padding: tokens.spacing.lg,
    backgroundColor: tokens.surface.card,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.border.default,
  },
  loadingText: {
    marginTop: tokens.spacing.xs,
    marginBottom: tokens.spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    width: '100%',
  },
  skeletonFlex: {
    flex: 1,
  },
});

export default LecturerKpiGrid;
