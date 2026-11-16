/**
 * Attendance Statistics Row - REDS v2.0
 * Real-time breakdown of scanned attendees, pending students, and total enrolled.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { tokens } from '@/theme';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';

export interface AttendanceStatsCardProps {
  attendedCount: number;
  totalEnrolled: number;
  testID?: string;
}

export const AttendanceStatsCard: React.FC<AttendanceStatsCardProps> = ({
  attendedCount,
  totalEnrolled,
  testID = 'attendance-stats-card',
}) => {
  const pendingCount = Math.max(0, totalEnrolled - attendedCount);

  return (
    <View style={styles.statsRow} testID={testID}>
      {/* 1. Attended / Scanned */}
      <AppCard variant="outlined" style={styles.statBox} testID="stat-attended">
        <AppText
          variant="h2"
          style={[styles.statNumber, { color: tokens.semantic.success.dark }]}
        >
          {attendedCount}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.statLabel}>
          Đã quét thành công
        </AppText>
      </AppCard>

      {/* 2. Pending / Unscanned */}
      <AppCard variant="outlined" style={styles.statBox} testID="stat-pending">
        <AppText
          variant="h2"
          style={[styles.statNumber, { color: tokens.semantic.warning.dark }]}
        >
          {pendingCount}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.statLabel}>
          Chưa điểm danh
        </AppText>
      </AppCard>

      {/* 3. Total Enrolled */}
      <AppCard variant="outlined" style={styles.statBox} testID="stat-total">
        <AppText
          variant="h2"
          color="primary"
          style={styles.statNumber}
        >
          {totalEnrolled}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.statLabel}>
          Tổng sĩ số
        </AppText>
      </AppCard>
    </View>
  );
};

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  statBox: {
    flex: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    alignItems: 'center',
    backgroundColor: tokens.surface.card,
  },
  statNumber: {
    fontSize: 20,
    lineHeight: 26,
  },
  statLabel: {
    marginTop: 2,
    textAlign: 'center',
    fontSize: 10,
  },
});
