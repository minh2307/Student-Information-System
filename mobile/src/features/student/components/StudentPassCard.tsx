/**
 * StudentPassCard.tsx
 * Space-Efficient Digital Student Identity Card (REDS v2.0 Burgundy Theme).
 * Formats verified student profile & academic progress without mock QR codes.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { tokens } from '@/theme';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/feedback/AppBadge';
import { formatCgpa } from '@/utils/formatters';
import { User, StudentProfile } from '@/types';
import { SemesterProgress } from '../types';

export interface StudentPassCardProps {
  user: User | null;
  profile: StudentProfile | null;
  progress?: SemesterProgress;
  testID?: string;
}

export const StudentPassCard: React.FC<StudentPassCardProps> = ({
  user,
  profile,
  progress,
  testID = 'student-id-card',
}) => {
  const studentName = user?.fullName || 'Sinh viên Rikkei';
  const studentCode = profile?.studentCode || user?.username || 'SV2024001';
  const major = profile?.major || 'B.Tech - Computer Science';
  const currentCgpa = progress?.currentCgpa ?? profile?.currentCgpa;
  const creditsEarned = progress?.creditsEarned ?? profile?.creditsEarned ?? 0;
  const totalCredits = progress?.totalRequiredCredits ?? profile?.totalRequiredCredits ?? 160;
  const initial = studentName.charAt(0).toUpperCase();

  return (
    <View style={styles.cardContainer} testID={testID}>
      {/* Top Institutional Header */}
      <View style={styles.headerRow}>
        <AppText variant="captionBold" style={styles.schoolName}>
          HỌC VIỆN CÔNG NGHỆ RIKKEI
        </AppText>
        <View style={styles.badgePill}>
          <AppText variant="captionBold" style={styles.badgeText}>
            THẺ SINH VIÊN ĐIỆN TỬ
          </AppText>
        </View>
      </View>

      {/* Student Identity Body */}
      <View style={styles.bodyRow}>
        <View style={styles.avatarCircle} accessibilityRole="image" accessibilityLabel={`Ảnh đại diện ${studentName}`}>
          <AppText variant="h2" style={styles.avatarInitial}>
            {initial}
          </AppText>
        </View>
        <View style={styles.detailsCol}>
          <AppText variant="bodyBold" style={styles.studentName} numberOfLines={1}>
            {studentName}
          </AppText>
          <AppText variant="caption" style={styles.studentCode}>
            {studentCode}
          </AppText>
          <AppText variant="caption" style={styles.majorText} numberOfLines={1}>
            {major}
          </AppText>
        </View>
        {progress?.academicStanding ? (
          <View style={styles.standingBadge}>
            <AppBadge label={progress.academicStanding} variant="success" size="sm" />
          </View>
        ) : null}
      </View>

      {/* Footer Academic Metrics (CGPA & Credits) */}
      <View style={styles.footerRow}>
        <View style={styles.statBox}>
          <AppText variant="caption" style={styles.statLabel}>
            C-GPA Tích lũy
          </AppText>
          <AppText variant="bodyBold" style={styles.statValueHighlight}>
            {formatCgpa(currentCgpa)}
          </AppText>
        </View>

        <View style={styles.divider} />

        <View style={styles.statBox}>
          <AppText variant="caption" style={styles.statLabel}>
            Tín chỉ
          </AppText>
          <AppText variant="bodyBold" style={styles.statValue}>
            {creditsEarned} / {totalCredits}
          </AppText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: tokens.brand.burgundy,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: tokens.spacing.md,
    ...tokens.elevation.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    paddingBottom: tokens.spacing.xs,
  },
  schoolName: {
    color: '#FECACA',
    letterSpacing: 0.8,
  },
  badgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: tokens.spacing.xs,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: tokens.spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  detailsCol: {
    flex: 1,
  },
  studentName: {
    color: '#FFFFFF',
    fontSize: tokens.typography.sizes.body,
  },
  studentCode: {
    color: '#FCA5A5',
    fontWeight: '600',
    marginTop: 1,
  },
  majorText: {
    color: '#E2E8F0',
    marginTop: 1,
  },
  standingBadge: {
    alignSelf: 'flex-start',
    marginLeft: tokens.spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    marginTop: tokens.spacing.sm,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statLabel: {
    color: '#FCA5A5',
    fontSize: 11,
  },
  statValueHighlight: {
    color: '#FEF08A',
    fontSize: tokens.typography.sizes.body,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: tokens.typography.sizes.body,
  },
});

export default StudentPassCard;
