/**
 * Lecturer Teaching Schedule Screen - REDS v2.0
 * Comprehensive schedule view with day selector, semester filter, and class details.
 * Refactored to utilize REDS v2.0 Tokens, Shared Components & WCAG AA Compliance.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLecturerClasses, LecturerClassSection } from '@/features/lecturer';
import { tokens } from '@/theme';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/feedback/AppBadge';
import { AppEmptyState } from '@/components/feedback/AppEmptyState';
import { AppErrorState } from '@/components/feedback/AppErrorState';
import { AppLoadingSkeleton } from '@/components/feedback/AppLoadingSkeleton';
import { formatDayOfWeek, formatTime } from '@/utils/formatters';

const DAYS = [
  { code: 'ALL', label: 'Tất cả' },
  { code: 'MON', label: 'Thứ 2' },
  { code: 'TUE', label: 'Thứ 3' },
  { code: 'WED', label: 'Thứ 4' },
  { code: 'THU', label: 'Thứ 5' },
  { code: 'FRI', label: 'Thứ 6' },
  { code: 'SAT', label: 'Thứ 7' },
  { code: 'SUN', label: 'CN' },
];

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Deterministically maps a course code to one of the 5 REDS v2.0 Academic Palettes
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

export default function LecturerScheduleScreen() {
  const router = useRouter();

  // Determine today's day of week
  const todayDayCode = DAY_CODES[new Date().getDay()];
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<LecturerClassSection | null>(null);

  const {
    data: classes = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useLecturerClasses();

  // Filter classes by selected day
  const filteredClasses = useMemo(() => {
    if (selectedDay === 'ALL') {
      return [...classes].sort((a, b) => {
        const dayA = a.dayOfWeek || '';
        const dayB = b.dayOfWeek || '';
        if (dayA === dayB) {
          return (a.startTime || '').localeCompare(b.startTime || '');
        }
        return dayA.localeCompare(dayB);
      });
    }
    return classes.filter(
      (c) => c.dayOfWeek?.toUpperCase() === selectedDay.toUpperCase()
    );
  }, [classes, selectedDay]);

  return (
    <View style={styles.container}>
      {/* Day Selector Bar (Touch Target >= 48dp, Accessible Ripple) */}
      <View style={styles.daySelectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daySelectorScroll}
        >
          {DAYS.map((day) => {
            const isSelected = selectedDay === day.code;
            const isToday = day.code === todayDayCode;

            return (
              <Pressable
                key={day.code}
                style={({ pressed }) => [
                  styles.dayButton,
                  isSelected ? styles.dayButtonSelected : styles.dayButtonInactive,
                  pressed && styles.dayButtonPressed,
                ]}
                onPress={() => setSelectedDay(day.code)}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                android_ripple={{
                  color: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(153, 27, 27, 0.12)',
                  borderless: false,
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Xem lịch ${day.label}`}
                testID={`lecturer-day-${day.code}`}
              >
                <AppText
                  variant="captionBold"
                  style={[
                    styles.dayButtonText,
                    isSelected
                      ? styles.dayButtonTextSelected
                      : isToday
                      ? styles.todayText
                      : styles.dayButtonTextInactive,
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

      {/* Schedule Content List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
            }}
            tintColor={tokens.brand.burgundy}
            colors={[tokens.brand.burgundy]}
          />
        }
      >
        <View style={styles.headerInfo}>
          <AppText variant="caption" color="secondary" style={styles.summaryText}>
            Hiển thị {filteredClasses.length} buổi giảng dạy{' '}
            {selectedDay === 'ALL'
              ? 'trong tuần'
              : `vào ${DAYS.find((d) => d.code === selectedDay)?.label}`}
          </AppText>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={tokens.brand.burgundy} />
            <AppText variant="caption" color="muted" style={styles.loadingText}>
              Đang tải lịch giảng dạy...
            </AppText>
            <View style={styles.skeletonGroup}>
              <AppLoadingSkeleton variant="card" height={110} style={styles.skeletonItem} />
              <AppLoadingSkeleton variant="card" height={110} style={styles.skeletonItem} />
            </View>
          </View>
        ) : isError ? (
          <AppErrorState
            title="Không thể tải thời khóa biểu"
            message={error?.message || 'Lỗi kết nối đến máy chủ API.'}
            onRetry={() => refetch()}
            retryLabel="Tải lại"
          />
        ) : filteredClasses.length === 0 ? (
          <AppEmptyState
            icon="calendar-outline"
            title="Không có lịch giảng dạy"
            message={
              selectedDay === 'ALL'
                ? 'Thầy/Cô hiện không có buổi dạy nào trong hệ thống.'
                : `Thầy/Cô không có ca dạy nào vào ${
                    DAYS.find((d) => d.code === selectedDay)?.label
                  }.`
            }
          />
        ) : (
          filteredClasses.map((item) => {
            const palette = getAcademicPaletteForCourse(item.courseCode || 'CS');
            return (
              <AppCard
                key={item.sectionId}
                variant="elevated"
                style={[
                  styles.classCard,
                  { borderLeftColor: palette.text, borderLeftWidth: 4 },
                ]}
                onPress={() => setSelectedClass(item)}
                accessibilityLabel={`Chi tiết lớp ${item.sectionCode}`}
                testID={`lecturer-class-${item.sectionId}`}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.codeBadge, { backgroundColor: palette.badge }]}>
                    <AppText
                      variant="captionBold"
                      style={[styles.codeText, { color: palette.text }]}
                    >
                      {item.sectionCode}
                    </AppText>
                  </View>
                  <AppBadge
                    label={item.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                    variant={item.status === 'OPEN' ? 'success' : 'warning'}
                    size="sm"
                  />
                </View>

                <AppText variant="bodyBold" color="primary" numberOfLines={2} style={styles.courseName}>
                  {item.courseName}
                </AppText>
                <AppText variant="caption" color="secondary" style={styles.courseCode}>
                  Mã môn: {item.courseCode} | {item.credits} tín chỉ | Kỳ:{' '}
                  {item.semesterName}
                </AppText>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                  <View style={styles.metaCol}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={15} color={palette.text} />
                      <AppText variant="caption" color="secondary" style={styles.metaText}>
                        {formatDayOfWeek(item.dayOfWeek)}
                      </AppText>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={15} color={palette.text} />
                      <AppText variant="caption" color="secondary" style={styles.metaText}>
                        {formatTime(item.startTime)} - {formatTime(item.endTime)}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.metaCol}>
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={15} color={tokens.text.muted} />
                      <AppText variant="caption" color="secondary" style={styles.metaText}>
                        Phòng: {item.roomName}
                      </AppText>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="people-outline" size={15} color={tokens.text.muted} />
                      <AppText variant="caption" color="secondary" style={styles.metaText}>
                        Sĩ số: {item.currentEnrolled}/{item.maxCapacity} SV
                      </AppText>
                    </View>
                  </View>
                </View>
              </AppCard>
            );
          })
        )}
      </ScrollView>

      {/* Class Detail Modal */}
      {selectedClass && (
        <Modal
          visible={!!selectedClass}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedClass(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <AppText variant="h3" color="primary" style={styles.modalTitle}>
                  Chi tiết lớp học phần
                </AppText>
                <Pressable
                  onPress={() => setSelectedClass(null)}
                  style={styles.closeBtn}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng"
                >
                  <Ionicons name="close" size={22} color={tokens.text.primary} />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.modalBadgeRow}>
                  <View style={styles.modalCodeBadge}>
                    <AppText variant="captionBold" style={styles.modalCodeText}>
                      {selectedClass.sectionCode}
                    </AppText>
                  </View>
                  <AppBadge
                    label={`${selectedClass.credits} tín chỉ`}
                    variant="neutral"
                    size="sm"
                  />
                </View>

                <AppText variant="bodyBold" color="primary" style={styles.modalCourseName}>
                  {selectedClass.courseName}
                </AppText>
                <AppText variant="caption" color="secondary" style={styles.modalCourseCode}>
                  Mã môn học: {selectedClass.courseCode}
                </AppText>

                <View style={styles.modalInfoGrid}>
                  <View style={styles.modalInfoItem}>
                    <AppText variant="caption" color="muted" style={styles.modalInfoLabel}>
                      Thứ trong tuần
                    </AppText>
                    <AppText variant="bodyBold" color="primary" style={styles.modalInfoVal}>
                      {formatDayOfWeek(selectedClass.dayOfWeek)}
                    </AppText>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <AppText variant="caption" color="muted" style={styles.modalInfoLabel}>
                      Thời gian học
                    </AppText>
                    <AppText variant="bodyBold" color="primary" style={styles.modalInfoVal}>
                      {formatTime(selectedClass.startTime)} - {formatTime(selectedClass.endTime)}
                    </AppText>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <AppText variant="caption" color="muted" style={styles.modalInfoLabel}>
                      Phòng giảng dạy
                    </AppText>
                    <AppText variant="bodyBold" color="primary" style={styles.modalInfoVal}>
                      {selectedClass.roomName}
                    </AppText>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <AppText variant="caption" color="muted" style={styles.modalInfoLabel}>
                      Sĩ số lớp
                    </AppText>
                    <AppText variant="bodyBold" color="primary" style={styles.modalInfoVal}>
                      {selectedClass.currentEnrolled} / {selectedClass.maxCapacity} sinh viên
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalActionSecondary}
                  onPress={() => {
                    setSelectedClass(null);
                    router.push('/(lecturer)/classes');
                  }}
                  accessibilityRole="button"
                >
                  <AppText variant="captionBold" style={styles.actionSecText}>
                    Quản lý lớp & Điểm
                  </AppText>
                </Pressable>

                <Pressable
                  style={styles.modalActionPrimary}
                  onPress={() => {
                    setSelectedClass(null);
                    router.push('/(lecturer)/attendance');
                  }}
                  accessibilityRole="button"
                >
                  <AppText variant="captionBold" style={styles.actionPriText}>
                    Mở điểm danh QR
                  </AppText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.surface.canvas,
  },
  daySelectorContainer: {
    backgroundColor: tokens.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.default,
    paddingVertical: tokens.spacing.xs,
  },
  daySelectorScroll: {
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.xs,
    alignItems: 'center',
  },
  dayButton: {
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // Touch target >= 48dp
    minWidth: 54,
  },
  dayButtonSelected: {
    backgroundColor: tokens.brand.burgundy,
    borderWidth: 1,
    borderColor: tokens.brand.burgundy,
  },
  dayButtonInactive: {
    backgroundColor: tokens.surface.canvas,
    borderWidth: 1,
    borderColor: tokens.border.default,
  },
  dayButtonPressed: {
    opacity: 0.85,
  },
  dayButtonText: {
    fontSize: 12,
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: tokens.typography.weights.bold,
  },
  dayButtonTextInactive: {
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
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xxxl,
    paddingTop: tokens.spacing.sm,
  },
  headerInfo: {
    marginBottom: tokens.spacing.sm,
  },
  summaryText: {
    fontSize: 12,
  },
  centerContainer: {
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
    padding: tokens.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  codeText: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  courseName: {
    marginTop: 2,
  },
  courseCode: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: tokens.border.default,
    marginVertical: tokens.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: tokens.surface.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    ...tokens.elevation.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.default,
    paddingBottom: tokens.spacing.xs,
  },
  modalTitle: {
    fontSize: 16,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    marginBottom: tokens.spacing.lg,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.xs,
  },
  modalCodeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  modalCodeText: {
    color: '#1D4ED8',
    fontSize: 11,
  },
  modalCourseName: {
    fontSize: 15,
    marginTop: tokens.spacing.xs,
  },
  modalCourseCode: {
    marginTop: 2,
  },
  modalInfoGrid: {
    marginTop: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  modalInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.subtle,
    paddingBottom: 4,
  },
  modalInfoLabel: {
    fontSize: 12,
  },
  modalInfoVal: {
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  modalActionSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // Touch target >= 48dp
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.default,
    backgroundColor: tokens.surface.canvas,
  },
  actionSecText: {
    color: tokens.text.primary,
  },
  modalActionPrimary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // Touch target >= 48dp
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.brand.burgundy,
  },
  actionPriText: {
    color: '#FFFFFF',
  },
});
