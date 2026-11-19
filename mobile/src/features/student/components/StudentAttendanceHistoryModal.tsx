/**
 * StudentAttendanceHistoryModal.tsx
 * Modal displaying attendance history and check-in records for student.
 * Styled with REDS v2.0 design tokens, accessible touch targets (>=48dp), and WCAG AA contrast.
 */

import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';
import { AppText } from '@/components/primitives/AppText';
import { AppCard } from '@/components/primitives/AppCard';
import { AppBadge, BadgeVariant } from '@/components/feedback/AppBadge';
import { AppEmptyState } from '@/components/feedback/AppEmptyState';
import { AppErrorState } from '@/components/feedback/AppErrorState';
import { formatDayOfWeek } from '@/utils/formatters';
import { useStudentAttendanceHistory } from '../hooks/useStudentAttendanceHistory';
import { StudentAttendanceRecord } from '../types';

export interface StudentAttendanceHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  sectionId?: number;
  semesterName?: string;
  testID?: string;
}

const mapStatusToBadge = (status: string): { label: string; variant: BadgeVariant } => {
  switch (status?.toUpperCase()) {
    case 'PRESENT':
      return { label: 'Có mặt', variant: 'success' };
    case 'LATE':
      return { label: 'Đi muộn', variant: 'warning' };
    case 'ABSENT':
      return { label: 'Vắng mặt', variant: 'error' };
    case 'EXCUSED':
      return { label: 'Có phép', variant: 'info' };
    default:
      return { label: status || 'Không rõ', variant: 'neutral' };
  }
};

const formatIsoDateTime = (isoString?: string | null): string => {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
};

const StudentAttendanceHistoryModalContent: React.FC<StudentAttendanceHistoryModalProps> = ({
  visible,
  onClose,
  sectionId,
  semesterName,
  testID = 'student-attendance-history-modal',
}) => {
  const queryResult = typeof useStudentAttendanceHistory === 'function'
    ? useStudentAttendanceHistory({ sectionId, semesterName })
    : undefined;

  const data = queryResult?.data;
  const isLoading = queryResult?.isLoading ?? false;
  const isError = queryResult?.isError ?? false;
  const error = queryResult?.error;
  const refetch = queryResult?.refetch ?? (() => Promise.resolve());

  const records: StudentAttendanceRecord[] = data?.records || [];
  const totalRecords = data?.totalRecords ?? records.length;

  const presentCount = records.filter(
    (r) => r.status?.toUpperCase() === 'PRESENT' || r.status?.toUpperCase() === 'LATE'
  ).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="calendar-outline" size={22} color={tokens.brand.burgundy} />
              <AppText variant="h3" color="primary" style={styles.titleText}>
                Lịch sử điểm danh
              </AppText>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressedButton]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Đóng lịch sử điểm danh"
              testID="close-attendance-history-button"
            >
              <Ionicons name="close" size={24} color={tokens.text.primary} />
            </Pressable>
          </View>

          {/* Quick Summary Pill Bar */}
          {!isLoading && !isError && records.length > 0 && (
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <AppText variant="caption" color="muted">
                  Tổng lượt ghi nhận
                </AppText>
                <AppText variant="bodyBold" color="primary">
                  {totalRecords}
                </AppText>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <AppText variant="caption" color="muted">
                  Có mặt / Muộn
                </AppText>
                <AppText variant="bodyBold" color="success">
                  {presentCount} / {records.length}
                </AppText>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <AppText variant="caption" color="muted">
                  Tỷ lệ đạt
                </AppText>
                <AppText variant="bodyBold" color="primary">
                  {records.length > 0
                    ? `${Math.round((presentCount / records.length) * 100)}%`
                    : '100%'}
                </AppText>
              </View>
            </View>
          )}

          {/* Body List */}
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={tokens.brand.burgundy} />
                <AppText variant="caption" color="muted" style={styles.loadingText}>
                  Đang tải lịch sử điểm danh...
                </AppText>
              </View>
            ) : isError ? (
              <AppErrorState
                title="Lỗi tải dữ liệu"
                message={error?.message || 'Không thể lấy lịch sử điểm danh lúc này.'}
                onRetry={refetch}
                retryLabel="Thử lại"
              />
            ) : records.length === 0 ? (
              <AppEmptyState
                icon="checkmark-circle-outline"
                title="Chưa có dữ liệu điểm danh"
                message="Bạn chưa có bản ghi điểm danh nào được lưu trên hệ thống."
              />
            ) : (
              records.map((record) => {
                const badgeInfo = mapStatusToBadge(record.status);
                return (
                  <AppCard
                    key={record.recordId}
                    variant="elevated"
                    style={styles.recordCard}
                    testID={`attendance-record-${record.recordId}`}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.courseHeader}>
                        <AppText variant="captionBold" style={styles.courseCodeBadge}>
                          {record.courseCode || 'HỌC PHẦN'}
                        </AppText>
                        <AppText
                          variant="bodyBold"
                          color="primary"
                          numberOfLines={1}
                          style={styles.courseNameText}
                        >
                          {record.courseName || record.sectionCode}
                        </AppText>
                      </View>
                      <AppBadge
                        label={badgeInfo.label}
                        variant={badgeInfo.variant}
                        size="sm"
                      />
                    </View>

                    <View style={styles.cardBody}>
                      <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={14} color={tokens.text.secondary} />
                        <AppText variant="caption" color="secondary" style={styles.infoText}>
                          Ca: {record.sessionName || 'Buổi học'} ({formatDayOfWeek(record.dayOfWeek)} - {record.slotTime || '--'})
                        </AppText>
                      </View>

                      {record.roomName ? (
                        <View style={styles.infoRow}>
                          <Ionicons name="location-outline" size={14} color={tokens.text.secondary} />
                          <AppText variant="caption" color="secondary" style={styles.infoText}>
                            Phòng học: {record.roomName}
                          </AppText>
                        </View>
                      ) : null}

                      {record.checkInTime ? (
                        <View style={styles.infoRow}>
                          <Ionicons name="qr-code-outline" size={14} color={tokens.brand.burgundy} />
                          <AppText variant="caption" color="primary" style={styles.checkInTimeText}>
                            Quét lúc: {formatIsoDateTime(record.checkInTime)}
                          </AppText>
                        </View>
                      ) : null}

                      {record.deviceInfo ? (
                        <View style={styles.infoRow}>
                          <Ionicons name="phone-portrait-outline" size={14} color={tokens.text.muted} />
                          <AppText variant="caption" color="muted" style={styles.infoText}>
                            Thiết bị: {record.deviceInfo}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </AppCard>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export const StudentAttendanceHistoryModal: React.FC<StudentAttendanceHistoryModalProps> = (props) => {
  if (!props.visible) {
    return null;
  }
  return <StudentAttendanceHistoryModalContent {...props} />;
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: tokens.surface.card,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    maxHeight: '85%',
    minHeight: '40%',
    paddingBottom: tokens.spacing.xl,
    ...tokens.elevation.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.default,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  titleText: {
    fontSize: 18,
  },
  closeButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.full,
  },
  pressedButton: {
    opacity: 0.6,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: tokens.surface.canvas,
    marginHorizontal: tokens.spacing.lg,
    marginTop: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: tokens.border.default,
  },
  contentScroll: {
    flex: 1,
    marginTop: tokens.spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  loadingContainer: {
    paddingVertical: tokens.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: tokens.spacing.xs,
  },
  recordCard: {
    marginBottom: tokens.spacing.xs,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderColor: tokens.border.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    flex: 1,
    marginRight: tokens.spacing.xs,
  },
  courseCodeBadge: {
    fontSize: 11,
    color: tokens.brand.burgundy,
    backgroundColor: tokens.brand.crimsonLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.xs,
  },
  courseNameText: {
    flex: 1,
    fontSize: 14,
  },
  cardBody: {
    gap: 4,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
  },
  checkInTimeText: {
    fontSize: 12,
    fontWeight: tokens.typography.weights.medium,
  },
});

export default StudentAttendanceHistoryModal;
