/**
 * StudentQrScannerModal.tsx
 * Native Camera QR Scanner & Check-In Modal for Rikkei EduPortal Students (REDS v2.0).
 *
 * Capabilities:
 * 1. Live Camera QR scanning via expo-camera (CameraView) with target reticle and torch toggle.
 * 2. URL and Token parsing: extracts token from raw TOTP strings or deep-link query params.
 * 3. Anti-double-scan mutex lock to prevent concurrent submissions.
 * 4. Manual token input fallback for environments without camera access.
 * 5. Integrated mutation via useAttendanceCheckIn (POST /api/v1/attendance/check-in).
 * 6. Rich check-in receipt dialog (course, section, student name, verified timestamp).
 * 7. Graceful error handling for HTTP 409 (Already Checked In) and HTTP 400 (Expired / Invalid).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  ScrollView,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';
import { AppText } from '@/components/primitives/AppText';
import { AppButton } from '@/components/primitives/AppButton';
import { AppCard } from '@/components/primitives/AppCard';
import { AppBadge } from '@/components/feedback/AppBadge';
import {
  useAttendanceCheckIn,
  isDuplicateAttendanceError,
  isNetworkOrTimeoutError,
} from '../hooks/useAttendanceCheckIn';
import { AttendanceCheckInResponse } from '../types';

export {
  DUPLICATE_ATTENDANCE_PREFIX,
  isDuplicateAttendanceError,
  isNetworkOrTimeoutError,
} from '../hooks/useAttendanceCheckIn';

export interface StudentQrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (result: AttendanceCheckInResponse) => void;
  testID?: string;
  /** Optional initial result for UI testing / preview */
  initialResult?: AttendanceCheckInResponse | null;
  /** Optional initial duplicate notice for UI testing / preview */
  initialDuplicateNotice?: { message: string } | null;
  /** Optional initial error message for UI testing / preview */
  initialErrorMessage?: string | null;
}

/**
 * Parses raw scanned data, extracting token from URLs if present
 */
export const extractQrToken = (rawText: string): string => {
  let cleaned = rawText.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim();
  }

  const queryParamPatterns = ['checkInToken=', 'token=', 'qrToken='];
  for (const pattern of queryParamPatterns) {
    const idx = cleaned.indexOf(pattern);
    if (idx !== -1) {
      const rest = cleaned.substring(idx + pattern.length);
      const endIdx = rest.indexOf('&');
      return endIdx !== -1 ? rest.substring(0, endIdx) : rest;
    }
  }

  return cleaned;
};

export const StudentQrScannerModalContent: React.FC<StudentQrScannerModalProps> = ({
  visible,
  onClose,
  onSuccess,
  testID = 'student-qr-scanner-modal',
  initialResult,
  initialDuplicateNotice,
  initialErrorMessage,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');

  const checkIn = useAttendanceCheckIn();

  const [checkInResult, setCheckInResult] = useState<AttendanceCheckInResponse | null>(
    initialResult ?? (checkIn.state.status === 'success' ? checkIn.state.result : null)
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialErrorMessage ?? (checkIn.state.status === 'error' ? checkIn.state.errorMessage : null)
  );
  const [isDuplicate, setIsDuplicate] = useState(
    Boolean(initialDuplicateNotice || (checkIn.state.status === 'duplicate' && checkIn.state.duplicateNotice))
  );
  const [duplicateNotice, setDuplicateNotice] = useState<{ message: string } | null>(
    initialDuplicateNotice ?? (checkIn.state.status === 'duplicate' ? checkIn.state.duplicateNotice : null)
  );

  const isLockedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset state when modal is opened or closed, restoring session if active
  useEffect(() => {
    if (visible) {
      isLockedRef.current = false;
      setTorch(false);
      setManualCode('');
      setActiveTab('camera');

      // Priority 1: Direct test props
      if (initialResult || initialDuplicateNotice || initialErrorMessage) {
        setCheckInResult(initialResult ?? null);
        setErrorMessage(initialErrorMessage ?? null);
        setIsDuplicate(Boolean(initialDuplicateNotice));
        setDuplicateNotice(initialDuplicateNotice ?? null);
        return;
      }

      // Priority 2: Restore from shared background session state
      const session = checkIn.state;
      if (session.status === 'success' && session.result) {
        setCheckInResult(session.result);
        setIsDuplicate(false);
        setDuplicateNotice(null);
        setErrorMessage(null);
      } else if (session.status === 'duplicate' && session.duplicateNotice) {
        setCheckInResult(null);
        setIsDuplicate(true);
        setDuplicateNotice(session.duplicateNotice);
        setErrorMessage(null);
      } else if (session.status === 'error' && session.errorMessage) {
        setCheckInResult(null);
        setIsDuplicate(false);
        setDuplicateNotice(null);
        setErrorMessage(session.errorMessage);
      } else if (session.status === 'idle') {
        setCheckInResult(null);
        setErrorMessage(null);
        setIsDuplicate(false);
        setDuplicateNotice(null);
      }
    } else {
      isLockedRef.current = false;
      setTorch(false);
      setCheckInResult(null);
      setErrorMessage(null);
      setIsDuplicate(false);
      setDuplicateNotice(null);
      setManualCode('');
    }
  }, [visible, initialResult, initialErrorMessage, initialDuplicateNotice, checkIn.state]);

  // Request permission automatically if undetermined on open
  useEffect(() => {
    if (visible && permission && permission.status === 'undetermined') {
      requestPermission().catch(() => {});
    }
  }, [visible, permission, requestPermission]);

  // Execute check-in submission
  const executeCheckIn = useCallback(
    async (token: string) => {
      const parsedToken = extractQrToken(token);
      if (!parsedToken) {
        if (isMountedRef.current) {
          setErrorMessage('Mã QR điểm danh không hợp lệ hoặc rỗng.');
        }
        isLockedRef.current = false;
        return;
      }

      if (isMountedRef.current) {
        setErrorMessage(null);
        setIsDuplicate(false);
        setDuplicateNotice(null);
      }

      try {
        const response = await checkIn.submitCheckIn(parsedToken, {
          onSuccess: (res) => {
            if (isMountedRef.current) {
              setCheckInResult(res);
              setIsDuplicate(false);
              setDuplicateNotice(null);
              setErrorMessage(null);
            }
            onSuccess?.(res);
          },
        });

        if (response && isMountedRef.current) {
          setCheckInResult(response);
          setIsDuplicate(false);
          setDuplicateNotice(null);
          setErrorMessage(null);
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Không thể xác thực mã điểm danh. Vui lòng thử lại.';

        if (!isMountedRef.current) {
          return;
        }

        if (isDuplicateAttendanceError(err)) {
          setIsDuplicate(true);
          setDuplicateNotice({ message: msg });
          setErrorMessage(null);
          // Backend returns data: null on 409. Never fake receipt data.
          setCheckInResult(null);
        } else if (isNetworkOrTimeoutError(err)) {
          setIsDuplicate(false);
          setDuplicateNotice(null);
          setErrorMessage(null);
          setCheckInResult(null);
        } else {
          setIsDuplicate(false);
          setDuplicateNotice(null);
          setErrorMessage(msg);
          setCheckInResult(null);
        }
      } finally {
        isLockedRef.current = false;
      }
    },
    [checkIn, onSuccess]
  );

  // Handle scanned barcode from camera
  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (isLockedRef.current || checkIn.isPending || checkInResult) {
        return;
      }

      if (!data || typeof data !== 'string') {
        return;
      }

      // Lock scanner to prevent duplicate concurrent API requests
      isLockedRef.current = true;
      executeCheckIn(data);
    },
    [checkIn.isPending, checkInResult, executeCheckIn]
  );

  // Handle manual code submission
  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      setErrorMessage('Vui lòng nhập mã token điểm danh.');
      return;
    }
    isLockedRef.current = true;
    executeCheckIn(manualCode);
  };

  // Reset scanner to scan another code
  const handleRetryScan = () => {
    isLockedRef.current = false;
    setErrorMessage(null);
    setIsDuplicate(false);
    setDuplicateNotice(null);
    setCheckInResult(null);
    setManualCode('');
    checkIn.resetState();
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {}
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      testID={testID}
    >
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            testID="student-qr-close-button"
            accessibilityLabel="Đóng máy quét"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <AppText variant="bodyBold" style={styles.headerTitle}>
            Quét mã điểm danh
          </AppText>

          {activeTab === 'camera' && !checkInResult && !isDuplicate ? (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setTorch((prev) => !prev)}
              testID="student-qr-torch-button"
              accessibilityLabel="Bật tắt đèn flash"
            >
              <Ionicons
                name={torch ? 'flash' : 'flash-outline'}
                size={22}
                color={torch ? '#FBBF24' : '#FFFFFF'}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButtonPlaceholder} />
          )}
        </View>

        {/* Tab Switcher (Camera vs Nhập thủ công) */}
        {!checkInResult && !isDuplicate && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'camera' && styles.activeTabButton]}
              onPress={() => {
                setActiveTab('camera');
                isLockedRef.current = false;
                setErrorMessage(null);
              }}
              testID="student-qr-tab-camera"
            >
              <Ionicons
                name="camera"
                size={16}
                color={activeTab === 'camera' ? '#FFFFFF' : '#94A3B8'}
              />
              <AppText
                variant="captionBold"
                style={[styles.tabText, activeTab === 'camera' && styles.activeTabText]}
              >
                Máy ảnh
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'manual' && styles.activeTabButton]}
              onPress={() => {
                setActiveTab('manual');
                setErrorMessage(null);
              }}
              testID="student-qr-tab-manual"
            >
              <Ionicons
                name="keypad"
                size={16}
                color={activeTab === 'manual' ? '#FFFFFF' : '#94A3B8'}
              />
              <AppText
                variant="captionBold"
                style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}
              >
                Nhập mã thủ công
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Body Content */}
        {checkInResult || isDuplicate ? (
          /* Check-In Success or Duplicate Receipt */
          <ScrollView contentContainerStyle={styles.resultContainer} testID="student-qr-result-view">
            <AppCard
              variant="elevated"
              style={[
                styles.receiptCard,
                isDuplicate ? styles.receiptCardWarning : styles.receiptCardSuccess,
              ]}
            >
              {/* Icon Status */}
              <View
                style={[
                  styles.resultIconWrapper,
                  { backgroundColor: isDuplicate ? '#FEF3C7' : '#DCFCE7' },
                ]}
              >
                <Ionicons
                  name={isDuplicate ? 'alert-circle' : 'checkmark-circle'}
                  size={48}
                  color={isDuplicate ? '#D97706' : '#16A34A'}
                />
              </View>

              <AppText variant="h3" style={styles.resultTitle}>
                {isDuplicate ? 'Đã điểm danh trước đó' : 'Điểm danh thành công!'}
              </AppText>

              <AppText variant="caption" color="muted" style={styles.resultSubtitle}>
                {isDuplicate
                  ? (duplicateNotice?.message || 'Bạn đã điểm danh thành công phiên học này rồi.')
                  : (checkInResult?.message || 'Thông tin điểm danh của bạn đã được ghi nhận trên hệ thống.')}
              </AppText>

              {/* Receipt Details Box: Only rendered when checkInResult exists and NOT duplicate */}
              {!isDuplicate && checkInResult ? (
                <View style={styles.detailsBox}>
                  <View style={styles.detailRow}>
                    <AppText variant="caption" color="muted">
                      Môn học:
                    </AppText>
                    <AppText variant="captionBold" color="primary" numberOfLines={1}>
                      {checkInResult.courseName || 'Học phần'}
                    </AppText>
                  </View>

                  {checkInResult.sectionCode ? (
                    <View style={styles.detailRow}>
                      <AppText variant="caption" color="muted">
                        Mã lớp:
                      </AppText>
                      <AppBadge label={checkInResult.sectionCode} variant="info" size="sm" />
                    </View>
                  ) : null}

                  {checkInResult.studentName ? (
                    <View style={styles.detailRow}>
                      <AppText variant="caption" color="muted">
                        Sinh viên:
                      </AppText>
                      <AppText variant="captionBold" color="primary">
                        {checkInResult.studentName} ({checkInResult.studentCode})
                      </AppText>
                    </View>
                  ) : null}

                  <View style={styles.detailRow}>
                    <AppText variant="caption" color="muted">
                      Thời gian:
                    </AppText>
                    <AppText variant="captionBold" color="primary">
                      {checkInResult.checkedInAt || checkInResult.checkInTime || 'Vừa xong'}
                    </AppText>
                  </View>
                </View>
              ) : null}

              {/* Duplicate Attendance Callout: Rendered when isDuplicate is true */}
              {isDuplicate ? (
                <View style={styles.duplicateNoticeBox} testID="duplicate-attendance-callout">
                  <Ionicons name="information-circle" size={20} color="#D97706" />
                  <AppText variant="caption" style={styles.duplicateNoticeText}>
                    Hệ thống đã ghi nhận chuyên cần của bạn trong phiên học này. Bạn không cần quét lại mã.
                  </AppText>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.resultActions}>
                <AppButton
                  title="Hoàn tất"
                  variant="primary"
                  size="md"
                  onPress={onClose}
                  testID="student-qr-finish-button"
                  style={styles.actionBtn}
                />
                <AppButton
                  title="Quét lại"
                  variant="outline"
                  size="md"
                  onPress={handleRetryScan}
                  testID="student-qr-scan-again-button"
                  style={styles.actionBtn}
                />
              </View>
            </AppCard>
          </ScrollView>
        ) : activeTab === 'manual' ? (
          /* Tab: Manual Code Entry Form */
          <ScrollView contentContainerStyle={styles.manualContainer} testID="student-qr-manual-view">
            <AppCard variant="elevated" style={styles.manualCard}>
              <View style={styles.manualHeader}>
                <Ionicons name="keypad-outline" size={28} color={tokens.brand.burgundy} />
                <AppText variant="bodyBold" style={styles.manualTitle}>
                  Nhập mã Token điểm danh
                </AppText>
                <AppText variant="caption" color="muted" style={styles.manualDesc}>
                  Dán hoặc nhập mã Token TOTP hiển thị trên máy chiếu của giảng viên (VD: 12.4.11962500.a3f89e...).
                </AppText>
              </View>

              <TextInput
                style={styles.manualInput}
                multiline
                numberOfLines={3}
                placeholder="Nhập hoặc dán chuỗi token điểm danh..."
                placeholderTextColor="#94A3B8"
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="none"
                autoCorrect={false}
                testID="student-qr-manual-input"
              />

              <AppText variant="caption" color="muted" style={styles.totpHint}>
                💡 Mã QR tự động xoay vòng mỗi 15 giây (dung sai ±30s). Vui lòng gửi ngay khi lấy mã.
              </AppText>

              {errorMessage ? (
                <View style={styles.errorBanner} testID="student-qr-error-banner">
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <AppText variant="caption" style={styles.errorText}>
                    {errorMessage}
                  </AppText>
                </View>
              ) : null}

              <View style={styles.manualActions}>
                <AppButton
                  title={checkIn.isPending ? 'Đang xác thực...' : 'Điểm danh ngay'}
                  variant="primary"
                  size="lg"
                  onPress={handleManualSubmit}
                  isLoading={checkIn.isPending}
                  disabled={checkIn.isPending || !manualCode.trim()}
                  testID="student-qr-manual-submit-button"
                />
              </View>
            </AppCard>
          </ScrollView>
        ) : (
          /* Tab: Camera Viewfinder */
          <View style={styles.cameraWrapper}>
            {!permission ? (
              <View style={styles.centerContent} testID="student-qr-checking-permission">
                <ActivityIndicator size="large" color="#FFFFFF" />
                <AppText variant="caption" style={styles.whiteStateText}>
                  Đang kiểm tra quyền máy ảnh...
                </AppText>
              </View>
            ) : !permission.granted ? (
              <View style={styles.centerContent} testID="student-qr-permission-denied">
                <Ionicons name="camera-outline" size={56} color="#EF4444" />
                <AppText variant="h3" style={styles.whiteStateText}>
                  Cần quyền truy cập máy ảnh
                </AppText>
                <AppText variant="caption" style={styles.permissionDesc}>
                  Ứng dụng cần quyền sử dụng máy ảnh để quét mã QR điểm danh lớp học trực tiếp.
                </AppText>

                {permission.canAskAgain ? (
                  <TouchableOpacity
                    style={styles.grantPermissionBtn}
                    onPress={requestPermission}
                    testID="student-qr-grant-permission-button"
                  >
                    <AppText variant="bodyBold" style={styles.btnText}>
                      Cấp quyền máy ảnh
                    </AppText>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.grantPermissionBtn, styles.settingsBtn]}
                    onPress={handleOpenSettings}
                    testID="student-qr-open-settings-button"
                  >
                    <AppText variant="bodyBold" style={styles.btnText}>
                      Mở Cài đặt thiết bị
                    </AppText>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.switchToManualBtn}
                  onPress={() => setActiveTab('manual')}
                >
                  <AppText variant="captionBold" style={styles.switchToManualText}>
                    Hoặc nhập mã Token thủ công
                  </AppText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cameraContainer}>
                {/* Real expo-camera View */}
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  enableTorch={torch}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={handleBarcodeScanned}
                  testID="student-camera-view"
                />

                {/* Dark Viewfinder Reticle Overlay */}
                <View style={styles.reticleOverlay} pointerEvents="none">
                  <View style={styles.reticleTop} />
                  <View style={styles.reticleMiddle}>
                    <View style={styles.reticleSide} />
                    <View style={styles.viewfinderBox} testID="student-qr-viewfinder">
                      {/* Corner Accents */}
                      <View style={[styles.corner, styles.cornerTL]} />
                      <View style={[styles.corner, styles.cornerTR]} />
                      <View style={[styles.corner, styles.cornerBL]} />
                      <View style={[styles.corner, styles.cornerBR]} />
                    </View>
                    <View style={styles.reticleSide} />
                  </View>
                  <View style={styles.reticleBottom}>
                    <AppText variant="captionBold" style={styles.cameraHint}>
                      Đặt mã QR điểm danh vào trong khung vuông
                    </AppText>
                    <View style={styles.statusPill}>
                      <View style={styles.pulseDot} />
                      <AppText variant="caption" style={styles.statusPillText}>
                        Máy ảnh đang sẵn sàng
                      </AppText>
                    </View>
                  </View>
                </View>

                {/* Processing Overlay during API submission */}
                {checkIn.isPending && (
                  <View style={styles.processingOverlay} testID="student-qr-processing">
                    <ActivityIndicator size="large" color="#34D399" />
                    <AppText variant="bodyBold" style={styles.processingText}>
                      Đang xác thực mã QR & thời gian TOTP...
                    </AppText>
                  </View>
                )}

                {/* Unknown Result Banner over Camera / View */}
                {checkIn.state.status === 'unknown_result' && !checkIn.isPending && (
                  <View style={styles.unknownResultBanner} testID="student-qr-unknown-result">
                    <Ionicons name="help-circle" size={24} color="#D97706" />
                    <View style={styles.cameraErrorCol}>
                      <AppText variant="captionBold" style={styles.unknownResultTitle}>
                        Kết quả điểm danh chưa xác nhận
                      </AppText>
                      <AppText variant="caption" style={styles.unknownResultText}>
                        {checkIn.state.errorMessage ||
                          'Mất kết nối hoặc quá thời gian chờ. Hệ thống có thể đã ghi nhận điểm danh. Vui lòng kiểm tra lịch sử điểm danh trước khi quét lại.'}
                      </AppText>
                      <TouchableOpacity
                        onPress={handleRetryScan}
                        style={styles.retryBtn}
                        testID="student-qr-retry-unknown-button"
                      >
                        <AppText variant="captionBold" style={styles.retryBtnText}>
                          Đã kiểm tra, quét lại mã
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Error Banner over Camera with Retry */}
                {errorMessage && !checkIn.isPending && checkIn.state.status !== 'unknown_result' && (
                  <View style={styles.cameraErrorBanner} testID="student-qr-camera-error">
                    <Ionicons name="alert-circle" size={20} color="#F87171" />
                    <View style={styles.cameraErrorCol}>
                      <AppText variant="caption" style={styles.cameraErrorText}>
                        {errorMessage}
                      </AppText>
                      <TouchableOpacity
                        onPress={handleRetryScan}
                        style={styles.retryBtn}
                        testID="student-qr-retry-scan-button"
                      >
                        <AppText variant="captionBold" style={styles.retryBtnText}>
                          Quét lại mã mới
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

export const StudentQrScannerModal: React.FC<StudentQrScannerModalProps> = (props) => {
  if (!props.visible) {
    return null;
  }
  return <StudentQrScannerModalContent {...props} />;
};

const VIEWFINDER_SIZE = 250;
const CORNER_SIZE = 24;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    height: Platform.OS === 'ios' ? 90 : 64,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
    paddingHorizontal: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: tokens.brand.burgundy,
  },
  tabText: {
    color: '#94A3B8',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  cameraWrapper: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.xl,
  },
  whiteStateText: {
    color: '#FFFFFF',
    marginTop: tokens.spacing.md,
    textAlign: 'center',
  },
  permissionDesc: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: tokens.spacing.xs,
    lineHeight: 18,
  },
  grantPermissionBtn: {
    backgroundColor: tokens.brand.burgundy,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: tokens.radius.lg,
    marginTop: tokens.spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  settingsBtn: {
    backgroundColor: '#2563EB',
  },
  btnText: {
    color: '#FFFFFF',
  },
  switchToManualBtn: {
    marginTop: tokens.spacing.md,
    padding: tokens.spacing.xs,
  },
  switchToManualText: {
    color: '#38BDF8',
  },
  reticleOverlay: {
    ...StyleSheet.absoluteFill,
  },
  reticleTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  reticleMiddle: {
    height: VIEWFINDER_SIZE,
    flexDirection: 'row',
  },
  reticleSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  viewfinderBox: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#38BDF8',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  reticleBottom: {
    flex: 1.2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    paddingTop: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.lg,
  },
  cameraHint: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 13,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: tokens.spacing.sm,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  statusPillText: {
    color: '#E2E8F0',
    fontSize: 11,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    gap: tokens.spacing.sm,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  cameraErrorBanner: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
    zIndex: 25,
  },
  unknownResultBanner: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
    zIndex: 25,
  },
  unknownResultTitle: {
    color: '#92400E',
    marginBottom: 2,
  },
  unknownResultText: {
    color: '#78350F',
    lineHeight: 18,
  },
  cameraErrorCol: {
    flex: 1,
  },
  cameraErrorText: {
    color: '#F87171',
  },
  retryBtn: {
    marginTop: 6,
  },
  retryBtnText: {
    color: '#38BDF8',
    textDecorationLine: 'underline',
  },
  // Result / Receipt styles
  resultContainer: {
    flexGrow: 1,
    padding: tokens.spacing.lg,
    justifyContent: 'center',
  },
  receiptCard: {
    padding: tokens.spacing.xl,
    borderRadius: tokens.radius.xl,
    alignItems: 'center',
  },
  receiptCardSuccess: {
    borderTopWidth: 4,
    borderTopColor: '#16A34A',
  },
  receiptCardWarning: {
    borderTopWidth: 4,
    borderTopColor: '#D97706',
  },
  resultIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  resultTitle: {
    textAlign: 'center',
    marginBottom: tokens.spacing.xs,
  },
  resultSubtitle: {
    textAlign: 'center',
    marginBottom: tokens.spacing.lg,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: tokens.surface.canvas,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  duplicateNoticeBox: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  duplicateNoticeText: {
    color: '#92400E',
    flex: 1,
    lineHeight: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultActions: {
    width: '100%',
    gap: tokens.spacing.sm,
  },
  actionBtn: {
    width: '100%',
  },
  // Manual Tab styles
  manualContainer: {
    flexGrow: 1,
    padding: tokens.spacing.lg,
  },
  manualCard: {
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.xl,
  },
  manualHeader: {
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  manualTitle: {
    marginTop: tokens.spacing.xs,
    fontSize: 16,
  },
  manualDesc: {
    textAlign: 'center',
    marginTop: tokens.spacing.xs,
    lineHeight: 18,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: tokens.text.primary,
    backgroundColor: tokens.surface.canvas,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  totpHint: {
    marginTop: tokens.spacing.xs,
    marginBottom: tokens.spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  errorText: {
    color: '#DC2626',
    flex: 1,
  },
  manualActions: {
    marginTop: tokens.spacing.sm,
  },
});

export default StudentQrScannerModal;
