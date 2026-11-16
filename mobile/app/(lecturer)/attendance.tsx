/**
 * Lecturer QR Attendance Session Screen - REDS v2.0
 * 15-second rotating Dynamic QR TOTP presentation engine with anti-proxy protection
 * and real-time attendee check-in monitoring.
 *
 * Integrates:
 * - AppNotificationHeader (burgundy variant)
 * - ConnectedOfflineBanner
 * - AttendanceQrBox (quiet zone QR display & countdown ticker)
 * - AttendanceStatsCard (real-time check-in counts)
 * - AttendeeRosterCard (checked-in student list)
 * - Anti-race refetch guard on 15s expiration
 * - Full AppState background/resume lifecycle re-synchronization
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useLecturerClasses,
  useAttendanceSession,
  useRotatingQr,
  useStartAttendanceSession,
  useCloseAttendanceSession,
  LecturerClassSection,
  AttendanceQrBox,
  AttendanceStatsCard,
  AttendeeRosterCard,
} from '@/features/lecturer';
import { tokens } from '@/theme';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/feedback/AppBadge';
import { AppNotificationHeader } from '@/features/notifications';
import { ConnectedOfflineBanner } from '@/features/offline';

export default function LecturerAttendanceScreen() {
  // Class selection state
  const [selectedClassState, setSelectedClass] = useState<LecturerClassSection | null>(null);
  const [isClassPickerOpen, setIsClassPickerOpen] = useState(false);

  // Countdown timer state & race condition guard
  const [countdown, setCountdown] = useState<number>(15);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRefreshingQrRef = useRef<boolean>(false);

  // Queries
  const {
    data: classes = [],
    isLoading: isClassesLoading,
  } = useLecturerClasses();

  // Resolve active class synchronously on initial render with fallback to first open class
  const selectedClass = useMemo(() => {
    if (selectedClassState) return selectedClassState;
    if (classes.length > 0) {
      return classes.find((c) => c.status === 'OPEN') || classes[0];
    }
    return null;
  }, [classes, selectedClassState]);

  const sectionId = selectedClass?.sectionId ?? 0;

  // Active attendance session query (polls every 4 seconds when active)
  const {
    data: sessionData,
    isLoading: isSessionLoading,
    refetch: refetchSession,
    isRefetching: isSessionRefetching,
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
      isRefreshingQrRef.current = false;
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

  // 1-second interval TOTP ticker with race-condition guard
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
          // Reached expiration: pull fresh rotating QR token without stacking concurrent requests
          if (!isRefreshingQrRef.current && !isQrLoading) {
            isRefreshingQrRef.current = true;
            refetchQr().finally(() => {
              isRefreshingQrRef.current = false;
            });
          }
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
  }, [isSessionActive, refetchQr, isQrLoading, qrData?.stepSeconds]);

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

  // Scanned attendees list & stats
  const attendees = useMemo(() => sessionData?.records || [], [sessionData?.records]);
  const totalEnrolled = selectedClass?.currentEnrolled || 0;
  const attendedCount = attendees.length;

  return (
    <View style={styles.root}>
      {/* 1. Shared REDS v2.0 Top Navigation Header with Notification Bell */}
      <AppNotificationHeader
        title="Điểm danh QR"
        subtitle="Phiên điểm danh bảo mật (Anti-Proxy)"
        variant="burgundy"
        testID="lecturer-attendance-header"
      />

      {/* 2. Shared Connected Offline Banner */}
      <ConnectedOfflineBanner testID="lecturer-attendance-offline-banner" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 3. Class Selector Card */}
        <AppCard variant="elevated" style={styles.classSelectorCard} testID="attendance-class-selector">
          <Pressable
            style={styles.classSelectorPressable}
            onPress={() => setIsClassPickerOpen(true)}
            android_ripple={{ color: tokens.brand.crimsonLight }}
            accessibilityRole="button"
            accessibilityLabel="Chọn lớp học phần điểm danh"
          >
            <View style={styles.classSelectorLeft}>
              <View style={styles.badgeRow}>
                <AppBadge
                  variant="primary"
                  size="sm"
                  label={selectedClass?.sectionCode || 'Chọn lớp'}
                />
                <AppText variant="caption" color="muted">
                  {selectedClass?.semesterName || 'Học kỳ hiện tại'}
                </AppText>
              </View>
              <AppText variant="h3" numberOfLines={1} style={styles.className}>
                {selectedClass?.courseName || 'Nhấn để chọn lớp học phần'}
              </AppText>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={13} color={tokens.text.muted} />
                  <AppText variant="caption" color="muted">
                    {selectedClass?.roomName || '---'}
                  </AppText>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={13} color={tokens.text.muted} />
                  <AppText variant="caption" color="muted">
                    Sĩ số: {selectedClass?.currentEnrolled || 0}/{selectedClass?.maxCapacity || 0} SV
                  </AppText>
                </View>
              </View>
            </View>
            <View style={styles.pickerIconWrapper}>
              <Ionicons name="swap-vertical" size={20} color={tokens.brand.burgundy} />
            </View>
          </Pressable>
        </AppCard>

        {/* 4. Dynamic QR Presentation Box */}
        <AttendanceQrBox
          isSessionLoading={isSessionLoading}
          isSessionActive={isSessionActive}
          isQrLoading={isQrLoading}
          qrData={qrData}
          countdown={countdown}
          sectionCode={selectedClass?.sectionCode}
          testID="attendance-qr-box"
        />

        {/* 5. Real-time Attendance Statistics */}
        <AttendanceStatsCard
          attendedCount={attendedCount}
          totalEnrolled={totalEnrolled}
          testID="attendance-stats-card"
        />

        {/* 6. Session Lifecycle Action Button */}
        {isSessionActive ? (
          <Pressable
            style={[styles.actionButton, styles.actionButtonClose]}
            onPress={handleCloseSession}
            disabled={Boolean(closeSessionMutation?.isPending)}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
            accessibilityRole="button"
            accessibilityLabel="Chốt & Đóng phiên điểm danh"
            testID="btn-close-session"
          >
            {closeSessionMutation?.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="stop-circle-outline" size={20} color="#FFFFFF" />
                <AppText variant="bodyBold" color="inverse" style={styles.actionButtonText}>
                  Đóng phiên điểm danh
                </AppText>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.actionButton,
              styles.actionButtonStart,
              (!selectedClass || Boolean(startSessionMutation?.isPending)) && styles.actionButtonDisabled,
            ]}
            onPress={handleStartSession}
            disabled={Boolean(startSessionMutation?.isPending) || !selectedClass}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
            accessibilityRole="button"
            accessibilityLabel="Bắt đầu phiên điểm danh QR"
            testID="btn-start-session"
          >
            {startSessionMutation?.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="play-circle-outline" size={20} color="#FFFFFF" />
                <AppText variant="bodyBold" color="inverse" style={styles.actionButtonText}>
                  Bắt đầu phiên điểm danh QR
                </AppText>
              </>
            )}
          </Pressable>
        )}

        {/* 7. Live Attendee Roster Card */}
        <AttendeeRosterCard
          attendees={attendees}
          isSessionActive={isSessionActive}
          onRefresh={() => refetchSession()}
          isRefreshing={isSessionRefetching}
          testID="attendance-roster-card"
        />

        {/* 8. Class Selector Bottom-Sheet Modal */}
        <Modal visible={isClassPickerOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <AppText variant="h3" color="primary">
                  Chọn lớp học phần điểm danh
                </AppText>
                <Pressable
                  style={styles.modalCloseBtn}
                  onPress={() => setIsClassPickerOpen(false)}
                  android_ripple={{ color: tokens.brand.crimsonLight }}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng bộ chọn lớp"
                  testID="modal-close-button"
                >
                  <Ionicons name="close" size={22} color={tokens.text.secondary} />
                </Pressable>
              </View>

              <ScrollView style={styles.classListScroll} showsVerticalScrollIndicator={false}>
                {isClassesLoading ? (
                  <View style={styles.modalLoading}>
                    <ActivityIndicator size="small" color={tokens.brand.burgundy} />
                    <AppText variant="caption" color="muted">
                      Đang tải danh sách lớp...
                    </AppText>
                  </View>
                ) : classes.length === 0 ? (
                  <View style={styles.modalEmpty}>
                    <AppText variant="body" color="muted">
                      Không có lớp học phần nào.
                    </AppText>
                  </View>
                ) : (
                  classes.map((c) => {
                    const isSelected = selectedClass?.sectionId === c.sectionId;
                    return (
                      <Pressable
                        key={c.sectionId}
                        style={[
                          styles.classPickerItem,
                          isSelected && styles.classPickerItemActive,
                        ]}
                        onPress={() => {
                          setSelectedClass(c);
                          setIsClassPickerOpen(false);
                        }}
                        android_ripple={{ color: tokens.brand.crimsonLight }}
                        accessibilityRole="button"
                        accessibilityLabel={`Chọn lớp ${c.courseName}`}
                        testID={`class-picker-item-${c.sectionId}`}
                      >
                        <View style={styles.classPickerBadge}>
                          <AppText variant="captionBold" style={{ color: tokens.brand.burgundy }}>
                            {c.sectionCode}
                          </AppText>
                        </View>
                        <View style={styles.classPickerDetails}>
                          <AppText
                            variant="bodyBold"
                            color="primary"
                            numberOfLines={1}
                          >
                            {c.courseName}
                          </AppText>
                          <AppText variant="caption" color="muted" style={styles.classPickerSub}>
                            Phòng: {c.roomName} | Sĩ số: {c.currentEnrolled}/{c.maxCapacity}
                          </AppText>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={22} color={tokens.brand.burgundy} />
                        )}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.surface.canvas,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl + 20,
  },
  classSelectorCard: {
    borderRadius: tokens.radius.lg,
    marginBottom: tokens.spacing.md,
    padding: 0,
    overflow: 'hidden',
    backgroundColor: tokens.surface.card,
    borderLeftWidth: 4,
    borderLeftColor: tokens.brand.burgundy,
  },
  classSelectorPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacing.md,
    minHeight: 56, // Touch target >= 48dp
  },
  classSelectorLeft: {
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    marginBottom: 4,
  },
  className: {
    fontSize: 15,
    color: tokens.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: tokens.spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: tokens.border.strong,
  },
  pickerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.brand.crimsonLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    minHeight: 50, // Touch target >= 48dp
    borderRadius: tokens.radius.lg,
    marginBottom: tokens.spacing.lg,
    ...tokens.elevation.sm,
  },
  actionButtonStart: {
    backgroundColor: tokens.brand.burgundy,
  },
  actionButtonClose: {
    backgroundColor: tokens.semantic.error.button, // Red 600 (WCAG AA 4.83:1 on white)
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: tokens.surface.backdrop,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: tokens.surface.card,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    maxHeight: '75%',
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
  modalCloseBtn: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoading: {
    padding: tokens.spacing.xl,
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  modalEmpty: {
    padding: tokens.spacing.xl,
    alignItems: 'center',
  },
  classListScroll: {
    marginBottom: tokens.spacing.md,
  },
  classPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.xs,
    minHeight: 52, // Touch target >= 48dp
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.subtle,
  },
  classPickerItemActive: {
    backgroundColor: tokens.brand.crimsonLight,
    borderRadius: tokens.radius.md,
  },
  classPickerBadge: {
    backgroundColor: tokens.brand.crimsonLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.sm,
    marginRight: tokens.spacing.sm,
  },
  classPickerDetails: {
    flex: 1,
  },
  classPickerSub: {
    marginTop: 2,
    fontSize: 11,
  },
});
