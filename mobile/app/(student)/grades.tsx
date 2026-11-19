/**
 * Student Grades & Academic Performance Screen (TASK ST-02)
 * Native implementation for academic performance, CPA/GPA summary,
 * semester filtering, component scores breakdown, and letter grade visualization.
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
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { useStudentGrades, useStudentAcademicContext } from '@/features/student';
import { ErrorView } from '@/components/common/ErrorView';
import { EmptyState } from '@/components/common/EmptyState';
import { StudentGrade } from '@/features/student/types';

export default function GradesScreen() {
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');

  const {
    data: grades,
    isLoading: gradesLoading,
    isError: gradesError,
    error: gradesErr,
    refetch: refetchGrades,
    isRefetching: gradesRefetching,
  } = useStudentGrades();

  const {
    data: academicContext,
    isLoading: contextLoading,
    refetch: refetchContext,
    isRefetching: contextRefetching,
  } = useStudentAcademicContext();

  const isRefreshing = gradesRefetching || contextRefetching;

  const onRefresh = async () => {
    await Promise.all([refetchGrades(), refetchContext()]);
  };

  // Extract unique semesters from student grades for filter tabs
  const availableSemesters = useMemo(() => {
    if (!grades || grades.length === 0) return [];
    const set = new Set<string>();
    grades.forEach((g) => {
      if (g.semesterName && g.semesterName.trim()) {
        set.add(g.semesterName.trim());
      }
    });
    return Array.from(set);
  }, [grades]);

  // Filter grades based on selected semester
  const filteredGrades = useMemo(() => {
    if (!grades) return [];
    if (selectedSemester === 'ALL') return grades;
    return grades.filter((g) => g.semesterName === selectedSemester);
  }, [grades, selectedSemester]);

  // Semester statistics
  const stats = useMemo(() => {
    const list = filteredGrades;
    const totalCourses = list.length;
    const passedCourses = list.filter((g) => g.letterGrade && g.letterGrade !== 'F').length;
    const failedCourses = list.filter((g) => g.letterGrade === 'F').length;
    const inProgressCourses = list.filter((g) => !g.letterGrade || g.isLocked === false).length;
    const totalCredits = list.reduce((acc, curr) => acc + (curr.credits || 0), 0);

    return {
      totalCourses,
      passedCourses,
      failedCourses,
      inProgressCourses,
      totalCredits,
    };
  }, [filteredGrades]);

  // Format grade numbers
  const formatScore = (val?: number | null) => {
    if (val === null || val === undefined) return '-';
    return Number(val).toFixed(1);
  };

  // Get letter grade badge styling
  const getLetterGradeColor = (grade?: string | null) => {
    if (!grade) return { bg: colors.neutral[100], text: colors.neutral[600] };
    switch (grade.toUpperCase()) {
      case 'A':
      case 'A+':
        return { bg: '#DCFCE7', text: '#15803D' }; // Emerald / Green
      case 'B+':
      case 'B':
        return { bg: '#DBEAFE', text: '#1D4ED8' }; // Blue
      case 'C+':
      case 'C':
        return { bg: '#FEF3C7', text: '#B45309' }; // Amber
      case 'D+':
      case 'D':
        return { bg: '#FFEDD5', text: '#C2410C' }; // Orange
      case 'F':
        return { bg: '#FEE2E2', text: '#B91C1C' }; // Red
      default:
        return { bg: colors.neutral[100], text: colors.neutral[600] };
    }
  };

  if (gradesLoading && !grades) {
    return (
      <View style={styles.loadingContainer} testID="grades-loading">
        <ActivityIndicator size="large" color={colors.primary[900]} />
        <Text style={styles.loadingText}>Đang tải bảng điểm học vụ...</Text>
      </View>
    );
  }

  if (gradesError && !grades) {
    return (
      <View style={styles.container} testID="grades-error">
        <ErrorView
          title="Không thể tải bảng điểm"
          message={gradesErr?.message || 'Lỗi kết nối máy chủ. Vui lòng thử lại.'}
          onRetry={onRefresh}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      testID="student-grades-screen"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[colors.primary[900]]}
        />
      }
    >
      {/* ── 1. Academic Performance KPI Summary ── */}
      <View style={styles.summaryCard} testID="grades-summary-card">
        <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.summaryTitle}>Kết quả học tập tích lũy</Text>
            <Text style={styles.summarySubtitle}>
              {academicContext?.major || 'Hệ đào tạo chính quy'}
            </Text>
          </View>
          {academicContext?.academicStanding && (
            <View style={styles.standingBadge}>
              <Text style={styles.standingText}>{academicContext.academicStanding}</Text>
            </View>
          )}
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiLabel}>CPA Tích lũy</Text>
            <Text style={styles.kpiValueCpa}>
              {academicContext?.currentCgpa != null
                ? Number(academicContext.currentCgpa).toFixed(2)
                : '3.45'}
              <Text style={styles.kpiMaxScale}> / 4.0</Text>
            </Text>
          </View>

          <View style={styles.kpiDivider} />

          <View style={styles.kpiItem}>
            <Text style={styles.kpiLabel}>Tín chỉ tích lũy</Text>
            <Text style={styles.kpiValue}>
              {academicContext?.completedCredits ?? stats.totalCredits}
              <Text style={styles.kpiMaxScale}>
                {academicContext?.totalRequiredCredits
                  ? ` / ${academicContext.totalRequiredCredits}`
                  : ' TC'}
              </Text>
            </Text>
          </View>

          <View style={styles.kpiDivider} />

          <View style={styles.kpiItem}>
            <Text style={styles.kpiLabel}>Tỷ lệ qua môn</Text>
            <Text style={styles.kpiValueSuccess}>
              {stats.totalCourses > 0
                ? `${Math.round((stats.passedCourses / stats.totalCourses) * 100)}%`
                : '100%'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── 2. Semester Filter Tabs ── */}
      {availableSemesters.length > 0 && (
        <View style={styles.filterSection} testID="semester-filter-section">
          <Text style={styles.filterHeaderTitle}>Chọn học kỳ tra cứu</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <Pressable
              style={[
                styles.filterPill,
                selectedSemester === 'ALL' && styles.filterPillActive,
              ]}
              onPress={() => setSelectedSemester('ALL')}
              testID="semester-filter-all"
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedSemester === 'ALL' && styles.filterPillTextActive,
                ]}
              >
                Tất cả các kỳ
              </Text>
            </Pressable>

            {availableSemesters.map((sem) => {
              const active = selectedSemester === sem;
              return (
                <Pressable
                  key={sem}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setSelectedSemester(sem)}
                  testID={`semester-filter-${sem}`}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      active && styles.filterPillTextActive,
                    ]}
                  >
                    {sem}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── 3. Grades List ── */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.sectionTitle}>
          {selectedSemester === 'ALL' ? 'Tất cả môn học' : `Danh sách môn - ${selectedSemester}`}
        </Text>
        <Text style={styles.sectionCountBadge}>{filteredGrades.length} môn</Text>
      </View>

      {filteredGrades.length === 0 ? (
        <View testID="grades-empty">
          <EmptyState
            icon="school-outline"
            title="Chưa có điểm học phần"
            message={`Không tìm thấy kết quả điểm nào trong kỳ ${
              selectedSemester === 'ALL' ? 'này' : selectedSemester
            }.`}
          />
        </View>
      ) : (
        filteredGrades.map((grade: StudentGrade) => {
          const isPassed = grade.letterGrade && grade.letterGrade !== 'F';
          const isFailed = grade.letterGrade === 'F';
          const isPending = !grade.letterGrade || grade.isLocked === false;
          const letterStyle = getLetterGradeColor(grade.letterGrade);

          return (
            <View
              key={grade.enrollmentId || `${grade.courseCode}-${grade.semesterName}`}
              style={styles.gradeCard}
              testID={`grade-card-${grade.courseCode}`}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.courseCodeBadge}>
                    <Text style={styles.courseCodeText}>{grade.courseCode}</Text>
                  </View>
                  <Text style={styles.courseName} numberOfLines={2}>
                    {grade.courseName}
                  </Text>
                  <Text style={styles.courseSemesterInfo}>
                    {grade.semesterName} • {grade.credits || 3} tín chỉ
                  </Text>
                </View>

                {/* Status & Letter Grade */}
                <View style={styles.cardHeaderRight}>
                  {grade.letterGrade ? (
                    <View
                      style={[
                        styles.letterGradeBadge,
                        { backgroundColor: letterStyle.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.letterGradeText,
                          { color: letterStyle.text },
                        ]}
                      >
                        {grade.letterGrade}
                      </Text>
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.statusPill,
                      isPassed && styles.statusPillPassed,
                      isFailed && styles.statusPillFailed,
                      isPending && styles.statusPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isPassed && styles.statusPillTextPassed,
                        isFailed && styles.statusPillTextFailed,
                        isPending && styles.statusPillTextPending,
                      ]}
                    >
                      {isPassed ? 'ĐẠT' : isFailed ? 'HỌC LẠI' : 'CHỜ ĐIỂM'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Component Scores Table */}
              <View style={styles.scoresGrid}>
                <View style={styles.scoreCol}>
                  <Text style={styles.scoreColLabel}>Chuyên cần</Text>
                  <Text style={styles.scoreColValue}>{formatScore(grade.attendanceScore)}</Text>
                </View>

                <View style={styles.scoreColDivider} />

                <View style={styles.scoreCol}>
                  <Text style={styles.scoreColLabel}>Giữa kỳ</Text>
                  <Text style={styles.scoreColValue}>{formatScore(grade.midtermScore)}</Text>
                </View>

                <View style={styles.scoreColDivider} />

                <View style={styles.scoreCol}>
                  <Text style={styles.scoreColLabel}>Cuối kỳ</Text>
                  <Text style={styles.scoreColValue}>{formatScore(grade.finalScore)}</Text>
                </View>

                <View style={styles.scoreColDivider} />

                <View style={[styles.scoreCol, styles.totalScoreCol]}>
                  <Text style={styles.totalScoreColLabel}>Tổng kết</Text>
                  <Text style={styles.totalScoreColValue}>{formatScore(grade.totalScore)}</Text>
                </View>
              </View>

              {/* Locked/Pending Info Footer */}
              {grade.isLocked === false && (
                <View style={styles.pendingNoticeRow}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.warning.dark} />
                  <Text style={styles.pendingNoticeText}>
                    Điểm đang trong thời gian phúc khảo / chưa khóa chính thức.
                  </Text>
                </View>
              )}
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
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.body,
    color: colors.neutral[600],
  },
  summaryCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  summarySubtitle: {
    fontSize: typography.sizes.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  standingBadge: {
    backgroundColor: colors.primary[900],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  standingText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  kpiDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.neutral[200],
  },
  kpiLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  kpiValueCpa: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  kpiValueSuccess: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    color: colors.success.dark,
  },
  kpiMaxScale: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[400],
    fontWeight: typography.weights.regular,
  },
  filterSection: {
    marginBottom: spacing.md,
  },
  filterHeaderTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  filterScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[0],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  filterPillActive: {
    backgroundColor: colors.primary[900],
    borderColor: colors.primary[900],
  },
  filterPillText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    color: colors.neutral[600],
  },
  filterPillTextActive: {
    color: colors.neutral[0],
    fontWeight: typography.weights.bold,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
  },
  sectionCountBadge: {
    fontSize: typography.sizes.caption,
    color: colors.neutral[500],
    backgroundColor: colors.neutral[200],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  gradeCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  courseCodeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  courseCodeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[700],
  },
  courseName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    lineHeight: 22,
  },
  courseSemesterInfo: {
    fontSize: typography.sizes.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  letterGradeBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterGradeText: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.extraBold,
  },
  statusPill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusPillPassed: {
    backgroundColor: '#DCFCE7',
  },
  statusPillFailed: {
    backgroundColor: '#FEE2E2',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  statusPillTextPassed: {
    color: '#15803D',
  },
  statusPillTextFailed: {
    color: '#B91C1C',
  },
  statusPillTextPending: {
    color: '#B45309',
  },
  scoresGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  scoreCol: {
    flex: 1,
    alignItems: 'center',
  },
  scoreColDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.neutral[200],
  },
  scoreColLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  scoreColValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[800],
  },
  totalScoreCol: {
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    paddingVertical: 2,
  },
  totalScoreColLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
    marginBottom: 2,
  },
  totalScoreColValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  pendingNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: 4,
  },
  pendingNoticeText: {
    fontSize: typography.sizes.xs,
    color: colors.warning.dark,
    flex: 1,
  },
});
