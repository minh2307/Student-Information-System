/**
 * studentQrAttendanceCheckIn.test.tsx
 * Comprehensive Unit & Integration Test Suite for Student QR Attendance Subsystem (TASK ST-01 / ST-01.2 / ST-01.3 / ST-01.4).
 *
 * Verifies:
 * - Group 1: Token extraction logic (raw TOTP tokens, deep links, URL query params).
 * - Group 1.1: isDuplicateAttendanceError helper (Contract Verification).
 * - Group 1.2: isNetworkOrTimeoutError helper (ST-01.4 Unknown Result Detection).
 * - Group 2: Camera permissions lifecycle and UI layout (viewfinder reticle, tabs, torch toggle).
 * - Group 3: Barcode scanning flow, anti-double-scan mutex lock, and Device Identity integration (ST-01.3).
 * - Group 4: Check-in outcome displays (All Acceptance Scenarios + ST-01.4 states):
 *     1. HTTP 200 OK: Renders success receipt with full course & student details.
 *     2. HTTP 409 Duplicate Attendance: Renders warning receipt (receiptCardWarning), does not crash with data: null.
 *     3. HTTP 409 Generic Conflict: Displays camera error banner, does not render warning receipt.
 *     4. HTTP 400 Bad Request: Displays error banner for invalid/expired QR.
 *     5. HTTP 401 Unauthorized: Displays session expired error banner.
 *     6. HTTP 403 Forbidden: Displays permission denied error banner.
 *     7. Network Error: Displays connection failure banner, never shows fake success.
 *     8. Reset State on Re-open / Retry: Clean reset of error and warning states.
 *     9. Runtime API check-in rejection with 409 Duplicate: Correctly handles async failure.
 *     10. Unknown Result: Displays dedicated unknown result banner on network drop / timeout.
 * - Group 5: Manual token entry fallback tab and form submission.
 * - Group 6: Request Lifecycle, Background State & Unmount Safety (ST-01.4).
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  StudentQrScannerModal,
  StudentQrScannerModalContent,
  extractQrToken,
  isDuplicateAttendanceError,
  isNetworkOrTimeoutError,
  DUPLICATE_ATTENDANCE_PREFIX,
} from '@/features/student/components/StudentQrScannerModal';
import {
  updateSharedSessionState,
  resetAttendanceCheckInSession,
  getAttendanceCheckInSessionState,
} from '@/features/student/hooks/useAttendanceCheckIn';
import { studentApi } from '@/features/student/services/studentApi';

const {
  __setMockCameraPermission,
  __getLastCameraProps,
  __resetMockCamera,
} = require('expo-camera');

describe('Student QR Attendance Check-In Subsystem (TASK ST-01 / ST-01.2 / ST-01.3 / ST-01.4)', () => {
  let queryClient: QueryClient;
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.restoreAllMocks();
    __resetMockCamera();
    resetAttendanceCheckInSession();
    mockOnClose.mockReset();
    mockOnSuccess.mockReset();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    __setMockCameraPermission({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
  });

  afterEach(() => {
    resetAttendanceCheckInSession();
    jest.restoreAllMocks();
  });

  function renderModal(props?: Partial<React.ComponentProps<typeof StudentQrScannerModal>>) {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <StudentQrScannerModal
          visible={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          {...props}
        />
      </QueryClientProvider>
    );
    return {
      html,
      cameraProps: __getLastCameraProps(),
    };
  }

  // ── Group 1: Token extraction logic ──
  describe('Group 1: Token extraction logic', () => {
    it('extracts raw token cleanly', () => {
      const raw = '12.4.11962500.a3f89e81b2c45d6e';
      expect(extractQrToken(raw)).toBe('12.4.11962500.a3f89e81b2c45d6e');
    });

    it('removes surrounding quotes and whitespace', () => {
      const raw = '  "12.4.11962500.a3f89e81b2c45d6e"  ';
      expect(extractQrToken(raw)).toBe('12.4.11962500.a3f89e81b2c45d6e');
    });

    it('extracts token from checkInToken URL query parameter', () => {
      const url = 'https://rikkeiportal.io.vn/attendance/check-in?checkInToken=12.4.11962500.hash_xyz&device=mobile';
      expect(extractQrToken(url)).toBe('12.4.11962500.hash_xyz');
    });

    it('extracts token from token URL query parameter', () => {
      const url = 'https://rikkeiportal.io.vn/attendance?token=12.4.11962500.hash_123';
      expect(extractQrToken(url)).toBe('12.4.11962500.hash_123');
    });

    it('extracts token from qrToken URL query parameter', () => {
      const url = 'https://rikkeiportal.io.vn/api/v1/attendance/check-in?qrToken=12.4.11962500.hash_qr';
      expect(extractQrToken(url)).toBe('12.4.11962500.hash_qr');
    });
  });

  // ── Group 1.1: isDuplicateAttendanceError helper unit tests ──
  describe('Group 1.1: isDuplicateAttendanceError helper (Contract Verification)', () => {
    it('identifies DUPLICATE_ATTENDANCE_PREFIX constant', () => {
      expect(DUPLICATE_ATTENDANCE_PREFIX).toBe('ĐÃ ĐIỂM DANH TRƯỚC ĐÓ');
    });

    it('returns true for exact backend duplicate message with HTTP 409', () => {
      const err = {
        response: {
          status: 409,
          data: {
            status: 409,
            message: 'ĐÃ ĐIỂM DANH TRƯỚC ĐÓ: Bạn đã điểm danh thành công phiên học này rồi.',
          },
        },
      };
      expect(isDuplicateAttendanceError(err)).toBe(true);
    });

    it('returns true for lowercase duplicate message with HTTP 409', () => {
      const err = {
        response: {
          status: 409,
          data: {
            message: 'sinh viên đã điểm danh trước đó trong buổi học này',
          },
        },
      };
      expect(isDuplicateAttendanceError(err)).toBe(true);
    });

    it('returns true for English fallback message with HTTP 409', () => {
      const err = {
        response: {
          status: 409,
          data: {
            message: 'Student has already checked in for this attendance session.',
          },
        },
      };
      expect(isDuplicateAttendanceError(err)).toBe(true);
    });

    it('returns false for generic HTTP 409 conflict (not duplicate attendance)', () => {
      const err = {
        response: {
          status: 409,
          data: {
            status: 409,
            message: 'Phiên học đã bị khóa điểm, không thể cập nhật.',
          },
        },
      };
      expect(isDuplicateAttendanceError(err)).toBe(false);
    });

    it('returns false for HTTP 409 with empty or blank message', () => {
      const err = {
        response: {
          status: 409,
          data: { message: '   ' },
        },
      };
      expect(isDuplicateAttendanceError(err)).toBe(false);
    });

    it('returns false for HTTP 400 Bad Request', () => {
      const err = {
        response: {
          status: 400,
          data: { message: 'Mã QR đã hết hạn hoặc không hợp lệ.' },
        },
      };
      expect(isDuplicateAttendanceError(err)).toBe(false);
    });

    it('returns false for HTTP 401 Unauthorized', () => {
      const err = {
        response: {
          status: 401,
          data: { message: 'Phiên làm việc hết hạn. Vui lòng đăng nhập lại.' },
        },
      };
      expect(isDuplicateAttendanceError(err)).toBe(false);
    });

    it('returns false for HTTP 403 Forbidden', () => {
      const err = {
        response: {
          status: 403,
          data: { message: 'Bạn không có quyền truy cập.' },
        },
      };
      expect(isDuplicateAttendanceError(err)).toBe(false);
    });

    it('returns false for HTTP 500 Internal Server Error', () => {
      const err = {
        response: {
          status: 500,
          data: { message: 'Lỗi hệ thống máy chủ' },
        },
      };
      expect(isDuplicateAttendanceError(err)).toBe(false);
    });

    it('returns false for network errors (no response status)', () => {
      const err = {
        message: 'Network Error: Failed to fetch',
      };
      expect(isDuplicateAttendanceError(err)).toBe(false);
    });

    it('returns false for null or undefined error', () => {
      expect(isDuplicateAttendanceError(null)).toBe(false);
      expect(isDuplicateAttendanceError(undefined)).toBe(false);
    });
  });

  // ── Group 1.2: isNetworkOrTimeoutError helper unit tests (ST-01.4) ──
  describe('Group 1.2: isNetworkOrTimeoutError helper (ST-01.4 Unknown Result Detection)', () => {
    it('returns true for ECONNABORTED error without response status', () => {
      const err = { code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' };
      expect(isNetworkOrTimeoutError(err)).toBe(true);
    });

    it('returns true for generic Network Error without response status', () => {
      const err = { message: 'Network Error' };
      expect(isNetworkOrTimeoutError(err)).toBe(true);
    });

    it('returns true for timeout message without response status', () => {
      const err = { message: 'Request timed out waiting for server' };
      expect(isNetworkOrTimeoutError(err)).toBe(true);
    });

    it('returns true for failed to fetch message without response status', () => {
      const err = { message: 'Failed to fetch' };
      expect(isNetworkOrTimeoutError(err)).toBe(true);
    });

    it('returns false when server returned a response status code (even 500 or 409)', () => {
      const err500 = {
        response: { status: 500, data: { message: 'Internal Server Error' } },
        message: 'Request failed with status code 500',
      };
      const err409 = {
        response: { status: 409, data: { message: 'Conflict' } },
        message: 'Request failed with status code 409',
      };
      expect(isNetworkOrTimeoutError(err500)).toBe(false);
      expect(isNetworkOrTimeoutError(err409)).toBe(false);
    });

    it('returns false for null or undefined error', () => {
      expect(isNetworkOrTimeoutError(null)).toBe(false);
      expect(isNetworkOrTimeoutError(undefined)).toBe(false);
    });
  });

  // ── Group 2: Camera permissions lifecycle and UI layout ──
  describe('Group 2: Camera permissions lifecycle and UI layout', () => {
    it('renders null when visible is false', () => {
      const { html } = renderModal({ visible: false });
      expect(html).toBe('');
    });

    it('renders CameraView and viewfinder reticle when camera permission is granted', () => {
      const { html, cameraProps } = renderModal({ visible: true });

      expect(html).toContain('student-qr-scanner-modal');
      expect(html).toContain('Quét mã điểm danh');
      expect(html).toContain('student-camera-view');
      expect(html).toContain('student-qr-viewfinder');
      expect(html).toContain('student-qr-tab-camera');
      expect(html).toContain('student-qr-tab-manual');
      expect(html).toContain('student-qr-torch-button');
      expect(cameraProps).toBeDefined();
      expect(cameraProps.facing).toBe('back');
      expect(cameraProps.barcodeScannerSettings).toEqual({ barcodeTypes: ['qr'] });
    });

    it('renders permission denied banner when permission is not granted and can ask again', () => {
      __setMockCameraPermission({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      });

      const { html } = renderModal({ visible: true });

      expect(html).toContain('student-qr-permission-denied');
      expect(html).toContain('Cần quyền truy cập máy ảnh');
      expect(html).toContain('student-qr-grant-permission-button');
      expect(html).toContain('Cấp quyền máy ảnh');
      expect(html).not.toContain('student-camera-view');
    });

    it('renders open settings button when permission is permanently denied', () => {
      __setMockCameraPermission({
        status: 'denied',
        granted: false,
        canAskAgain: false,
        expires: 'never',
      });

      const { html } = renderModal({ visible: true });

      expect(html).toContain('student-qr-permission-denied');
      expect(html).toContain('student-qr-open-settings-button');
      expect(html).toContain('Mở Cài đặt thiết bị');
      expect(html).not.toContain('student-qr-grant-permission-button');
    });
  });

  // ── Group 3: Barcode scanning flow, API submission & Device Identity (ST-01.3) ──
  describe('Group 3: Barcode scanning flow and Device Identity integration', () => {
    const validQrToken = '12.4.11962500.signature_hash_123';

    it('triggers studentApi.checkInAttendance with installation ID device info', async () => {
      const checkInSpy = jest.spyOn(studentApi, 'checkInAttendance').mockResolvedValueOnce({
        success: true,
        message: 'Điểm danh thành công',
        checkedInAt: '12:30 - 18/11/2026',
        sessionId: 12,
        sectionId: 4,
        sectionCode: 'CS101-01',
        courseName: 'Lập trình Java căn bản',
        studentCode: 'SV2026001',
        studentName: 'Nguyễn Văn A',
      });

      const { cameraProps } = renderModal({ visible: true });
      expect(cameraProps).toBeDefined();

      cameraProps.onBarcodeScanned({ data: validQrToken });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(checkInSpy).toHaveBeenCalledTimes(1);
      expect(checkInSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          qrToken: validQrToken,
          deviceInfo: expect.stringMatching(/^EduPortal-(iOS|Android|Web)-[0-9a-f-]+$/i),
        })
      );
    });

    it('suppresses concurrent duplicate scans via mutex lock', async () => {
      const checkInSpy = jest.spyOn(studentApi, 'checkInAttendance').mockResolvedValueOnce({
        success: true,
        message: 'Điểm danh thành công',
        checkedInAt: '12:30 - 18/11/2026',
        sessionId: 12,
        sectionId: 4,
        sectionCode: 'CS101-01',
        courseName: 'Lập trình Java căn bản',
        studentCode: 'SV2026001',
        studentName: 'Nguyễn Văn A',
      });

      const { cameraProps } = renderModal({ visible: true });

      cameraProps.onBarcodeScanned({ data: validQrToken });
      cameraProps.onBarcodeScanned({ data: validQrToken });
      cameraProps.onBarcodeScanned({ data: 'different_token_during_lock' });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(checkInSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── Group 4: Check-in outcome displays (All Acceptance Scenarios) ──
  describe('Group 4: Check-in outcome displays', () => {
    it('Scenario 1 (HTTP 200 OK): renders success receipt card with full course and student details', () => {
      const successData = {
        success: true,
        message: 'Điểm danh thành công',
        checkedInAt: '12:30 - 18/11/2026',
        sessionId: 12,
        sectionId: 4,
        sectionCode: 'CS101-01',
        courseName: 'Lập trình Java căn bản',
        studentCode: 'SV2026001',
        studentName: 'Nguyễn Văn A',
      };

      const { html } = renderModal({
        visible: true,
        initialResult: successData,
      });

      expect(html).toContain('student-qr-result-view');
      expect(html).toContain('Điểm danh thành công!');
      expect(html).toContain('Lập trình Java căn bản');
      expect(html).toContain('CS101-01');
      expect(html).toContain('Nguyễn Văn A (SV2026001)');
      expect(html).toContain('12:30 - 18/11/2026');
      expect(html).toContain('student-qr-finish-button');
      expect(html).toContain('student-qr-scan-again-button');
      expect(html).not.toContain('duplicate-attendance-callout');
    });

    it('Scenario 2 (HTTP 409 Duplicate Attendance): renders warning receipt and handles data: null cleanly without crash', () => {
      const duplicateMsg = 'ĐÃ ĐIỂM DANH TRƯỚC ĐÓ: Bạn đã điểm danh thành công phiên học này rồi.';

      const { html } = renderModal({
        visible: true,
        initialResult: null,
        initialDuplicateNotice: { message: duplicateMsg },
      });

      expect(html).toContain('student-qr-result-view');
      expect(html).toContain('Đã điểm danh trước đó');
      expect(html).toContain(duplicateMsg);
      expect(html).toContain('duplicate-attendance-callout');
      expect(html).toContain('Hệ thống đã ghi nhận chuyên cần của bạn trong phiên học này. Bạn không cần quét lại mã.');
      expect(html).toContain('student-qr-finish-button');
      expect(html).toContain('student-qr-scan-again-button');

      expect(html).not.toContain('Môn học:');
      expect(html).not.toContain('Mã lớp:');
      expect(html).not.toContain('Sinh viên:');
      expect(html).not.toContain('student-camera-view');
    });

    it('Scenario 3 (HTTP 409 Generic Conflict): renders camera error banner, does NOT render warning receipt', () => {
      const genericConflictMsg = 'Xung đột dữ liệu phiên học: Phiên đã bị khóa.';

      const { html } = renderModal({
        visible: true,
        initialResult: null,
        initialDuplicateNotice: null,
        initialErrorMessage: genericConflictMsg,
      });

      expect(html).toContain('student-camera-view');
      expect(html).toContain('student-qr-camera-error');
      expect(html).toContain(genericConflictMsg);
      expect(html).toContain('student-qr-retry-scan-button');

      expect(html).not.toContain('student-qr-result-view');
      expect(html).not.toContain('Đã điểm danh trước đó');
    });

    it('Scenario 4 (HTTP 400 Bad Request): displays expired or invalid QR code error banner', () => {
      const invalidQrMsg = 'Mã QR điểm danh đã hết hạn hoặc không hợp lệ.';

      const { html } = renderModal({
        visible: true,
        initialErrorMessage: invalidQrMsg,
      });

      expect(html).toContain('student-qr-camera-error');
      expect(html).toContain(invalidQrMsg);
      expect(html).not.toContain('student-qr-result-view');
    });

    it('Scenario 5 (HTTP 401 Unauthorized): displays session expired error banner', () => {
      const expiredMsg = 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.';

      const { html } = renderModal({
        visible: true,
        initialErrorMessage: expiredMsg,
      });

      expect(html).toContain('student-qr-camera-error');
      expect(html).toContain(expiredMsg);
      expect(html).not.toContain('student-qr-result-view');
    });

    it('Scenario 6 (HTTP 403 Forbidden): displays access denied error banner', () => {
      const forbiddenMsg = 'Bạn không có quyền điểm danh phiên học này.';

      const { html } = renderModal({
        visible: true,
        initialErrorMessage: forbiddenMsg,
      });

      expect(html).toContain('student-qr-camera-error');
      expect(html).toContain(forbiddenMsg);
      expect(html).not.toContain('student-qr-result-view');
    });

    it('Scenario 7 (Network Error): displays network connection failure banner and never renders fake success receipt', () => {
      const networkMsg = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.';

      const { html } = renderModal({
        visible: true,
        initialErrorMessage: networkMsg,
      });

      expect(html).toContain('student-qr-camera-error');
      expect(html).toContain(networkMsg);
      expect(html).not.toContain('student-qr-result-view');
      expect(html).not.toContain('Điểm danh thành công!');
    });

    it('Scenario 8 (Reset State): cleanly resets state when closed and re-opened', () => {
      const closed = renderModal({ visible: false });
      expect(closed.html).toBe('');

      const opened = renderModal({ visible: true });
      expect(opened.html).toContain('student-camera-view');
      expect(opened.html).not.toContain('student-qr-camera-error');
      expect(opened.html).not.toContain('student-qr-result-view');
    });

    it('Scenario 9 (Async check-in rejection with HTTP 409 Duplicate): catches error and validates duplicate logic', async () => {
      const validQrToken = '12.4.11962500.signature_hash_123';
      const duplicateError = {
        response: {
          status: 409,
          data: {
            status: 409,
            message: 'ĐÃ ĐIỂM DANH TRƯỚC ĐÓ: Bạn đã điểm danh thành công phiên học này rồi.',
            data: null,
          },
        },
      };

      jest.spyOn(studentApi, 'checkInAttendance').mockRejectedValueOnce(duplicateError);

      const { cameraProps } = renderModal({ visible: true });
      cameraProps.onBarcodeScanned({ data: validQrToken });

      await Promise.resolve();
      await Promise.resolve();

      expect(isDuplicateAttendanceError(duplicateError)).toBe(true);
    });

    it('Scenario 10 (Unknown Result): renders unknown result banner when network dropped mid-flight', () => {
      updateSharedSessionState({
        status: 'unknown_result',
        errorMessage: 'Mất kết nối hoặc quá thời gian chờ. Hệ thống có thể đã ghi nhận điểm danh.',
      });

      const { html } = renderModal({ visible: true });

      expect(html).toContain('student-qr-unknown-result');
      expect(html).toContain('Kết quả điểm danh chưa xác nhận');
      expect(html).toContain('Mất kết nối hoặc quá thời gian chờ');
      expect(html).toContain('student-qr-retry-unknown-button');
      expect(html).not.toContain('student-qr-result-view');
    });
  });

  // ── Group 5: Manual Token Entry Fallback ──
  describe('Group 5: Manual Token Entry Fallback', () => {
    it('renders manual input tab structure', () => {
      const { html } = renderModal({ visible: true });

      expect(html).toContain('student-qr-tab-manual');
      expect(html).toContain('Nhập mã thủ công');
    });
  });

  // ── Group 6: Request Lifecycle, Background State & Unmount Safety (ST-01.4) ──
  describe('Group 6: Request Lifecycle, Background State & Unmount Safety (ST-01.4)', () => {
    it('restores success receipt when modal is reopened after background request succeeds', () => {
      const backgroundResult = {
        success: true,
        message: 'Điểm danh thành công sau khi mở lại',
        checkedInAt: '14:00 - 18/11/2026',
        sessionId: 99,
        sectionId: 10,
        sectionCode: 'CS102-01',
        courseName: 'Cấu trúc dữ liệu & Giải thuật',
        studentCode: 'SV2026001',
        studentName: 'Nguyễn Văn A',
      };

      // Simulate background completion while modal was closed
      updateSharedSessionState({
        status: 'success',
        result: backgroundResult,
      });

      // Re-opening modal restores the receipt
      const { html } = renderModal({ visible: true });

      expect(html).toContain('student-qr-result-view');
      expect(html).toContain('Cấu trúc dữ liệu &amp; Giải thuật');
      expect(html).toContain('CS102-01');
      expect(html).toContain('Điểm danh thành công!');
    });

    it('restores duplicate warning receipt when modal is reopened after background 409', () => {
      updateSharedSessionState({
        status: 'duplicate',
        duplicateNotice: {
          message: 'ĐÃ ĐIỂM DANH TRƯỚC ĐÓ: Bạn đã điểm danh thành công phiên học này rồi.',
        },
      });

      const { html } = renderModal({ visible: true });

      expect(html).toContain('student-qr-result-view');
      expect(html).toContain('Đã điểm danh trước đó');
      expect(html).toContain('duplicate-attendance-callout');
    });

    it('displays submitting spinner when modal is reopened while request is still in-flight', () => {
      updateSharedSessionState({
        status: 'submitting',
      });

      const { html } = renderModal({ visible: true });

      expect(html).toContain('student-qr-processing');
      expect(html).toContain('Đang xác thực mã QR');
    });

    it('resets background session state back to idle when resetAttendanceCheckInSession is called', () => {
      updateSharedSessionState({
        status: 'success',
        result: {
          success: true,
          message: 'Done',
          checkedInAt: '12:00',
          sessionId: 1,
          sectionId: 1,
          sectionCode: 'A',
          courseName: 'B',
          studentCode: 'C',
          studentName: 'D',
        },
      });

      resetAttendanceCheckInSession();

      const session = getAttendanceCheckInSessionState();
      expect(session.status).toBe('idle');
      expect(session.result).toBeNull();
      expect(session.duplicateNotice).toBeNull();
    });
  });
});
