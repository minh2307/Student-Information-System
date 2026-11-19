/**
 * Student Timetable Screen - REDS v2.0
 * Live integration with GET /api/v1/student/timetable via TanStack Query.
 * Refactored with REDS v2.0 Tokens, 5 Academic Palettes, Touch Targets >= 48dp, and WCAG AA Compliance.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';
import { useRouter } from 'expo-router';
import {
  useStudentTimetable,
  StudentAttendanceHistoryModal,
  StudentQrScannerModal,
} from '@/features/student';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/feedback/AppBadge';
import { AppEmptyState } from '@/components/feedback/AppEmptyState';
import { AppErrorState } from '@/components/feedback/AppErrorState';
import { AppLoadingSkeleton } from '@/components/feedback/AppLoadingSkeleton';
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

/**
 * Deterministically maps a course code to one of the 5 REDS v2.0 Academic Palettes
 * (Blue Sapphire, Emerald Green, Amber Gold, Purple Amethyst, Rose Ruby)
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

export default function TimetableScreen() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [isQrScannerVisible, setIsQrScannerVisible] = useState(false);
  const {
    data: timetable = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useStudentTimetable();

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
      {/* Top Action Header with Attendance History Link & Check-In */}
      <View style={styles.topActionBar}>
        <AppText variant="captionBold" color="secondary">
          HỌC KỲ HIỆN TẠI
        </AppText>
        <View style={styles.topActionButtonsGroup}>
          <Pressable
            onPress={() => setIsQrScannerVisible(true)}
            style={({ pressed }) => [styles.checkInTopButton, pressed && styles.historyButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Quét mã QR điểm danh"
            testID="timetable-checkin-button"
          >
            <Ionicons name="qr-code-outline" size={16} color="#FFFFFF" />
            <AppText variant="captionBold" style={styles.checkInTopButtonText}>
              Quét điểm danh
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setIsHistoryModalVisible(true)}
            style={({ pressed }) => [styles.historyButton, pressed && styles.historyButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Xem lịch sử điểm danh"
            testID="timetable-history-button"
          >
            <Ionicons name="time-outline" size={16} color={tokens.brand.burgundy} />
            <AppText variant="captionBold" style={styles.historyButtonText}>
              Lịch sử
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(student)/calendar-sync' as any)}
            style={({ pressed }) => [styles.historyButton, pressed && styles.historyButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Đồng bộ lịch học"
            testID="timetable-calendar-sync-button"
          >
            <Ionicons name="sync-outline" size={16} color={tokens.brand.burgundy} />
            <AppText variant="captionBold" style={styles.historyButtonText}>
              Đồng bộ
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Weekday Selector Bar (Touch Target >= 48dp, Accessible Ripple) */}
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
                  isSelected ? styles.dayItemActive : styles.dayItemInactive,
                  pressed && styles.dayItemPressed,
                ]}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                android_ripple={{
                  color: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(153, 27, 27, 0.12)',
                  borderless: false,
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Xem lịch ${day.label}`}
                testID={`day-selector-${day.code}`}
              >
                <AppText
                  variant="captionBold"
                  style={[
                    styles.dayText,
                    isSelected
                      ? styles.dayTextActive
                      : isToday
                      ? styles.todayText
                      : styles.dayTextInactive,
                  ]}
                >
                  {day.label}
                </AppText>
                {isToday ? (
                  <View
                    style={[
                      styles.todayDot,
                      isSelected ? styles.todayDotActive : styles.todayDotInactive,
                    ]}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Timetable List */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
            }}
            colors={[tokens.brand.burgundy]}
            tintColor={tokens.brand.burgundy}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={tokens.brand.burgundy} />
            <AppText variant="caption" color="muted" style={styles.loadingText}>
              Đang tải thời khóa biểu...
            </AppText>
            <View style={styles.skeletonGroup}>
              <AppLoadingSkeleton variant="card" height={100} style={styles.skeletonItem} />
              <AppLoadingSkeleton variant="card" height={100} style={styles.skeletonItem} />
            </View>
          </View>
        ) : isError ? (
          <AppErrorState
            title="Lỗi tải thời khóa biểu"
            message={error?.message || 'Không thể lấy dữ liệu lịch học.'}
            onRetry={refetch}
            retryLabel="Thử lại"
          />
        ) : filteredClasses.length === 0 ? (
          <AppEmptyState
            icon="calendar-outline"
            title="Không có lịch học"
            message={
              selectedDay === 'ALL'
                ? 'Bạn chưa có môn học nào được xếp lịch trong học kỳ này.'
                : `Không có ca học nào trong ngày ${WEEKDAYS.find((d) => d.code === selectedDay)?.label}.`
            }
          />
        ) : (
          filteredClasses.map((item) => {
            const palette = getAcademicPaletteForCourse(item.courseCode || 'CS');
            return (
              <AppCard
                key={item.id}
                variant="elevated"
                style={[
                  styles.classCard,
                  { borderLeftColor: palette.text, borderLeftWidth: 4 },
                ]}
                testID={`timetable-class-${item.id}`}
              >
                {/* Time & Day Column */}
                <View style={styles.timeColumn}>
                  <AppText variant="bodyBold" color="primary" style={styles.timeStart}>
                    {formatTime(item.startTime)}
                  </AppText>
                  <AppText variant="caption" color="muted" style={styles.timeEnd}>
                    {formatTime(item.endTime)}
                  </AppText>
                  <View style={[styles.dayBadge, { backgroundColor: palette.badge }]}>
                    <AppText
                      variant="captionBold"
                      style={[styles.dayBadgeText, { color: palette.text }]}
                    >
                      {formatDayOfWeek(item.dayOfWeek)}
                    </AppText>
                  </View>
                </View>

                {/* Vertical Divider */}
                <View style={styles.divider} />

                {/* Class Details Column */}
                <View style={styles.detailsColumn}>
                  <View style={styles.headerRow}>
                    <View style={[styles.codeBadge, { backgroundColor: palette.badge }]}>
                      <AppText
                        variant="captionBold"
                        style={[styles.courseCode, { color: palette.text }]}
                      >
                        {item.courseCode}
                      </AppText>
                    </View>

                    {item.credits ? (
                      <View style={styles.creditsBadge}>
                        <AppText variant="caption" color="secondary" style={styles.creditsText}>
                          {item.credits} Tín chỉ
                        </AppText>
                      </View>
                    ) : null}

                    {item.status ? (
                      <AppBadge
                        label={item.status === 'REGISTERED' ? 'Đã duyệt' : item.status}
                        variant={item.status === 'REGISTERED' ? 'success' : 'warning'}
                        size="sm"
                      />
                    ) : null}
                  </View>

                  <AppText
                    variant="bodyBold"
                    color="primary"
                    numberOfLines={2}
                    style={styles.courseName}
                  >
                    {item.courseName}
                  </AppText>

                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={14} color={tokens.text.secondary} />
                    <AppText variant="caption" color="secondary" numberOfLines={1} style={styles.infoText}>
                      {item.roomName || 'Chưa xếp phòng'}
                    </AppText>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={14} color={tokens.text.secondary} />
                    <AppText variant="caption" color="secondary" numberOfLines={1} style={styles.infoText}>
                      {item.lecturerName || 'Chưa phân công giảng viên'}
                    </AppText>
                  </View>

                  {item.sectionCode ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="barcode-outline" size={14} color={tokens.text.muted} />
                      <AppText variant="caption" color="muted" numberOfLines={1} style={styles.sectionText}>
                        Lớp: {item.sectionCode}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </AppCard>
            );
          })
        )}
      </ScrollView>

      {/* Student Attendance History Modal */}
      <StudentAttendanceHistoryModal
        visible={isHistoryModalVisible}
        onClose={() => setIsHistoryModalVisible(false)}
      />

      {/* Student QR Attendance Scanner Modal */}
      <StudentQrScannerModal
        visible={isQrScannerVisible}
        onClose={() => setIsQrScannerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.surface.canvas,
  },
  topActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.xs,
    backgroundColor: tokens.surface.card,
  },
  topActionButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  checkInTopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    backgroundColor: tokens.brand.burgundy,
    borderRadius: tokens.radius.full,
    minHeight: 48,
  },
  checkInTopButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    backgroundColor: tokens.brand.crimsonLight,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.brand.burgundy,
    minHeight: 48,
  },
  historyButtonPressed: {
    opacity: 0.7,
  },
  historyButtonText: {
    color: tokens.brand.burgundy,
    fontSize: 12,
  },
  selectorWrapper: {
    backgroundColor: tokens.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.default,
    paddingVertical: tokens.spacing.xs,
  },
  daysBar: {
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.xs,
    alignItems: 'center',
  },
  dayItem: {
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // Guaranteed >= 48dp Android Touch Target
    minWidth: 54,
  },
  dayItemActive: {
    backgroundColor: tokens.brand.burgundy,
    borderWidth: 1,
    borderColor: tokens.brand.burgundy,
  },
  dayItemInactive: {
    backgroundColor: tokens.surface.canvas,
    borderWidth: 1,
    borderColor: tokens.border.default,
  },
  dayItemPressed: {
    opacity: 0.85,
  },
  dayText: {
    fontSize: 12,
  },
  dayTextActive: {
    color: '#FFFFFF',
    fontWeight: tokens.typography.weights.bold,
  },
  dayTextInactive: {
    color: tokens.text.primary,
  },
  todayText: {
    color: tokens.brand.crimson,
    fontWeight: tokens.typography.weights.bold,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  todayDotActive: {
    backgroundColor: '#FFFFFF',
  },
  todayDotInactive: {
    backgroundColor: tokens.brand.crimson,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xxxl,
    paddingTop: tokens.spacing.sm,
  },
  loadingContainer: {
    paddingVertical: tokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: tokens.spacing.sm,
  },
  skeletonGroup: {
    width: '100%',
    marginTop: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  skeletonItem: {
    width: '100%',
  },
  classCard: {
    marginBottom: tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.md,
  },
  timeColumn: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeStart: {
    fontSize: 14,
  },
  timeEnd: {
    fontSize: 11,
    marginTop: 2,
  },
  dayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
    marginTop: 6,
  },
  dayBadgeText: {
    fontSize: 10,
  },
  divider: {
    width: 1,
    height: 60,
    backgroundColor: tokens.border.default,
    marginHorizontal: tokens.spacing.md,
  },
  detailsColumn: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
    marginBottom: 2,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: tokens.radius.sm,
  },
  courseCode: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  creditsBadge: {
    backgroundColor: tokens.surface.canvas,
    borderWidth: 1,
    borderColor: tokens.border.default,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: tokens.radius.sm,
  },
  creditsText: {
    fontSize: 10,
  },
  courseName: {
    marginVertical: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
  },
  sectionText: {
    fontSize: 11,
  },
});
