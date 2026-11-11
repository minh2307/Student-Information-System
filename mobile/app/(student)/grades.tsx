/**
 * Student Grades Screen
 * Live integration with GET /api/v1/student/grades via TanStack Query.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useStudentGrades } from '@/features/student';
import { ErrorView } from '@/components/common/ErrorView';
import { EmptyState } from '@/components/common/EmptyState';
import { formatCgpa, formatScore } from '@/utils/formatters';

export default function GradesScreen() {
  const profile = useAuthStore((state) => state.studentProfile);
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');

  const {
    data: grades = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useStudentGrades();

  // Extract unique semesters from real grades data
  const semesters = useMemo(() => {
    const set = new Set<string>();
    grades.forEach((g) => {
      if (g.semesterName) set.add(g.semesterName);
    });
    return ['ALL', ...Array.from(set)];
  }, [grades]);

  // Filter grades according to semester
  const filteredGrades = useMemo(() => {
    if (selectedSemester === 'ALL') {
      return grades;
    }
    return grades.filter((g) => g.semesterName === selectedSemester);
  }, [grades, selectedSemester]);

  // Color mapping for letter grades
  const getGradeBadgeStyle = (letter?: string | null) => {
    if (!letter) return { bg: colors.neutral[100], text: colors.neutral[500] };
    const l = letter.toUpperCase();
    if (l.startsWith('A')) return { bg: '#ECFDF5', text: '#065F46' };
    if (l.startsWith('B')) return { bg: '#EFF6FF', text: '#1E40AF' };
    if (l.startsWith('C')) return { bg: '#FEF3C7', text: '#92400E' };
    if (l.startsWith('D')) return { bg: '#FFF7ED', text: '#9A3412' };
    return { bg: colors.error.light, text: colors.error.dark };
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            refetch();
          }}
          colors={[colors.primary[800]]}
          tintColor={colors.primary[800]}
        />
      }
    >
      {/* Cumulative GPA Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>C-GPA Tích lũy</Text>
          <Text style={styles.summaryValue}>{formatCgpa(profile?.currentCgpa)}</Text>
          <Text style={styles.summarySub}>
            {(profile?.currentCgpa ?? 0) >= 8.5
              ? 'Xuất sắc'
              : (profile?.currentCgpa ?? 0) >= 8.0
              ? 'Giỏi'
              : (profile?.currentCgpa ?? 0) >= 7.0
              ? 'Khá'
              : 'Trung bình'}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Tín chỉ tích lũy</Text>
          <Text style={styles.summaryValue}>
            {profile?.creditsEarned ?? 0} / {profile?.totalRequiredCredits ?? 160}
          </Text>
          <Text style={styles.summarySub}>
            Đạt {Math.round(((profile?.creditsEarned ?? 0) / (profile?.totalRequiredCredits ?? 160)) * 100)}%
          </Text>
        </View>
      </View>

      {/* Semester Filter Chips */}
      {semesters.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.semesterChips}
        >
          {semesters.map((sem) => {
            const isSelected = selectedSemester === sem;
            return (
              <Pressable
                key={sem}
                onPress={() => setSelectedSemester(sem)}
                style={[
                  styles.chip,
                  isSelected && styles.chipActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Lọc kỳ ${sem}`}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {sem === 'ALL' ? 'Tất cả học kỳ' : sem}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[800]} />
          <Text style={styles.loadingText}>Đang tải kết quả học tập...</Text>
        </View>
      ) : isError ? (
        <ErrorView
          title="Lỗi tải bảng điểm"
          message={error?.message || 'Không thể lấy kết quả học tập từ máy chủ.'}
          onRetry={refetch}
        />
      ) : filteredGrades.length === 0 ? (
        <EmptyState
          icon="school-outline"
          title="Chưa có kết quả học tập"
          message="Chưa có điểm thành phần hoặc điểm tổng kết được cập nhật cho học kỳ này."
        />
      ) : (
        filteredGrades.map((grade) => {
          const badgeStyle = getGradeBadgeStyle(grade.letterGrade);

          return (
            <View key={grade.enrollmentId} style={styles.gradeCard}>
              <View style={styles.gradeMain}>
                <View style={styles.gradeTopRow}>
                  <Text style={styles.courseCode}>{grade.courseCode}</Text>
                  {grade.credits ? (
                    <Text style={styles.creditsTag}>{grade.credits} Tín chỉ</Text>
                  ) : null}
                  {grade.semesterName ? (
                    <Text style={styles.semesterTag}>{grade.semesterName}</Text>
                  ) : null}
                </View>

                <Text style={styles.courseName}>{grade.courseName}</Text>

                {/* Component Scores Grid */}
                <View style={styles.scoresRow}>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Chuyên cần</Text>
                    <Text style={styles.scoreVal}>{formatScore(grade.attendanceScore)}</Text>
                  </View>
                  <View style={styles.scoreDivider} />
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Giữa kỳ</Text>
                    <Text style={styles.scoreVal}>{formatScore(grade.midtermScore)}</Text>
                  </View>
                  <View style={styles.scoreDivider} />
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Cuối kỳ</Text>
                    <Text style={styles.scoreVal}>{formatScore(grade.finalScore)}</Text>
                  </View>
                  <View style={styles.scoreDivider} />
                  <View style={styles.scoreItem}>
                    <Text style={[styles.scoreLabel, styles.scoreTotalLabel]}>Tổng kết</Text>
                    <Text style={[styles.scoreVal, styles.scoreTotalVal]}>
                      {formatScore(grade.totalScore)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Letter Grade Pill */}
              <View style={[styles.letterGradeBadge, { backgroundColor: badgeStyle.bg }]}>
                <Text style={[styles.letterGradeText, { color: badgeStyle.text }]}>
                  {grade.letterGrade || '--'}
                </Text>
                <Text style={styles.scoreSubText}>
                  {grade.totalScore != null ? grade.totalScore.toFixed(2) : '--'}
                </Text>
              </View>
            </View>
          );
        })
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
    paddingTop: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 48,
    backgroundColor: colors.neutral[200],
  },
  summaryLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  summaryValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
    marginTop: 2,
  },
  summarySub: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.semiBold,
    color: colors.success.dark,
    marginTop: 2,
  },
  semesterChips: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: colors.neutral[0],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 32,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary[800],
    borderColor: colors.primary[800],
  },
  chipText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[700],
    fontWeight: typography.weights.medium,
  },
  chipTextActive: {
    color: colors.neutral[0],
    fontWeight: typography.weights.bold,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: spacing.sm,
  },
  gradeCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  gradeMain: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  gradeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: 2,
  },
  courseCode: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    color: colors.primary[700],
    textTransform: 'uppercase',
  },
  creditsTag: {
    fontSize: 10,
    color: colors.neutral[500],
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  semesterTag: {
    fontSize: 10,
    color: colors.neutral[400],
  },
  courseName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginVertical: 4,
  },
  scoresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 9,
    color: colors.neutral[500],
  },
  scoreTotalLabel: {
    color: colors.primary[800],
    fontWeight: typography.weights.bold,
  },
  scoreVal: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[800],
    marginTop: 1,
  },
  scoreTotalVal: {
    color: colors.primary[800],
    fontWeight: typography.weights.bold,
  },
  scoreDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.neutral[200],
  },
  letterGradeBadge: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  letterGradeText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  scoreSubText: {
    fontSize: 10,
    color: colors.neutral[500],
    fontWeight: typography.weights.medium,
    marginTop: 1,
  },
});
