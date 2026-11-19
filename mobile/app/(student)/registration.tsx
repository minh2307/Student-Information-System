/**
 * Course Registration Native Screen (TASK ST-05)
 * Live integration with GET /api/v1/student/class-sections,
 * 5-Minute Slot Reservation, 24-Credit hard limit, 12-Credit soft advisory warning,
 * and Schedule Conflict detection.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import {
  useCourseRegistration,
  MAX_CREDITS_PER_SEMESTER,
  MIN_RECOMMENDED_CREDITS,
} from '@/features/student/hooks/useCourseRegistration';
import { ClassSection } from '@/features/student/types';
import { ErrorView } from '@/components/common/ErrorView';
import { EmptyState } from '@/components/common/EmptyState';

export default function RegistrationScreen() {
  const [keyword, setKeyword] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'AVAILABLE' | 'ENROLLED'>('ALL');

  const {
    sections,
    reservations,
    enrolledSections,
    totalEnrolledCredits,
    isBelowMinCredits,
    isAtMaxLimit,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    enrollMutation,
    cancelEnrollMutation,
    reserveSlotMutation,
    cancelReservationMutation,
    batchEnrollMutation,
    detectConflicts,
  } = useCourseRegistration(undefined, keyword);

  const handleEnroll = (section: ClassSection) => {
    // 1. Hard Credit Limit Check
    const projectedCredits = totalEnrolledCredits + (section.credits || 0);
    if (projectedCredits > MAX_CREDITS_PER_SEMESTER) {
      Alert.alert(
        'Vượt quá giới hạn tín chỉ',
        `Bạn hiện đã đăng ký ${totalEnrolledCredits} TC. Đăng ký thêm môn này (${section.credits} TC) sẽ là ${projectedCredits} TC, vượt quá mức tối đa ${MAX_CREDITS_PER_SEMESTER} TC cho phép trong kỳ.`,
        [{ text: 'Đã hiểu', style: 'default' }]
      );
      return;
    }

    // 2. Schedule Conflict Soft Warning
    const conflicts = detectConflicts(section);
    if (conflicts.length > 0) {
      const conflictNames = conflicts.map((c) => `${c.courseCode} (${c.dayOfWeek} ${c.startTime}-${c.endTime})`).join(', ');
      Alert.alert(
        'Cảnh báo trùng thời khóa biểu',
        `Lớp học phần này bị trùng lịch với: ${conflictNames}.\n\nTheo quy chế đào tạo, bạn vẫn được phép đăng ký trùng lịch. Bạn có muốn tiếp tục đăng ký không?`,
        [
          { text: 'Hủy bỏ', style: 'cancel' },
          {
            text: 'Tiếp tục đăng ký',
            style: 'default',
            onPress: () => {
              enrollMutation.mutate(section);
            },
          },
        ]
      );
      return;
    }

    // Normal enrollment
    enrollMutation.mutate(section);
  };

  const handleCancelEnrollment = (section: ClassSection) => {
    if (!section.enrollmentId) return;
    Alert.alert(
      'Xác nhận hủy môn học',
      `Bạn có chắc chắn muốn hủy đăng ký môn "${section.courseName}" (${section.credits} TC) không?`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy môn',
          style: 'destructive',
          onPress: () => {
            cancelEnrollMutation.mutate(section.enrollmentId!);
          },
        },
      ]
    );
  };

  const handleReserveSlot = (section: ClassSection) => {
    const projectedCredits = totalEnrolledCredits + (section.credits || 0);
    if (projectedCredits > MAX_CREDITS_PER_SEMESTER) {
      Alert.alert(
        'Giới hạn tín chỉ',
        `Không thể giữ chỗ vì sẽ vượt quá trần ${MAX_CREDITS_PER_SEMESTER} tín chỉ/kỳ.`,
        [{ text: 'Đã hiểu' }]
      );
      return;
    }
    reserveSlotMutation.mutate(section);
  };

  // Filter sections by selected tab
  const filteredSections = sections.filter((s) => {
    if (filterTab === 'ENROLLED') return s.isEnrolled;
    if (filterTab === 'AVAILABLE') return !s.isEnrolled && (s.availableSeats ?? (s.maxCapacity - s.currentEnrolled)) > 0;
    return true;
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[colors.primary[800]]}
          tintColor={colors.primary[800]}
        />
      }
    >
      {/* Search Input Box */}
      <View style={styles.searchBox} testID="registration-search-box">
        <Ionicons name="search-outline" size={20} color={colors.neutral[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm mã môn, tên môn học, giảng viên..."
          placeholderTextColor={colors.neutral[400]}
          value={keyword}
          onChangeText={setKeyword}
          clearButtonMode="while-editing"
          testID="registration-search-input"
        />
        {keyword ? (
          <Pressable onPress={() => setKeyword('')} testID="clear-search-btn">
            <Ionicons name="close-circle" size={18} color={colors.neutral[400]} />
          </Pressable>
        ) : null}
      </View>

      {/* Credit Summary & Advisory Card */}
      <View style={styles.creditCard} testID="registration-credit-summary">
        <View style={styles.creditHeader}>
          <Text style={styles.creditTitle}>Tín chỉ đăng ký trong kỳ</Text>
          <View style={[styles.creditBadge, isAtMaxLimit ? styles.creditBadgeMax : styles.creditBadgeNormal]}>
            <Text style={[styles.creditBadgeText, isAtMaxLimit && styles.creditBadgeTextMax]}>
              {totalEnrolledCredits} / {MAX_CREDITS_PER_SEMESTER} TC
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, (totalEnrolledCredits / MAX_CREDITS_PER_SEMESTER) * 100)}%` },
              isAtMaxLimit && { backgroundColor: colors.error.dark },
            ]}
          />
        </View>

        {/* Advisory Warning: Under 12 credits */}
        {isBelowMinCredits ? (
          <View style={styles.advisoryBanner} testID="advisory-under-12-banner">
            <Ionicons name="alert-circle" size={16} color={colors.warning.dark} />
            <Text style={styles.advisoryText}>
              Cảnh báo học vụ: Bạn hiện đăng ký {totalEnrolledCredits} TC, dưới ngưỡng khuyến nghị tối thiểu {MIN_RECOMMENDED_CREDITS} TC.
            </Text>
          </View>
        ) : null}

        {/* Hard Limit Alert: 24 credits reached */}
        {isAtMaxLimit ? (
          <View style={styles.maxCreditBanner} testID="max-credit-banner">
            <Ionicons name="information-circle" size={16} color={colors.error.dark} />
            <Text style={styles.maxCreditText}>
              Bạn đã đạt giới hạn tối đa {MAX_CREDITS_PER_SEMESTER} TC trong kỳ. Không thể đăng ký thêm môn mới.
            </Text>
          </View>
        ) : null}
      </View>

      {/* Active Reservations Bar (EDUP-203, F-06) */}
      {reservations.length > 0 ? (
        <View style={styles.reservationsCard} testID="active-reservations-card">
          <View style={styles.reservationsHeader}>
            <View style={styles.reservationsTitleRow}>
              <Ionicons name="timer-outline" size={18} color={colors.primary[800]} />
              <Text style={styles.reservationsTitle}>
                Đang giữ chỗ ({reservations.length} môn)
              </Text>
            </View>
            <Pressable
              style={styles.batchEnrollBtn}
              onPress={() => batchEnrollMutation.mutate()}
              disabled={batchEnrollMutation.isPending}
              accessibilityRole="button"
              testID="batch-enroll-reservations-btn"
            >
              {batchEnrollMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.neutral[0]} />
              ) : (
                <Text style={styles.batchEnrollBtnText}>1-Chạm Đăng ký tất cả</Text>
              )}
            </Pressable>
          </View>

          {reservations.map((res) => (
            <View key={res.reservationId} style={styles.resItemRow}>
              <View style={styles.resItemLeft}>
                <Text style={styles.resCourseName}>{res.courseName}</Text>
                <Text style={styles.resTimer}>
                  Còn lại: {Math.floor(res.remainingSeconds / 60)}:
                  {(res.remainingSeconds % 60).toString().padStart(2, '0')}
                </Text>
              </View>
              <Pressable
                onPress={() => cancelReservationMutation.mutate(res.classSectionId)}
                style={styles.resCancelBtn}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={16} color={colors.error.dark} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {/* Filter Tabs */}
      <View style={styles.tabBar} testID="registration-filter-tabs">
        {(
          [
            { key: 'ALL', label: `Tất cả (${sections.length})` },
            { key: 'AVAILABLE', label: 'Còn chỗ' },
            { key: 'ENROLLED', label: `Đã đăng ký (${enrolledSections.length})` },
          ] as const
        ).map((tab) => {
          const isActive = filterTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setFilterTab(tab.key)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              accessibilityRole="tab"
            >
              <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Body States */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[800]} />
          <Text style={styles.loadingText}>Đang tải danh sách lớp học phần...</Text>
        </View>
      ) : isError ? (
        <ErrorView
          title="Không thể tải danh sách môn học"
          message={error?.message || 'Lỗi kết nối máy chủ.'}
          onRetry={refetch}
        />
      ) : filteredSections.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Không tìm thấy lớp học phần"
          message="Không có lớp học phần nào phù hợp với điều kiện tìm kiếm hoặc bộ lọc hiện tại."
        />
      ) : (
        filteredSections.map((sec) => {
          const isEnrolled = sec.isEnrolled;
          const isReserved = sec.isReservedByMe;
          const conflicts = detectConflicts(sec);
          const hasConflict = sec.hasConflict || conflicts.length > 0;
          const availableSeats = sec.availableSeats ?? Math.max(0, sec.maxCapacity - sec.currentEnrolled);
          const isFull = availableSeats <= 0;

          return (
            <View
              key={sec.id}
              style={[styles.sectionCard, isEnrolled && styles.sectionCardEnrolled]}
              testID={`section-card-${sec.id}`}
            >
              {/* Top Row: Course Code & Section & Credits */}
              <View style={styles.sectionTopRow}>
                <View style={styles.codeGroup}>
                  <Text style={styles.courseCode}>{sec.courseCode}</Text>
                  <Text style={styles.sectionCode}>- Lớp {sec.sectionCode}</Text>
                </View>
                <View style={styles.creditsPill}>
                  <Text style={styles.creditsPillText}>{sec.credits} TC</Text>
                </View>
              </View>

              {/* Course Title */}
              <Text style={styles.courseName}>{sec.courseName}</Text>

              {/* Schedule Info */}
              <View style={styles.scheduleRow}>
                <View style={styles.scheduleItem}>
                  <Ionicons name="calendar-outline" size={14} color={colors.neutral[500]} />
                  <Text style={styles.scheduleText}>
                    {sec.dayOfWeek} • {sec.startTime.substring(0, 5)} - {sec.endTime.substring(0, 5)}
                  </Text>
                </View>
                <View style={styles.scheduleItem}>
                  <Ionicons name="location-outline" size={14} color={colors.neutral[500]} />
                  <Text style={styles.scheduleText}>{sec.roomName || 'Đang xếp phòng'}</Text>
                </View>
              </View>

              {/* Lecturer Info */}
              {sec.lecturerName ? (
                <View style={styles.lecturerRow}>
                  <Ionicons name="person-outline" size={14} color={colors.neutral[500]} />
                  <Text style={styles.lecturerText}>GV: {sec.lecturerName}</Text>
                </View>
              ) : null}

              {/* Seats & Conflict Status Bar */}
              <View style={styles.statusRow}>
                <View style={styles.seatBadge}>
                  <Ionicons
                    name="people-outline"
                    size={13}
                    color={isFull ? colors.error.dark : colors.neutral[600]}
                  />
                  <Text style={[styles.seatText, isFull && styles.seatTextFull]}>
                    {isFull ? 'Hết chỗ' : `Còn ${availableSeats}/${sec.maxCapacity} chỗ`}
                  </Text>
                </View>

                {hasConflict && !isEnrolled ? (
                  <View style={styles.conflictBadge} testID="conflict-warning-badge">
                    <Ionicons name="warning-outline" size={12} color={colors.warning.dark} />
                    <Text style={styles.conflictText}>Trùng lịch</Text>
                  </View>
                ) : null}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {isEnrolled ? (
                  <View style={styles.enrolledActionGroup}>
                    <View style={styles.enrolledBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success.dark} />
                      <Text style={styles.enrolledBadgeText}>Đã đăng ký</Text>
                    </View>
                    <Pressable
                      style={styles.cancelEnrollBtn}
                      onPress={() => handleCancelEnrollment(sec)}
                      accessibilityRole="button"
                      testID={`cancel-enroll-btn-${sec.id}`}
                    >
                      <Text style={styles.cancelEnrollBtnText}>Hủy môn</Text>
                    </Pressable>
                  </View>
                ) : isReserved ? (
                  <View style={styles.reservedActionGroup}>
                    <View style={styles.reservedPill}>
                      <Ionicons name="timer" size={14} color={colors.primary[800]} />
                      <Text style={styles.reservedPillText}>Đang giữ chỗ</Text>
                    </View>
                    <Pressable
                      style={styles.enrollNowBtn}
                      onPress={() => handleEnroll(sec)}
                      accessibilityRole="button"
                      testID={`confirm-reserved-btn-${sec.id}`}
                    >
                      <Text style={styles.enrollNowBtnText}>Xác nhận</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.availableActionGroup}>
                    {/* 5-Minute Slot Reservation Button */}
                    <Pressable
                      style={[styles.reserveBtn, isFull && styles.btnDisabled]}
                      onPress={() => handleReserveSlot(sec)}
                      disabled={isFull || reserveSlotMutation.isPending}
                      accessibilityRole="button"
                      testID={`reserve-slot-btn-${sec.id}`}
                    >
                      <Text style={styles.reserveBtnText}>Giữ chỗ 5p</Text>
                    </Pressable>

                    {/* Direct Enroll Button */}
                    <Pressable
                      style={[styles.enrollBtn, isFull && styles.btnDisabled]}
                      onPress={() => handleEnroll(sec)}
                      disabled={isFull || enrollMutation.isPending}
                      accessibilityRole="button"
                      testID={`enroll-btn-${sec.id}`}
                    >
                      <Text style={styles.enrollBtnText}>Đăng ký ngay</Text>
                    </Pressable>
                  </View>
                )}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.neutral[900],
    padding: 0,
  },
  creditCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  creditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  creditTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
  },
  creditBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  creditBadgeNormal: {
    backgroundColor: colors.primary[50],
  },
  creditBadgeMax: {
    backgroundColor: colors.error.light,
  },
  creditBadgeText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
  },
  creditBadgeTextMax: {
    color: colors.error.dark,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.neutral[100],
    borderRadius: 3,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary[800],
    borderRadius: 3,
  },
  advisoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning.light,
    padding: spacing.xs,
    borderRadius: radius.sm,
    gap: 6,
    marginTop: spacing.xs,
  },
  advisoryText: {
    fontSize: 11,
    color: colors.warning.dark,
    flex: 1,
    fontWeight: typography.weights.medium,
  },
  maxCreditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error.light,
    padding: spacing.xs,
    borderRadius: radius.sm,
    gap: 6,
    marginTop: spacing.xs,
  },
  maxCreditText: {
    fontSize: 11,
    color: colors.error.dark,
    flex: 1,
    fontWeight: typography.weights.medium,
  },
  reservationsCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reservationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  reservationsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reservationsTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#92400E',
  },
  batchEnrollBtn: {
    backgroundColor: colors.primary[800],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  batchEnrollBtnText: {
    color: colors.neutral[0],
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  resItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(180, 83, 9, 0.1)',
  },
  resItemLeft: {
    flex: 1,
  },
  resCourseName: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[900],
  },
  resTimer: {
    fontSize: 10,
    color: colors.primary[800],
    fontWeight: typography.weights.bold,
  },
  resCancelBtn: {
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tabButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
  },
  tabButtonActive: {
    backgroundColor: colors.primary[800],
  },
  tabButtonText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[600],
  },
  tabButtonTextActive: {
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
  sectionCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  sectionCardEnrolled: {
    borderColor: colors.success.light,
    borderLeftWidth: 4,
    borderLeftColor: colors.success.dark,
  },
  sectionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseCode: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
  },
  sectionCode: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  creditsPill: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  creditsPillText: {
    fontSize: 10,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[700],
  },
  courseName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: 4,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleText: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[600],
  },
  lecturerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  lecturerText: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[600],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  seatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seatText: {
    fontSize: 11,
    color: colors.neutral[600],
  },
  seatTextFull: {
    color: colors.error.dark,
    fontWeight: typography.weights.bold,
  },
  conflictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.warning.light,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  conflictText: {
    fontSize: 10,
    color: colors.warning.dark,
    fontWeight: typography.weights.bold,
  },
  actionRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  enrolledActionGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  enrolledBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.success.dark,
  },
  cancelEnrollBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.error.light,
  },
  cancelEnrollBtnText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    color: colors.error.dark,
  },
  reservedActionGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reservedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reservedPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
  },
  enrollNowBtn: {
    backgroundColor: colors.primary[800],
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  enrollNowBtnText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
  },
  availableActionGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  reserveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary[800],
    backgroundColor: colors.neutral[0],
  },
  reserveBtnText: {
    color: colors.primary[800],
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
  },
  enrollBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.primary[800],
  },
  enrollBtnText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
