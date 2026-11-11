/**
 * Lecturer QR Attendance Session Screen
 * 15-second rotating Dynamic QR TOTP presentation engine with anti-proxy protection
 * and live attendee check-in monitoring.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  useLecturerClasses,
  useAttendanceSession,
  useRotatingQr,
  useStartAttendanceSession,
  useCloseAttendanceSession,
  LecturerClassSection,
} from '@/features/lecturer';
import { colors, spacing, typography, radius } from '@/theme';
import { formatTime } from '@/utils/formatters';

export default function LecturerAttendanceScreen() {
  // Class selection state
  const [selectedClass, setSelectedClass] = useState<LecturerClassSection | null>(null);
  const [isClassPickerOpen, setIsClassPickerOpen] = useState(false);

  // Countdown timer state
  const [countdown, setCountdown] = useState<number>(15);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Queries
  const {
    data: classes = [],
    isLoading: isClassesLoading,
  } = useLecturerClasses();

  // Default to first open class or first class if not selected
  useEffect(() => {
    if (!selectedClass && classes.length > 0) {
      const firstOpen = classes.find((c) => c.status === 'OPEN') || classes[0];
      setSelectedClass(firstOpen);
    }
  }, [classes, selectedClass]);

  const sectionId = selectedClass?.sectionId ?? 0;

  // Active attendance session query (polls every 4 seconds when active)
  const {
    data: sessionData,
    isLoading: isSessionLoading,
    refetch: refetchSession,
  } = useAttendanceSession(sectionId, sectionId > 0, 4000);

  const isSessionActive =
    sessionData?.status === 'ACTIVE' || sessionData?.status === 'OPEN';

  // Rotating QR query (active only when session is open)
  const {
    data: qrData,
    isLoading: isQrLoading,
    refetch: refetchQr,
  } = useRotatingQr(sectionId, isSessionActive);

  // Mutations
  const startSessionMutation = useStartAttendanceSession();
  const closeSessionMutation = useCloseAttendanceSession();

  // Synchronize countdown when new rotating QR arrives from backend
  useEffect(() => {
    if (qrData?.remainingSeconds != null) {
      setCountdown(Math.max(1, Math.round(qrData.remainingSeconds)));
    }
  }, [qrData]);

  // AppState lifecycle listener: re-synchronize session and QR upon app resume
  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (sectionId > 0) {
          // Re-verify session status on backend
          const sessionResult = await refetchSession();
          const activeStatus = sessionResult.data?.status;
          const isActive = activeStatus === 'ACTIVE' || activeStatus === 'OPEN';

          if (isActive) {
            // Pull fresh dynamic QR token from backend
            const qrResult = await refetchQr();
            if (qrResult.data?.remainingSeconds != null) {
              setCountdown(Math.max(1, Math.round(qrResult.data.remainingSeconds)));
            }
          } else {
            // Session closed or expired while backgrounded
            setCountdown(0);
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
          }
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [sectionId, refetchSession, refetchQr]);

  // 1-second interval TOTP ticker
  useEffect(() => {
    if (!isSessionActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Reached expiration: pull fresh rotating QR token and reset
          refetchQr();
          return qrData?.stepSeconds || 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isSessionActive, refetchQr, qrData?.stepSeconds]);

  // Handle Starting a new Session
  const handleStartSession = async () => {
    if (!selectedClass) return;

    try {
      const dateStr = new Date().toLocaleDateString('vi-VN');
      await startSessionMutation.mutateAsync({
        sectionId: selectedClass.sectionId,
        sessionName: `Điểm danh ca ${dateStr}`,
      });
      refetchSession();
      refetchQr();
      setCountdown(15);
    } catch (err: any) {
      Alert.alert('Lỗi tạo phiên', err?.message || 'Không thể mở phiên điểm danh.');
    }
  };

  // Handle Closing the Session
  const handleCloseSession = () => {
    if (!selectedClass) return;

    Alert.alert(
      'Chốt phiên điểm danh',
      'Thầy/Cô có chắc chắn muốn kết thúc phiên điểm danh này? Sinh viên sẽ không thể quét mã sau khi đóng.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chốt điểm danh',
          style: 'destructive',
          onPress: async () => {
            try {
              await closeSessionMutation.mutateAsync(selectedClass.sectionId);
              if (timerRef.current) clearInterval(timerRef.current);
              refetchSession();
              Alert.alert('Thành công', 'Đã đóng phiên điểm danh và lưu bản ghi.');
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể đóng phiên điểm danh.');
            }
          },
        },
      ]
    );
  };

  // Scanned attendees list
  const attendees = useMemo(() => sessionData?.records || [], [sessionData?.records]);
  const totalEnrolled = selectedClass?.currentEnrolled || 0;
  const attendedCount = attendees.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.title}>Điểm danh QR Động (Anti-Proxy)</Text>
        <Text style={styles.subtitle}>
          Mã QR đổi mới mỗi 15s tích hợp TOTP HMAC-SHA256, ngăn chặn chụp ảnh chuyển tiếp qua mạng xã hội
        </Text>
      </View>

      {/* Class Selector Card */}
      <TouchableOpacity
        style={styles.classSelectorCard}
        onPress={() => setIsClassPickerOpen(true)}
        activeOpacity={0.7}
      >
        <View style={styles.classSelectorLeft}>
          <View style={styles.classBadge}>
            <Text style={styles.classBadgeText}>
              {selectedClass?.sectionCode || 'Chọn lớp'}
            </Text>
          </View>
          <Text style={styles.className} numberOfLines={1}>
            {selectedClass?.courseName || 'Nhấn để chọn lớp học phần'}
          </Text>
          <Text style={styles.classMeta}>
            Phòng: {selectedClass?.roomName || '---'} | Sĩ số: {selectedClass?.currentEnrolled || 0} SV
          </Text>
        </View>
        <Ionicons name="swap-vertical" size={20} color={colors.primary[800]} />
      </TouchableOpacity>

      {/* QR Code Presentation Box */}
      <View style={styles.qrContainer}>
        {isSessionLoading ? (
          <View style={styles.qrLoadingBox}>
            <ActivityIndicator size="large" color={colors.primary[800]} />
            <Text style={styles.loadingText}>Đang kiểm tra trạng thái phiên...</Text>
          </View>
        ) : isSessionActive ? (
          <View style={styles.activeQrWrapper}>
            {/* Live QR Image */}
            <View style={styles.qrBox}>
              {isQrLoading || !qrData ? (
                <ActivityIndicator size="large" color={colors.primary[800]} />
              ) : qrData.qrImageBase64 ? (
                <Image
                  source={{ uri: qrData.qrImageBase64 }}
                  style={styles.qrImage}
                  contentFit="contain"
                />
              ) : (
                <View style={styles.qrFallback}>
                  <Ionicons name="qr-code" size={160} color={colors.neutral[900]} />
                </View>
              )}
            </View>

            {/* Countdown Badge */}
            <View style={styles.timerBadge}>
              <Ionicons name="timer-outline" size={18} color={colors.warning.dark} />
              <Text style={styles.timerText}>Mã làm mới sau: {countdown}s</Text>
            </View>

            <Text style={styles.qrTokenHint}>
              Mã bảo mật: {qrData?.qrToken?.substring(0, 18)}...
            </Text>
          </View>
        ) : (
          <View style={styles.inactiveQrWrapper}>
            <Ionicons name="lock-closed-outline" size={56} color={colors.neutral[400]} />
            <Text style={styles.inactiveTitle}>Phiên điểm danh chưa bắt đầu</Text>
            <Text style={styles.inactiveDesc}>
              Nhấn nút bên dưới để khởi tạo phiên điểm danh QR động cho sinh viên lớp{' '}
              {selectedClass?.sectionCode || 'này'}
            </Text>
          </View>
        )}
      </View>

      {/* Real-time Attendance Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.success.dark }]}>
            {attendedCount}
          </Text>
          <Text style={styles.statLabel}>Đã quét thành công</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.warning.dark }]}>
            {Math.max(0, totalEnrolled - attendedCount)}
          </Text>
          <Text style={styles.statLabel}>Chưa điểm danh</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.neutral[800] }]}>
            {totalEnrolled}
          </Text>
          <Text style={styles.statLabel}>Tổng sĩ số</Text>
        </View>
      </View>

      {/* Main Action Button */}
      {isSessionActive ? (
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonClose]}
          onPress={handleCloseSession}
          disabled={Boolean(closeSessionMutation?.isPending)}
          activeOpacity={0.8}
        >
          {closeSessionMutation?.isPending ? (
            <ActivityIndicator size="small" color={colors.neutral[0]} />
          ) : (
            <>
              <Ionicons name="stop-circle-outline" size={20} color={colors.neutral[0]} />
              <Text style={styles.actionButtonText}>Chốt & Đóng phiên điểm danh</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonStart]}
          onPress={handleStartSession}
          disabled={Boolean(startSessionMutation?.isPending) || !selectedClass}
          activeOpacity={0.8}
        >
          {startSessionMutation?.isPending ? (
            <ActivityIndicator size="small" color={colors.neutral[0]} />
          ) : (
            <>
              <Ionicons name="play-circle-outline" size={20} color={colors.neutral[0]} />
              <Text style={styles.actionButtonText}>Bắt đầu phiên điểm danh QR</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Live Attendee Roster Section */}
      <View style={styles.rosterSection}>
        <View style={styles.rosterHeader}>
          <Text style={styles.rosterTitle}>
            Danh sách đã điểm danh ({attendedCount})
          </Text>
          <TouchableOpacity onPress={() => refetchSession()} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color={colors.primary[800]} />
          </TouchableOpacity>
        </View>

        {attendees.length === 0 ? (
          <View style={styles.emptyRoster}>
            <Ionicons name="people-outline" size={32} color={colors.neutral[300]} />
            <Text style={styles.emptyRosterText}>
              {isSessionActive
                ? 'Đang chờ sinh viên quét mã QR...'
                : 'Chưa có bản ghi điểm danh nào trong phiên gần nhất.'}
            </Text>
          </View>
        ) : (
          attendees.map((record, index) => (
            <View key={record.recordId || index} style={styles.attendeeItem}>
              <View style={styles.attendeeIndex}>
                <Text style={styles.attendeeIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.attendeeInfo}>
                <Text style={styles.attendeeName}>{record.studentName}</Text>
                <Text style={styles.attendeeCode}>MSSV: {record.studentCode}</Text>
              </View>
              <View style={styles.attendeeMeta}>
                <View style={styles.timeTag}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success.dark} />
                  <Text style={styles.timeTagText}>
                    {formatTime(record.checkInTime ? record.checkInTime.split('T')[1] : null)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Class Selector Modal */}
      <Modal visible={isClassPickerOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn lớp học phần điểm danh</Text>
              <TouchableOpacity onPress={() => setIsClassPickerOpen(false)}>
                <Ionicons name="close" size={22} color={colors.neutral[700]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.classListScroll}>
              {isClassesLoading ? (
                <ActivityIndicator size="small" color={colors.primary[800]} />
              ) : (
                classes.map((c) => (
                  <TouchableOpacity
                    key={c.sectionId}
                    style={[
                      styles.classPickerItem,
                      selectedClass?.sectionId === c.sectionId && styles.classPickerItemActive,
                    ]}
                    onPress={() => {
                      setSelectedClass(c);
                      setIsClassPickerOpen(false);
                    }}
                  >
                    <View style={styles.classPickerBadge}>
                      <Text style={styles.classPickerBadgeText}>{c.sectionCode}</Text>
                    </View>
                    <View style={styles.classPickerDetails}>
                      <Text style={styles.classPickerName}>{c.courseName}</Text>
                      <Text style={styles.classPickerSub}>
                        Phòng: {c.roomName} | Sĩ số: {c.currentEnrolled}/{c.maxCapacity}
                      </Text>
                    </View>
                    {selectedClass?.sectionId === c.sectionId && (
                      <Ionicons name="checkmark" size={20} color={colors.primary[800]} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[100],
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  subtitle: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
    marginTop: 4,
    lineHeight: 16,
  },
  classSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  classSelectorLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  classBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  classBadgeText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  className: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  classMeta: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  qrContainer: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing.md,
  },
  qrLoadingBox: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
  activeQrWrapper: {
    alignItems: 'center',
  },
  qrBox: {
    width: 220,
    height: 220,
    backgroundColor: colors.neutral[0],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.neutral[300],
    borderRadius: radius.lg,
    padding: 8,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warning.light + '25',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  timerText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.warning.dark,
  },
  qrTokenHint: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[400],
    marginTop: 6,
  },
  inactiveQrWrapper: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  inactiveTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
    marginTop: spacing.sm,
  },
  inactiveDesc: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.neutral[0],
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  statNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  statLabel: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
    marginTop: 2,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  actionButtonStart: {
    backgroundColor: colors.primary[900],
  },
  actionButtonClose: {
    backgroundColor: colors.error.main,
  },
  actionButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[0],
  },
  rosterSection: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rosterTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
  },
  emptyRoster: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyRosterText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[400],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  attendeeIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  attendeeIndexText: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[600],
    fontWeight: typography.weights.bold,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  attendeeCode: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
  },
  attendeeMeta: {
    alignItems: 'flex-end',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeTagText: {
    fontSize: typography.sizes.xxs,
    color: colors.success.dark,
    fontWeight: typography.weights.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  classListScroll: {
    marginBottom: spacing.md,
  },
  classPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  classPickerItemActive: {
    backgroundColor: colors.primary[50] + '40',
  },
  classPickerBadge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  classPickerBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  classPickerDetails: {
    flex: 1,
  },
  classPickerName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  classPickerSub: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
    marginTop: 2,
  },
});
