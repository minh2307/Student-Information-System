/**
 * ScheduleDetailModal Component - REDS v2.0
 * Presentation modal displaying full details of a selected teaching session
 * with navigation shortcuts to Class Management and QR Attendance.
 */

import React from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/feedback/AppBadge';
import { LecturerClassSection } from '@/features/lecturer/types';
import { formatDayOfWeek, formatTime } from '@/utils/formatters';
import { tokens } from '@/theme';

export interface ScheduleDetailModalProps {
  visible: boolean;
  selectedClass: LecturerClassSection | null;
  onClose: () => void;
  onNavigateToClasses: (section: LecturerClassSection) => void;
  onNavigateToAttendance: (section: LecturerClassSection) => void;
  testID?: string;
}

export const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({
  visible,
  selectedClass,
  onClose,
  onNavigateToClasses,
  onNavigateToAttendance,
  testID = 'schedule-detail-modal',
}) => {
  if (!selectedClass) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText variant="h3" color="primary" style={styles.modalTitle}>
              Chi tiết lớp học phần
            </AppText>
            <Pressable
              onPress={onClose}
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

            <AppText
              variant="bodyBold"
              color="primary"
              style={styles.modalCourseName}
            >
              {selectedClass.courseName}
            </AppText>
            <AppText
              variant="caption"
              color="secondary"
              style={styles.modalCourseCode}
            >
              Mã môn học: {selectedClass.courseCode}
            </AppText>

            <View style={styles.modalInfoGrid}>
              <View style={styles.modalInfoItem}>
                <AppText
                  variant="caption"
                  color="muted"
                  style={styles.modalInfoLabel}
                >
                  Thứ trong tuần
                </AppText>
                <AppText
                  variant="bodyBold"
                  color="primary"
                  style={styles.modalInfoVal}
                >
                  {formatDayOfWeek(selectedClass.dayOfWeek)}
                </AppText>
              </View>
              <View style={styles.modalInfoItem}>
                <AppText
                  variant="caption"
                  color="muted"
                  style={styles.modalInfoLabel}
                >
                  Thời gian học
                </AppText>
                <AppText
                  variant="bodyBold"
                  color="primary"
                  style={styles.modalInfoVal}
                >
                  {formatTime(selectedClass.startTime)} -{' '}
                  {formatTime(selectedClass.endTime)}
                </AppText>
              </View>
              <View style={styles.modalInfoItem}>
                <AppText
                  variant="caption"
                  color="muted"
                  style={styles.modalInfoLabel}
                >
                  Phòng giảng dạy
                </AppText>
                <AppText
                  variant="bodyBold"
                  color="primary"
                  style={styles.modalInfoVal}
                >
                  {selectedClass.roomName}
                </AppText>
              </View>
              <View style={styles.modalInfoItem}>
                <AppText
                  variant="caption"
                  color="muted"
                  style={styles.modalInfoLabel}
                >
                  Sĩ số lớp
                </AppText>
                <AppText
                  variant="bodyBold"
                  color="primary"
                  style={styles.modalInfoVal}
                >
                  {selectedClass.currentEnrolled} / {selectedClass.maxCapacity}{' '}
                  sinh viên
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.modalActions}>
            <Pressable
              style={styles.modalActionSecondary}
              onPress={() => onNavigateToClasses(selectedClass)}
              accessibilityRole="button"
            >
              <AppText variant="captionBold" style={styles.actionSecText}>
                Quản lý lớp & Điểm
              </AppText>
            </Pressable>

            <Pressable
              style={styles.modalActionPrimary}
              onPress={() => onNavigateToAttendance(selectedClass)}
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
  );
};

const styles = StyleSheet.create({
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
