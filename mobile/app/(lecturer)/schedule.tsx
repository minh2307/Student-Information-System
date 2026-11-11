/**
 * Lecturer Teaching Schedule Screen
 * Comprehensive schedule view with day selector, semester filter, and class details.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLecturerClasses, LecturerClassSection } from '@/features/lecturer';
import { colors, spacing, typography, radius } from '@/theme';
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
      {/* Day Selector Bar */}
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
              <TouchableOpacity
                key={day.code}
                style={[
                  styles.dayButton,
                  isSelected && styles.dayButtonSelected,
                  isToday && !isSelected && styles.dayButtonToday,
                ]}
                onPress={() => setSelectedDay(day.code)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    isSelected && styles.dayButtonTextSelected,
                    isToday && !isSelected && styles.dayButtonTextToday,
                  ]}
                >
                  {day.label}
                </Text>
                {isToday && <View style={styles.todayDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Schedule Content List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
            }}
            tintColor={colors.primary[800]}
            colors={[colors.primary[800]]}
          />
        }
      >
        <View style={styles.headerInfo}>
          <Text style={styles.summaryText}>
            Hiển thị {filteredClasses.length} buổi giảng dạy{' '}
            {selectedDay === 'ALL'
              ? 'trong tuần'
              : `vào ${DAYS.find((d) => d.code === selectedDay)?.label}`}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary[800]} />
            <Text style={styles.loadingText}>Đang tải lịch giảng dạy...</Text>
          </View>
        ) : isError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={36} color={colors.error.main} />
            <Text style={styles.errorTitle}>Không thể tải thời khóa biểu</Text>
            <Text style={styles.errorSubtitle}>
              {error?.message || 'Lỗi kết nối đến máy chủ API.'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => refetch()}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Tải lại</Text>
            </TouchableOpacity>
          </View>
        ) : filteredClasses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.neutral[400]} />
            <Text style={styles.emptyTitle}>Không có lịch giảng dạy</Text>
            <Text style={styles.emptySubtitle}>
              {selectedDay === 'ALL'
                ? 'Thầy/Cô hiện không có buổi dạy nào trong hệ thống.'
                : `Thầy/Cô không có ca dạy nào vào ${
                    DAYS.find((d) => d.code === selectedDay)?.label
                  }.`}
            </Text>
          </View>
        ) : (
          filteredClasses.map((item) => (
            <TouchableOpacity
              key={item.sectionId}
              style={styles.classCard}
              onPress={() => setSelectedClass(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{item.sectionCode}</Text>
                </View>
                <View
                  style={[
                    styles.statusTag,
                    item.status === 'OPEN'
                      ? styles.statusTagOpen
                      : styles.statusTagClosed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusTagText,
                      item.status === 'OPEN'
                        ? styles.statusTagTextOpen
                        : styles.statusTagTextClosed,
                    ]}
                  >
                    {item.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                  </Text>
                </View>
              </View>

              <Text style={styles.courseName}>{item.courseName}</Text>
              <Text style={styles.courseCode}>
                Mã môn: {item.courseCode} | {item.credits} tín chỉ | Kỳ:{' '}
                {item.semesterName}
              </Text>

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <View style={styles.metaCol}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={15} color={colors.primary[800]} />
                    <Text style={styles.metaText}>{formatDayOfWeek(item.dayOfWeek)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={15} color={colors.primary[800]} />
                    <Text style={styles.metaText}>
                      {formatTime(item.startTime)} - {formatTime(item.endTime)}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaCol}>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={15} color={colors.secondary[700]} />
                    <Text style={styles.metaText}>Phòng: {item.roomName}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={15} color={colors.neutral[600]} />
                    <Text style={styles.metaText}>
                      Sĩ số: {item.currentEnrolled}/{item.maxCapacity} SV
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Class Detail Modal */}
      {selectedClass && (
        <Modal
          visible={!!selectedClass}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedClass(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chi tiết lớp học phần</Text>
                <TouchableOpacity
                  onPress={() => setSelectedClass(null)}
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={22} color={colors.neutral[700]} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.modalBadgeRow}>
                  <View style={styles.modalCodeBadge}>
                    <Text style={styles.modalCodeText}>{selectedClass.sectionCode}</Text>
                  </View>
                  <Text style={styles.modalCredits}>{selectedClass.credits} tín chỉ</Text>
                </View>

                <Text style={styles.modalCourseName}>{selectedClass.courseName}</Text>
                <Text style={styles.modalCourseCode}>Mã môn học: {selectedClass.courseCode}</Text>

                <View style={styles.modalInfoGrid}>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalInfoLabel}>Thứ trong tuần</Text>
                    <Text style={styles.modalInfoVal}>
                      {formatDayOfWeek(selectedClass.dayOfWeek)}
                    </Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalInfoLabel}>Thời gian học</Text>
                    <Text style={styles.modalInfoVal}>
                      {formatTime(selectedClass.startTime)} - {formatTime(selectedClass.endTime)}
                    </Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalInfoLabel}>Phòng giảng dạy</Text>
                    <Text style={styles.modalInfoVal}>{selectedClass.roomName}</Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalInfoLabel}>Sĩ số lớp</Text>
                    <Text style={styles.modalInfoVal}>
                      {selectedClass.currentEnrolled} / {selectedClass.maxCapacity} sinh viên
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalActionSecondary}
                  onPress={() => {
                    setSelectedClass(null);
                    router.push('/(lecturer)/classes');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="people" size={18} color={colors.primary[800]} />
                  <Text style={styles.modalActionSecondaryText}>Danh sách SV & Điểm</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalActionPrimary}
                  onPress={() => {
                    setSelectedClass(null);
                    router.push('/(lecturer)/attendance');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="qr-code-outline" size={18} color={colors.neutral[0]} />
                  <Text style={styles.modalActionPrimaryText}>Điểm danh QR</Text>
                </TouchableOpacity>
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
    backgroundColor: colors.neutral[100],
  },
  daySelectorContainer: {
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    paddingVertical: spacing.xs,
  },
  daySelectorScroll: {
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  dayButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: colors.primary[900],
  },
  dayButtonToday: {
    borderWidth: 1,
    borderColor: colors.primary[800],
  },
  dayButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[700],
  },
  dayButtonTextSelected: {
    color: colors.neutral[0],
    fontWeight: typography.weights.bold,
  },
  dayButtonTextToday: {
    color: colors.primary[800],
    fontWeight: typography.weights.bold,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary[800],
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerInfo: {
    marginBottom: spacing.sm,
  },
  summaryText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    fontWeight: typography.weights.medium,
  },
  centerContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    marginTop: spacing.sm,
  },
  errorContainer: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error.light,
  },
  errorTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.error.dark,
    marginTop: spacing.xs,
  },
  errorSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary[800],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
  },
  retryButtonText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  emptyContainer: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginTop: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 4,
  },
  classCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  codeBadge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  codeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusTagOpen: {
    backgroundColor: colors.success.light + '25',
  },
  statusTagClosed: {
    backgroundColor: colors.neutral[200],
  },
  statusTagText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
  },
  statusTagTextOpen: {
    color: colors.success.dark,
  },
  statusTagTextClosed: {
    color: colors.neutral[600],
  },
  courseName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginTop: 2,
  },
  courseCode: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.sm,
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
    fontSize: typography.sizes.xs,
    color: colors.neutral[700],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    marginBottom: spacing.lg,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  modalCodeBadge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  modalCodeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  modalCredits: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    fontWeight: typography.weights.medium,
  },
  modalCourseName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginTop: 4,
  },
  modalCourseCode: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginBottom: spacing.md,
  },
  modalInfoGrid: {
    backgroundColor: colors.neutral[50],
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalInfoLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  modalInfoVal: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[800],
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalActionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primary[50],
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  modalActionSecondaryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  modalActionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primary[800],
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  modalActionPrimaryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[0],
  },
});
