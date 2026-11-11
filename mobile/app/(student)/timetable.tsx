/**
 * Student Timetable Screen
 * Live integration with GET /api/v1/student/timetable via TanStack Query.
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
import { useStudentTimetable } from '@/features/student';
import { ErrorView } from '@/components/common/ErrorView';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDayOfWeek, formatTime } from '@/utils/formatters';

interface DayOption {
  key: string;
  label: string;
  code: string;
}

const WEEKDAYS: DayOption[] = [
  { key: 'ALL', label: 'Tất cả', code: 'ALL' },
  { key: 'MON', label: 'Thứ 2', code: 'MON' },
  { key: 'TUE', label: 'Thứ 3', code: 'TUE' },
  { key: 'WED', label: 'Thứ 4', code: 'WED' },
  { key: 'THU', label: 'Thứ 5', code: 'THU' },
  { key: 'FRI', label: 'Thứ 6', code: 'FRI' },
  { key: 'SAT', label: 'Thứ 7', code: 'SAT' },
  { key: 'SUN', label: 'CN', code: 'SUN' },
];

export default function TimetableScreen() {
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const { data: timetable = [], isLoading, isError, error, refetch, isRefetching } = useStudentTimetable();

  // Filter classes according to selected day
  const filteredClasses = useMemo(() => {
    if (selectedDay === 'ALL') {
      return timetable;
    }
    return timetable.filter((item) => {
      const day = item.dayOfWeek?.trim().toUpperCase();
      return day === selectedDay;
    });
  }, [timetable, selectedDay]);

  // Determine current day for badge highlighting
  const currentDayKey = useMemo(() => {
    const dayIdx = new Date().getDay(); // 0 is Sunday, 1 is Monday...
    const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return map[dayIdx] || 'MON';
  }, []);

  return (
    <View style={styles.container}>
      {/* Weekday Selector Bar */}
      <View style={styles.selectorWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysBar}
        >
          {WEEKDAYS.map((day) => {
            const isSelected = selectedDay === day.code;
            const isToday = currentDayKey === day.code;

            return (
              <Pressable
                key={day.key}
                onPress={() => setSelectedDay(day.code)}
                style={({ pressed }) => [
                  styles.dayItem,
                  isSelected && styles.dayItemActive,
                  pressed && styles.dayItemPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Xem lịch ${day.label}`}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextActive,
                    isToday && !isSelected && styles.todayText,
                  ]}
                >
                  {day.label}
                </Text>
                {isToday && <View style={[styles.todayDot, isSelected && styles.todayDotActive]} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      <ScrollView
        style={styles.scrollArea}
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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[800]} />
            <Text style={styles.loadingText}>Đang tải thời khóa biểu...</Text>
          </View>
        ) : isError ? (
          <ErrorView
            title="Lỗi tải thời khóa biểu"
            message={error?.message || 'Không thể lấy dữ liệu lịch học.'}
            onRetry={refetch}
          />
        ) : filteredClasses.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Không có lịch học"
            message={
              selectedDay === 'ALL'
                ? 'Bạn chưa có môn học nào được xếp lịch trong học kỳ này.'
                : `Không có ca học nào trong ngày ${WEEKDAYS.find((d) => d.code === selectedDay)?.label}.`
            }
          />
        ) : (
          filteredClasses.map((item) => (
            <View key={item.id} style={styles.classCard}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeStart}>{formatTime(item.startTime)}</Text>
                <Text style={styles.timeEnd}>{formatTime(item.endTime)}</Text>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>{formatDayOfWeek(item.dayOfWeek)}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailsColumn}>
                <View style={styles.headerRow}>
                  <Text style={styles.courseCode}>{item.courseCode}</Text>
                  {item.credits ? (
                    <Text style={styles.creditsBadge}>{item.credits} Tín chỉ</Text>
                  ) : null}
                  {item.status ? (
                    <View
                      style={[
                        styles.statusPill,
                        item.status === 'REGISTERED' ? styles.statusSuccess : styles.statusWarning,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          item.status === 'REGISTERED'
                            ? styles.statusSuccessText
                            : styles.statusWarningText,
                        ]}
                      >
                        {item.status === 'REGISTERED' ? 'Đã duyệt' : item.status}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.courseName}>{item.courseName}</Text>

                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={14} color={colors.neutral[600]} />
                  <Text style={styles.infoText}>{item.roomName || 'Chưa xếp phòng'}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={14} color={colors.neutral[600]} />
                  <Text style={styles.infoText}>{item.lecturerName || 'Chưa phân công giảng viên'}</Text>
                </View>

                {item.sectionCode ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="barcode-outline" size={14} color={colors.neutral[500]} />
                    <Text style={styles.sectionText}>Lớp: {item.sectionCode}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  selectorWrapper: {
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    paddingVertical: spacing.xs,
  },
  daysBar: {
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.xs,
    alignItems: 'center',
  },
  dayItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  dayItemActive: {
    backgroundColor: colors.primary[800],
  },
  dayItemPressed: {
    opacity: 0.8,
  },
  dayText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    fontWeight: typography.weights.medium,
  },
  dayTextActive: {
    color: colors.neutral[0],
    fontWeight: typography.weights.bold,
  },
  todayText: {
    color: colors.primary[700],
    fontWeight: typography.weights.bold,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary[600],
    marginTop: 2,
  },
  todayDotActive: {
    backgroundColor: colors.neutral[0],
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.sm,
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
  classCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  timeColumn: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeStart: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  timeEnd: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  dayBadge: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: 6,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
  },
  divider: {
    width: 1,
    height: 60,
    backgroundColor: colors.neutral[200],
    marginHorizontal: spacing.md,
  },
  detailsColumn: {
    flex: 1,
  },
  headerRow: {
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
  creditsBadge: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  statusSuccess: {
    backgroundColor: colors.success.light,
  },
  statusSuccessText: {
    color: colors.success.dark,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  statusWarning: {
    backgroundColor: colors.warning.light,
  },
  statusWarningText: {
    color: colors.warning.dark,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  courseName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginVertical: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  infoText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    flex: 1,
  },
  sectionText: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
  },
});
