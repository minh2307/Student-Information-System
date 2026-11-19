/**
 * Student Examination Schedule Screen (TASK ST-03)
 * Native implementation for student exam schedules, countdown timers,
 * room and venue details, exam format visualization, and semester filtering.
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
import { useStudentExams } from '@/features/student';
import { ErrorView } from '@/components/common/ErrorView';
import { EmptyState } from '@/components/common/EmptyState';
import { ExamSchedule } from '@/features/student/types';

export default function ExamsScreen() {
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'UPCOMING' | 'ALL' | 'PAST'>('UPCOMING');

  const {
    data: exams,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useStudentExams(selectedSemester === 'ALL' ? undefined : selectedSemester);

  // Extract unique semesters
  const availableSemesters = useMemo(() => {
    if (!exams || exams.length === 0) return [];
    const set = new Set<string>();
    exams.forEach((ex) => {
      if (ex.semesterName && ex.semesterName.trim()) {
        set.add(ex.semesterName.trim());
      }
    });
    return Array.from(set);
  }, [exams]);

  // Parse date string (YYYY-MM-DD) to Date object safely
  const parseExamDate = (dateStr: string, timeStr?: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return new Date();
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      let hour = 0;
      let minute = 0;
      if (timeStr) {
        const timeParts = timeStr.split(':');
        if (timeParts.length >= 2) {
          hour = parseInt(timeParts[0], 10);
          minute = parseInt(timeParts[1], 10);
        }
      }
      return new Date(year, month, day, hour, minute);
    } catch {
      return new Date();
    }
  };

  // Calculate countdown status and days remaining
  const getExamTimingStatus = (examDateStr: string, startTimeStr?: string) => {
    const now = new Date();
    const examDate = parseExamDate(examDateStr, startTimeStr);

    // Normalize to date-only for day difference
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const examDay = new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate());
    const diffTime = examDay.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'PAST', label: 'Đã kết thúc', color: colors.neutral[500], bg: colors.neutral[100] };
    } else if (diffDays === 0) {
      return { status: 'TODAY', label: 'Hôm nay', color: colors.error.dark, bg: '#FEE2E2' };
    } else if (diffDays === 1) {
      return { status: 'TOMORROW', label: 'Ngày mai', color: '#B45309', bg: '#FEF3C7' };
    } else {
      return {
        status: 'UPCOMING',
        label: `Còn ${diffDays} ngày`,
        color: '#1D4ED8',
        bg: '#DBEAFE',
      };
    }
  };

  // Sort and filter exams
  const processedExams = useMemo(() => {
    if (!exams) return [];

    // Filter by semester
    let list = exams;
    if (selectedSemester !== 'ALL') {
      list = list.filter((ex) => ex.semesterName === selectedSemester);
    }

    // Sort chronologically (earliest to latest)
    const sorted = [...list].sort((a, b) => {
      const dateA = parseExamDate(a.examDate, a.startTime).getTime();
      const dateB = parseExamDate(b.examDate, b.startTime).getTime();
      return dateA - dateB;
    });

    // Filter by status tab
    if (statusFilter === 'UPCOMING') {
      return sorted.filter((ex) => {
        const timing = getExamTimingStatus(ex.examDate, ex.startTime);
        return timing.status !== 'PAST';
      });
    } else if (statusFilter === 'PAST') {
      return sorted.filter((ex) => {
        const timing = getExamTimingStatus(ex.examDate, ex.startTime);
        return timing.status === 'PAST';
      });
    }
    return sorted;
  }, [exams, selectedSemester, statusFilter]);

  // Find nearest upcoming exam
  const nearestExam = useMemo(() => {
    if (!exams) return null;
    const upcoming = exams
      .filter((ex) => getExamTimingStatus(ex.examDate, ex.startTime).status !== 'PAST')
      .sort((a, b) => {
        return (
          parseExamDate(a.examDate, a.startTime).getTime() -
          parseExamDate(b.examDate, b.startTime).getTime()
        );
      });
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [exams]);

  // Format date display (e.g. "Thứ Hai, 15/12/2026")
  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = parseExamDate(dateStr);
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = days[d.getDay()];
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${dayName}, ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Format time (HH:mm)
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '--:--';
    return timeStr.substring(0, 5);
  };

  if (isLoading && !exams) {
    return (
      <View style={styles.loadingContainer} testID="exams-loading">
        <ActivityIndicator size="large" color={colors.primary[900]} />
        <Text style={styles.loadingText}>Đang tải lịch thi học kỳ...</Text>
      </View>
    );
  }

  if (isError && !exams) {
    return (
      <View style={styles.container} testID="exams-error">
        <ErrorView
          title="Không thể tải lịch thi"
          message={error?.message || 'Lỗi kết nối máy chủ. Vui lòng thử lại.'}
          onRetry={refetch}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      testID="student-exams-screen"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            refetch();
          }}
          colors={[colors.primary[900]]}
        />
      }
    >
      {/* ── 1. Nearest Upcoming Exam Banner ── */}
      {nearestExam ? (
        <View style={styles.heroBanner} testID="exams-hero-banner">
          <View style={styles.heroBannerHeader}>
            <View style={styles.heroBadge}>
              <Ionicons name="time-outline" size={14} color={colors.neutral[0]} />
              <Text style={styles.heroBadgeText}>Môn thi sắp diễn ra</Text>
            </View>
            <View
              style={[
                styles.timingPill,
                {
                  backgroundColor: getExamTimingStatus(
                    nearestExam.examDate,
                    nearestExam.startTime
                  ).bg,
                },
              ]}
            >
              <Text
                style={[
                  styles.timingPillText,
                  {
                    color: getExamTimingStatus(
                      nearestExam.examDate,
                      nearestExam.startTime
                    ).color,
                  },
                ]}
              >
                {getExamTimingStatus(nearestExam.examDate, nearestExam.startTime).label}
              </Text>
            </View>
          </View>

          <Text style={styles.heroCourseName} numberOfLines={2}>
            {nearestExam.courseName}
          </Text>
          <Text style={styles.heroCourseCode}>
            Mã môn: {nearestExam.courseCode} • {nearestExam.sectionCode || 'Lớp HP'}
          </Text>

          <View style={styles.heroInfoRow}>
            <View style={styles.heroInfoItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.neutral[200]} />
              <Text style={styles.heroInfoText}>{formatDateDisplay(nearestExam.examDate)}</Text>
            </View>
            <View style={styles.heroInfoItem}>
              <Ionicons name="alarm-outline" size={16} color={colors.neutral[200]} />
              <Text style={styles.heroInfoText}>
                {formatTime(nearestExam.startTime)} - {formatTime(nearestExam.endTime)}
              </Text>
            </View>
            <View style={styles.heroInfoItem}>
              <Ionicons name="location-outline" size={16} color={colors.neutral[200]} />
              <Text style={styles.heroInfoText}>{nearestExam.roomName}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* ── 2. Status & Semester Filter Controls ── */}
      <View style={styles.controlsSection}>
        {/* Status Filter Tabs (Sắp thi, Tất cả, Đã thi) */}
        <View style={styles.statusTabsRow} testID="exams-status-tabs">
          <Pressable
            style={[
              styles.statusTab,
              statusFilter === 'UPCOMING' && styles.statusTabActive,
            ]}
            onPress={() => setStatusFilter('UPCOMING')}
            testID="exams-tab-upcoming"
          >
            <Text
              style={[
                styles.statusTabText,
                statusFilter === 'UPCOMING' && styles.statusTabTextActive,
              ]}
            >
              Sắp thi
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.statusTab,
              statusFilter === 'ALL' && styles.statusTabActive,
            ]}
            onPress={() => setStatusFilter('ALL')}
            testID="exams-tab-all"
          >
            <Text
              style={[
                styles.statusTabText,
                statusFilter === 'ALL' && styles.statusTabTextActive,
              ]}
            >
              Tất cả
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.statusTab,
              statusFilter === 'PAST' && styles.statusTabActive,
            ]}
            onPress={() => setStatusFilter('PAST')}
            testID="exams-tab-past"
          >
            <Text
              style={[
                styles.statusTabText,
                statusFilter === 'PAST' && styles.statusTabTextActive,
              ]}
            >
              Đã kết thúc
            </Text>
          </Pressable>
        </View>

        {/* Semester Filter Pills */}
        {availableSemesters.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.semesterScroll}
          >
            <Pressable
              style={[
                styles.semesterPill,
                selectedSemester === 'ALL' && styles.semesterPillActive,
              ]}
              onPress={() => setSelectedSemester('ALL')}
              testID="exams-semester-all"
            >
              <Text
                style={[
                  styles.semesterPillText,
                  selectedSemester === 'ALL' && styles.semesterPillTextActive,
                ]}
              >
                Tất cả học kỳ
              </Text>
            </Pressable>

            {availableSemesters.map((sem) => {
              const active = selectedSemester === sem;
              return (
                <Pressable
                  key={sem}
                  style={[styles.semesterPill, active && styles.semesterPillActive]}
                  onPress={() => setSelectedSemester(sem)}
                  testID={`exams-semester-${sem}`}
                >
                  <Text
                    style={[
                      styles.semesterPillText,
                      active && styles.semesterPillTextActive,
                    ]}
                  >
                    {sem}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── 3. Exam Schedule List ── */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.sectionTitle}>
          {statusFilter === 'UPCOMING'
            ? 'Lịch thi sắp tới'
            : statusFilter === 'PAST'
            ? 'Lịch thi đã qua'
            : 'Toàn bộ kỳ thi'}
        </Text>
        <Text style={styles.countBadge}>{processedExams.length} môn thi</Text>
      </View>

      {processedExams.length === 0 ? (
        <View testID="exams-empty">
          <EmptyState
            icon="calendar-outline"
            title="Không có lịch thi"
            message={
              statusFilter === 'UPCOMING'
                ? 'Bạn hiện không có kỳ thi nào sắp diễn ra.'
                : 'Chưa có dữ liệu kỳ thi cho điều kiện lọc này.'
            }
          />
        </View>
      ) : (
        processedExams.map((exam: ExamSchedule) => {
          const timing = getExamTimingStatus(exam.examDate, exam.startTime);

          return (
            <View
              key={exam.id || `${exam.courseCode}-${exam.examDate}`}
              style={styles.examCard}
              testID={`exam-card-${exam.courseCode}`}
            >
              {/* Card Top Row: Date & Countdown badge */}
              <View style={styles.cardTopRow}>
                <View style={styles.dateBadgeContainer}>
                  <Ionicons name="calendar" size={16} color={colors.primary[900]} />
                  <Text style={styles.dateBadgeText}>{formatDateDisplay(exam.examDate)}</Text>
                </View>

                <View style={[styles.timingPill, { backgroundColor: timing.bg }]}>
                  <Text style={[styles.timingPillText, { color: timing.color }]}>
                    {timing.label}
                  </Text>
                </View>
              </View>

              {/* Course Title & Section */}
              <View style={styles.courseHeader}>
                <View style={styles.courseCodePill}>
                  <Text style={styles.courseCodeText}>{exam.courseCode}</Text>
                </View>
                <Text style={styles.courseTitle} numberOfLines={2}>
                  {exam.courseName}
                </Text>
              </View>

              <Text style={styles.sectionSubtitle}>
                {exam.sectionCode || 'Lớp HP'} • {exam.credits || 3} tín chỉ •{' '}
                {exam.semesterName || 'Học kỳ'}
              </Text>

              {/* Exam Info Grid */}
              <View style={styles.infoGrid}>
                {/* Time */}
                <View style={styles.infoCol}>
                  <Text style={styles.infoColLabel}>Giờ thi</Text>
                  <View style={styles.infoValRow}>
                    <Ionicons name="time-outline" size={14} color={colors.neutral[600]} />
                    <Text style={styles.infoColVal}>
                      {formatTime(exam.startTime)} - {formatTime(exam.endTime)}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoColDivider} />

                {/* Room */}
                <View style={styles.infoCol}>
                  <Text style={styles.infoColLabel}>Phòng thi</Text>
                  <View style={styles.infoValRow}>
                    <Ionicons name="location-outline" size={14} color={colors.primary[900]} />
                    <Text style={[styles.infoColVal, styles.roomText]}>{exam.roomName}</Text>
                  </View>
                </View>

                <View style={styles.infoColDivider} />

                {/* Format / Type */}
                <View style={styles.infoCol}>
                  <Text style={styles.infoColLabel}>Hình thức</Text>
                  <View style={styles.infoValRow}>
                    <Ionicons name="document-text-outline" size={14} color={colors.neutral[600]} />
                    <Text style={styles.infoColVal} numberOfLines={1}>
                      {exam.examType || 'Tự luận'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Lecturer Supervisor */}
              {exam.lecturerName ? (
                <View style={styles.supervisorRow}>
                  <Ionicons name="person-outline" size={13} color={colors.neutral[500]} />
                  <Text style={styles.supervisorText}>Cán bộ coi thi: {exam.lecturerName}</Text>
                </View>
              ) : null}

              {/* Exam Notes */}
              {exam.notes ? (
                <View style={styles.notesRow}>
                  <Ionicons name="alert-circle-outline" size={14} color={colors.warning.dark} />
                  <Text style={styles.notesText}>{exam.notes}</Text>
                </View>
              ) : null}
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
  heroBanner: {
    backgroundColor: colors.primary[900],
    borderRadius: radius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  heroBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 4,
  },
  heroBadgeText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  heroCourseName: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.neutral[0],
    lineHeight: 28,
  },
  heroCourseCode: {
    fontSize: typography.sizes.caption,
    color: colors.primary[200],
    marginTop: 2,
    marginBottom: spacing.md,
  },
  heroInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroInfoText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  controlsSection: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statusTabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[200],
    borderRadius: radius.lg,
    padding: 3,
  },
  statusTab: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  statusTabActive: {
    backgroundColor: colors.neutral[0],
    ...shadows.sm,
  },
  statusTabText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    color: colors.neutral[600],
  },
  statusTabTextActive: {
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  semesterScroll: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  semesterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[0],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  semesterPillActive: {
    backgroundColor: colors.primary[900],
    borderColor: colors.primary[900],
  },
  semesterPillText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    color: colors.neutral[600],
  },
  semesterPillTextActive: {
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
  countBadge: {
    fontSize: typography.sizes.caption,
    color: colors.neutral[500],
    backgroundColor: colors.neutral[200],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  examCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateBadgeText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  timingPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  timingPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  courseCodePill: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  courseCodeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[700],
  },
  courseTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.caption,
    color: colors.neutral[500],
    marginBottom: spacing.md,
  },
  infoGrid: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[50],
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  infoCol: {
    flex: 1,
    alignItems: 'center',
  },
  infoColDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.neutral[200],
  },
  infoColLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  infoValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  infoColVal: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[800],
  },
  roomText: {
    color: colors.primary[900],
    fontWeight: typography.weights.bold,
  },
  supervisorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  supervisorText: {
    fontSize: typography.sizes.caption,
    color: colors.neutral[600],
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  notesText: {
    fontSize: typography.sizes.xs,
    color: colors.warning.dark,
    flex: 1,
  },
});
