/**
 * Student Examination Schedule Screen
 * Live integration with GET /api/v1/student/exams via TanStack Query.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { useStudentExams } from '@/features/student';
import { ErrorView } from '@/components/common/ErrorView';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDate, formatTime } from '@/utils/formatters';

export default function ExamsScreen() {
  const { data: exams = [], isLoading, isError, error, refetch, isRefetching } = useStudentExams();

  // Sort exams chronologically by examDate and startTime
  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => {
      const dateCmp = (a.examDate || '').localeCompare(b.examDate || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
  }, [exams]);

  // Today for comparing upcoming vs passed
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

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
      {/* Header Overview Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{exams.length}</Text>
          <Text style={styles.summaryLabel}>Môn thi đã xếp lịch</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {exams.filter((e) => (e.examDate || '') >= todayStr).length}
          </Text>
          <Text style={styles.summaryLabel}>Môn sắp tới</Text>
        </View>
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[800]} />
          <Text style={styles.loadingText}>Đang tra cứu lịch thi...</Text>
        </View>
      ) : isError ? (
        <ErrorView
          title="Lỗi tải lịch thi"
          message={error?.message || 'Không thể tra cứu lịch thi cá nhân.'}
          onRetry={refetch}
        />
      ) : sortedExams.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="Chưa có lịch thi"
          message="Hội đồng khảo thí chưa công bố lịch thi cho các học phần đã đăng ký."
        />
      ) : (
        sortedExams.map((exam) => {
          const isUpcoming = (exam.examDate || '') >= todayStr;

          return (
            <View key={exam.id} style={styles.examCard}>
              {/* Top row: Course Code & Exam Type badge */}
              <View style={styles.cardHeader}>
                <View style={styles.codeGroup}>
                  <Text style={styles.courseCode}>{exam.courseCode}</Text>
                  {exam.credits ? (
                    <Text style={styles.creditsTag}>{exam.credits} Tín chỉ</Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.typeBadge,
                    exam.examType?.includes('MÁY')
                      ? styles.typeMachine
                      : styles.typeWritten,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      exam.examType?.includes('MÁY')
                        ? styles.typeMachineText
                        : styles.typeWrittenText,
                    ]}
                  >
                    {exam.examType || 'TỰ LUẬN'}
                  </Text>
                </View>
              </View>

              {/* Course Name */}
              <Text style={styles.courseName}>{exam.courseName}</Text>

              {/* Schedule Details Row */}
              <View style={styles.detailsBox}>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={15} color={colors.primary[800]} />
                  <Text style={styles.detailText}>{formatDate(exam.examDate)}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={15} color={colors.primary[800]} />
                  <Text style={styles.detailText}>
                    {formatTime(exam.startTime)} - {formatTime(exam.endTime)}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={15} color={colors.primary[800]} />
                  <Text style={styles.detailText}>{exam.roomName || 'Chưa xếp phòng'}</Text>
                </View>
              </View>

              {/* Lecturer & Notes */}
              {exam.lecturerName ? (
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={13} color={colors.neutral[500]} />
                  <Text style={styles.subText}>Cán bộ coi thi: {exam.lecturerName}</Text>
                </View>
              ) : null}

              {exam.notes ? (
                <View style={styles.notesRow}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.neutral[500]} />
                  <Text style={styles.notesText}>{exam.notes}</Text>
                </View>
              ) : null}

              {/* Status footer pill */}
              <View style={styles.cardFooter}>
                <View
                  style={[
                    styles.statusPill,
                    isUpcoming ? styles.statusUpcoming : styles.statusPast,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isUpcoming ? styles.statusUpcomingText : styles.statusPastText,
                    ]}
                  >
                    {isUpcoming ? 'Sắp diễn ra' : 'Đã kết thúc'}
                  </Text>
                </View>
                {exam.sectionCode ? (
                  <Text style={styles.sectionCode}>Lớp: {exam.sectionCode}</Text>
                ) : null}
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
  summaryNumber: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
  },
  summaryLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.neutral[200],
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
  examCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  codeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  courseCode: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[700],
    textTransform: 'uppercase',
  },
  creditsTag: {
    fontSize: 10,
    color: colors.neutral[500],
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  typeWritten: {
    backgroundColor: '#EEF2FF',
  },
  typeWrittenText: {
    color: '#4338CA',
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  typeMachine: {
    backgroundColor: '#ECFDF5',
  },
  typeMachineText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  courseName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  detailsBox: {
    backgroundColor: colors.neutral[50],
    borderRadius: radius.lg,
    padding: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[800],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  subText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 4,
    backgroundColor: colors.neutral[50],
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  notesText: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[600],
    flex: 1,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  statusUpcoming: {
    backgroundColor: colors.success.light,
  },
  statusUpcomingText: {
    color: colors.success.dark,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  statusPast: {
    backgroundColor: colors.neutral[100],
  },
  statusPastText: {
    color: colors.neutral[500],
    fontSize: 10,
    fontWeight: typography.weights.medium,
  },
  sectionCode: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[400],
  },
});
