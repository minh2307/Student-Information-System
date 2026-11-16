/**
 * LecturerQuickActions.tsx
 * Quick Navigation Action Cards for Lecturer Workflows (REDS v2.0).
 * Deep links directly to QR Attendance, Class Roster & Grades, and Full Teaching Schedule.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { tokens } from '@/theme';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { SectionHeader } from '@/components/layout/SectionHeader';

export interface LecturerQuickActionsProps {
  onNavigateToAttendance?: () => void;
  onNavigateToClasses?: () => void;
  onNavigateToSchedule?: () => void;
  testID?: string;
}

export const LecturerQuickActions: React.FC<LecturerQuickActionsProps> = ({
  onNavigateToAttendance,
  onNavigateToClasses,
  onNavigateToSchedule,
  testID = 'lecturer-quick-actions',
}) => {
  const router = useRouter();

  const handleAttendance = () => {
    if (onNavigateToAttendance) {
      onNavigateToAttendance();
    } else {
      router.push('/(lecturer)/attendance');
    }
  };

  const handleClasses = () => {
    if (onNavigateToClasses) {
      onNavigateToClasses();
    } else {
      router.push('/(lecturer)/classes');
    }
  };

  const handleSchedule = () => {
    if (onNavigateToSchedule) {
      onNavigateToSchedule();
    } else {
      router.push('/(lecturer)/schedule');
    }
  };

  return (
    <View testID={testID}>
      <SectionHeader title="Tác vụ giảng viên" />
      <View style={styles.actionsList}>
        {/* Action 1: QR Attendance */}
        <AppCard
          variant="outlined"
          style={styles.actionCard}
          onPress={handleAttendance}
          accessibilityLabel="Mở điểm danh QR Động"
          testID="lecturer-action-attendance"
        >
          <View style={[styles.actionIconContainer, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="qr-code-outline" size={24} color="#1D4ED8" />
          </View>
          <View style={styles.actionContent}>
            <AppText variant="bodyBold" color="primary" style={styles.actionTitle}>
              Mở điểm danh QR Động
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.actionDesc}>
              Khởi tạo phiên điểm danh TOTP 15s chống gian lận & theo dõi SV quét thời gian thực
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={tokens.text.disabled} />
        </AppCard>

        {/* Action 2: Classes & Grades */}
        <AppCard
          variant="outlined"
          style={styles.actionCard}
          onPress={handleClasses}
          accessibilityLabel="Danh sách lớp & Nhập điểm"
          testID="lecturer-action-classes"
        >
          <View style={[styles.actionIconContainer, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="people-circle-outline" size={24} color="#047857" />
          </View>
          <View style={styles.actionContent}>
            <AppText variant="bodyBold" color="primary" style={styles.actionTitle}>
              Danh sách lớp & Nhập điểm
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.actionDesc}>
              Tra cứu sinh viên, cập nhật điểm chuyên cần, giữa kỳ, cuối kỳ & chốt điểm học phần
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={tokens.text.disabled} />
        </AppCard>

        {/* Action 3: Schedule */}
        <AppCard
          variant="outlined"
          style={styles.actionCard}
          onPress={handleSchedule}
          accessibilityLabel="Thời khóa biểu giảng dạy"
          testID="lecturer-action-schedule"
        >
          <View style={[styles.actionIconContainer, { backgroundColor: '#FFFBEB' }]}>
            <Ionicons name="calendar-outline" size={24} color="#B45309" />
          </View>
          <View style={styles.actionContent}>
            <AppText variant="bodyBold" color="primary" style={styles.actionTitle}>
              Thời khóa biểu giảng dạy
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.actionDesc}>
              Xem lịch dạy chi tiết theo ngày, tuần, phòng học và ca giảng dạy
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={tokens.text.disabled} />
        </AppCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsList: {
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.md,
    minHeight: 64, // Touch target >= 48dp
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    marginBottom: 2,
  },
  actionDesc: {
    lineHeight: 16,
  },
});

export default LecturerQuickActions;
